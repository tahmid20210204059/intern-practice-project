import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession } from 'mongoose';
import { Model, Types } from 'mongoose';
import { Post } from './schemas/post.schema.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { QueryPostsDto } from './dto/query-posts.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const RETENTION_DAYS = 5;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const AUTHOR_POPULATE_FIELDS = 'name avatarUrl';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<Post>,
    private notificationsService: NotificationsService,
  ) {}

  private assertValidId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }
  }

  private assertOwnerOrAdmin(post: Post, userId: string, role: string) {
    const isOwner = post.authorId.toString() === userId;
    if (!isOwner && role !== 'admin') {
      throw new ForbiddenException('You do not have permission to perform this action on this post');
    }
  }

  private buildPaginationMeta(page: number, limit: number, totalItems: number): PaginationMeta {
    const totalPages = Math.ceil(totalItems / limit) || 0;
    return {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async create(authorId: string, dto: CreatePostDto) {
    const post = await this.postModel.create({
      authorId: new Types.ObjectId(authorId),
      title: dto.title.trim(),
      body: dto.body.trim(),
      imageUrl: dto.imageUrl?.trim() || '',
    });
    await post.populate('authorId', AUTHOR_POPULATE_FIELDS);
    return post;
  }

  async findAll(query: QueryPostsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: Record<string, unknown> = { deletedAt: null };

    if (query.authorId) {
      filter.authorId = new Types.ObjectId(query.authorId);
    }

    const [items, totalItems] = await Promise.all([
      this.postModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', AUTHOR_POPULATE_FIELDS),
      this.postModel.countDocuments(filter),
    ]);

    return { items, pagination: this.buildPaginationMeta(page, limit, totalItems) };
  }

  async findOne(id: string) {
    this.assertValidId(id);
    const post = await this.postModel
      .findOne({ _id: id, deletedAt: null })
      .populate('authorId', AUTHOR_POPULATE_FIELDS);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  private async findActiveRaw(id: string) {
    this.assertValidId(id);
    const post = await this.postModel.findOne({ _id: id, deletedAt: null });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async update(id: string, userId: string, role: string, dto: UpdatePostDto) {
    const post = await this.findActiveRaw(id);
    this.assertOwnerOrAdmin(post, userId, role);

    if (dto.title !== undefined) post.title = dto.title.trim();
    if (dto.body !== undefined) post.body = dto.body.trim();
    if (dto.imageUrl !== undefined) post.imageUrl = dto.imageUrl.trim();

    await post.save();
    await post.populate('authorId', AUTHOR_POPULATE_FIELDS);
    return post;
  }

  async remove(id: string, userId: string, role: string) {
    const post = await this.findActiveRaw(id);
    this.assertOwnerOrAdmin(post, userId, role);

    post.deletedAt = new Date();
    await post.save();

    const isOwnerDeleting = post.authorId.toString() === userId;
    if (!isOwnerDeleting && role === 'admin') {
      await this.notificationsService.create(
        post.authorId.toString(),
        `Your post "${post.title}" was removed by an admin.`,
      );
    }

    return { message: 'Post deleted successfully' };
  }

  async restore(id: string, userId: string, role: string) {
    this.assertValidId(id);
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    this.assertOwnerOrAdmin(post, userId, role);

    if (!post.deletedAt) {
      throw new BadRequestException('This post is not deleted');
    }

    const retentionExpiresAt = post.deletedAt.getTime() + RETENTION_MS;
    if (Date.now() > retentionExpiresAt) {
      throw new BadRequestException('The 5-day retention period has expired; this post can no longer be restored');
    }

    post.deletedAt = null;
    await post.save();
    await post.populate('authorId', AUTHOR_POPULATE_FIELDS);
    return post;
  }

  async findDeletedForAdmin(query: QueryPostsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = { deletedAt: { $ne: null } };

    const [items, totalItems] = await Promise.all([
      this.postModel
        .find(filter)
        .sort({ deletedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', AUTHOR_POPULATE_FIELDS),
      this.postModel.countDocuments(filter),
    ]);

    return { items, pagination: this.buildPaginationMeta(page, limit, totalItems) };
  }

  async permanentlyDelete(id: string) {
    this.assertValidId(id);
    const post = await this.postModel.findById(id);
    if (!post || !post.deletedAt) throw new NotFoundException('Deleted post not found');

    await this.postModel.deleteOne({ _id: id });
    return { message: 'Post permanently deleted' };
  }

  async hardDeleteExpired() {
    const threshold = new Date(Date.now() - RETENTION_MS);
    return this.postModel.deleteMany({ deletedAt: { $ne: null, $lte: threshold } });
  }

  async ensurePostExists(id: string): Promise<void> {
    this.assertValidId(id);
    const exists = await this.postModel.exists({ _id: id, deletedAt: null });
    if (!exists) {
      throw new NotFoundException('Post not found');
    }
  }

  incrementCommentCount(id: string, delta: number) {
    return this.postModel.updateOne({ _id: id }, { $inc: { commentCount: delta } }, { timestamps: false }).exec();
  }

  incrementReactionCount(id: string, delta: number, session?: ClientSession) {
    return this.postModel
      .updateOne({ _id: id }, { $inc: { likeCount: delta } }, { timestamps: false, session })
      .exec();
  }

  async getAuthorId(id: string): Promise<string | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const post = await this.postModel.findById(id).select('authorId').lean();
    return post ? post.authorId.toString() : null;
  }
}