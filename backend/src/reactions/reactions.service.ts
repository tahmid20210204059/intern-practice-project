import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Connection } from 'mongoose';
import { Model, Types } from 'mongoose';
import { Reaction, ReactionTargetType, ReactionType } from './schemas/reaction.schema.js';
import { CreateReactionDto } from './dto/create-reaction.dto.js';
import { PostsService } from '../posts/posts.service.js';
import { CommentsService } from '../comments/comments.service.js';

export type ReactionAction = 'added' | 'removed' | 'switched';

export interface ReactionResult {
  action: ReactionAction;
  type: ReactionType | null;
}

const MAX_ATTEMPTS = 3;

@Injectable()
export class ReactionsService {
  constructor(
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>,
    @InjectConnection() private connection: Connection,
    private postsService: PostsService,
    private commentsService: CommentsService,
  ) {}

  private async ensureTargetExists(targetType: ReactionTargetType, targetId: string): Promise<void> {
    if (targetType === ReactionTargetType.POST) {
      await this.postsService.ensurePostExists(targetId);
    } else {
      await this.commentsService.ensureCommentExists(targetId);
    }
  }

  private adjustTargetCount(
    targetType: ReactionTargetType,
    targetId: string,
    delta: number,
    session: ClientSession,
  ) {
    if (targetType === ReactionTargetType.POST) {
      return this.postsService.incrementReactionCount(targetId, delta, session);
    }
    return this.commentsService.incrementReactionCount(targetId, delta, session);
  }

  async react(userId: string, dto: CreateReactionDto): Promise<ReactionResult> {
    await this.ensureTargetExists(dto.targetType, dto.targetId);

    const userObjectId = new Types.ObjectId(userId);
    const targetObjectId = new Types.ObjectId(dto.targetId);

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const session = await this.connection.startSession();
      try {
        let result!: ReactionResult;

        await session.withTransaction(async () => {
          const existing = await this.reactionModel
            .findOne({ userId: userObjectId, targetType: dto.targetType, targetId: targetObjectId })
            .session(session);

          if (!existing) {
            await this.reactionModel.create(
              [{ userId: userObjectId, targetType: dto.targetType, targetId: targetObjectId, type: dto.type }],
              { session },
            );
            await this.adjustTargetCount(dto.targetType, dto.targetId, 1, session);
            result = { action: 'added', type: dto.type };
          } else if (existing.type === dto.type) {
            await this.reactionModel.deleteOne({ _id: existing._id }).session(session);
            await this.adjustTargetCount(dto.targetType, dto.targetId, -1, session);
            result = { action: 'removed', type: null };
          } else {
            existing.type = dto.type;
            await existing.save({ session });
            result = { action: 'switched', type: dto.type };
          }
        });

        return result;
      } catch (err: any) {
        const isDuplicateKey = err?.code === 11000;
        if (isDuplicateKey && attempt < MAX_ATTEMPTS - 1) {
          continue;
        }
        throw err;
      } finally {
        await session.endSession();
      }
    }

    throw new BadRequestException('Failed to process reaction, please try again');
  }

  async getMyReaction(
    userId: string,
    targetType: ReactionTargetType,
    targetId: string,
  ): Promise<ReactionType | null> {
    if (!Types.ObjectId.isValid(targetId)) {
      throw new BadRequestException('Invalid target ID');
    }
    const reaction = await this.reactionModel
      .findOne({ userId: new Types.ObjectId(userId), targetType, targetId: new Types.ObjectId(targetId) })
      .lean();
    return reaction ? (reaction.type as ReactionType) : null;
  }
}