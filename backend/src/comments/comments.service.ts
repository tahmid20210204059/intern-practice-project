import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from './schemas/comment.schema.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { PostsService } from '../posts/posts.service.js';

export const MAX_COMMENT_DEPTH = 3;

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    private postsService: PostsService,
  ) {}

  private assertValidId(id: string, label = 'ID') {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  async create(authorId: string, dto: CreateCommentDto) {
    await this.postsService.ensurePostExists(dto.postId);

    let depth = 0;

    if (dto.parentCommentId) {
      const parentComment = await this.commentModel.findById(dto.parentCommentId);
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      if (parentComment.postId.toString() !== dto.postId) {
        throw new BadRequestException('Parent comment does not belong to the specified post');
      }
      depth = parentComment.depth + 1;
      if (depth > MAX_COMMENT_DEPTH) {
        throw new BadRequestException(`Maximum reply depth of ${MAX_COMMENT_DEPTH} exceeded`);
      }
    }

    const comment = await this.commentModel.create({
      postId: new Types.ObjectId(dto.postId),
      authorId: new Types.ObjectId(authorId),
      parentCommentId: dto.parentCommentId ? new Types.ObjectId(dto.parentCommentId) : null,
      body: dto.body.trim(),
      depth,
    });

    await this.postsService.incrementCommentCount(dto.postId, 1);
    await comment.populate('authorId', 'name avatarUrl');
    return comment;
  }

  async findByPost(postId: string) {
    this.assertValidId(postId, 'post ID');
    await this.postsService.ensurePostExists(postId);

    const comments = await this.commentModel
      .find({ postId: new Types.ObjectId(postId) })
      .sort({ createdAt: 1 })
      .populate('authorId', 'name avatarUrl')
      .lean();

    return this.buildTree(comments);
  }

  private buildTree(comments: any[]) {
    const byId = new Map<string, any>();
    const roots: any[] = [];

    for (const comment of comments) {
      byId.set(comment._id.toString(), { ...comment, replies: [] });
    }

    for (const comment of comments) {
      const node = byId.get(comment._id.toString());
      const parentId = comment.parentCommentId ? comment.parentCommentId.toString() : null;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId).replies.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async update(id: string, userId: string, dto: UpdateCommentDto) {
    this.assertValidId(id, 'comment ID');
    const comment = await this.commentModel.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.authorId.toString() !== userId) {
      throw new ForbiddenException('Only the comment author can edit this comment');
    }

    comment.body = dto.body.trim();
    await comment.save();
    await comment.populate('authorId', 'name avatarUrl');
    return comment;
  }

  async remove(id: string, userId: string, role: string) {
    this.assertValidId(id, 'comment ID');
    const comment = await this.commentModel.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');

    const isOwner = comment.authorId.toString() === userId;
    if (!isOwner && role !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    const descendantIds = await this.collectDescendantIds(comment._id as Types.ObjectId);
    const idsToDelete = [...descendantIds, comment._id as Types.ObjectId];

    await this.commentModel.deleteMany({ _id: { $in: idsToDelete } });
    await this.postsService.incrementCommentCount(comment.postId.toString(), -idsToDelete.length);

    return { message: 'Comment deleted successfully', deletedCount: idsToDelete.length };
  }

  private async collectDescendantIds(parentId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const descendants: Types.ObjectId[] = [];
    let currentLevelParentIds = [parentId];

    while (currentLevelParentIds.length > 0) {
      const children = await this.commentModel
        .find({ parentCommentId: { $in: currentLevelParentIds } })
        .select('_id')
        .lean();

      if (children.length === 0) break;

      const childIds = children.map((c) => c._id as Types.ObjectId);
      descendants.push(...childIds);
      currentLevelParentIds = childIds;
    }

    return descendants;
  }
}