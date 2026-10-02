import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ReactionsService } from './reactions.service.js';
import { ReactionTargetType, ReactionType } from './schemas/reaction.schema.js';

const mk = () => jest.fn<(...args: any[]) => any>();
const userId = new Types.ObjectId().toString();
const commentId = new Types.ObjectId().toString();
const postId = new Types.ObjectId().toString();
const ownerId = new Types.ObjectId().toString();

function build() {
  const session: any = { withTransaction: mk(), endSession: mk().mockResolvedValue(undefined) };
  session.withTransaction.mockImplementation(async (fn: () => Promise<void>) => {
    await fn();
  });
  const connection = { startSession: mk().mockResolvedValue(session) };
  const reactionModel: any = { findOne: mk(), create: mk(), deleteOne: mk(), find: mk() };
  const postsService = {
    ensurePostExists: mk().mockResolvedValue(undefined),
    incrementReactionCount: mk().mockResolvedValue(undefined),
    getAuthorId: mk().mockResolvedValue(ownerId),
  };
  const commentsService = {
    ensureCommentExists: mk().mockResolvedValue(undefined),
    incrementReactionCount: mk().mockResolvedValue(undefined),
    getOwnerAndPostId: mk().mockResolvedValue({ authorId: ownerId, postId }),
  };
  const notifications = { create: mk().mockResolvedValue(undefined) };
  const usersService = { findById: mk().mockResolvedValue({ name: 'Reactor' }) };
  const service = new ReactionsService(reactionModel, connection as any, postsService as any, commentsService as any, notifications as any, usersService as any);
  return { service, session, connection, reactionModel, postsService, commentsService, notifications };
}

const found = (value: unknown) => ({ session: mk().mockResolvedValue(value) });

describe('ReactionsService toggle on comments', () => {
  it('decrements the comment count and sends no notification when the same reaction is repeated', async () => {
    const { service, session, reactionModel, commentsService, postsService, notifications } = build();
    const existing = { _id: new Types.ObjectId(), type: ReactionType.LIKE };
    reactionModel.findOne.mockReturnValue(found(existing));
    reactionModel.deleteOne.mockReturnValue(found(undefined));

    const result = await service.react(userId, { targetType: ReactionTargetType.COMMENT, targetId: commentId, type: ReactionType.LIKE });

    expect(result).toEqual({ action: 'removed', type: null });
    expect(commentsService.incrementReactionCount).toHaveBeenCalledWith(commentId, -1, session);
    expect(postsService.incrementReactionCount).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('keeps the count unchanged and notifies when switching the reaction type', async () => {
    const { service, reactionModel, commentsService, notifications } = build();
    const existing = { _id: new Types.ObjectId(), type: ReactionType.LIKE, save: mk().mockResolvedValue(undefined) };
    reactionModel.findOne.mockReturnValue(found(existing));

    const result = await service.react(userId, { targetType: ReactionTargetType.COMMENT, targetId: commentId, type: ReactionType.HAHA });

    expect(result).toEqual({ action: 'switched', type: ReactionType.HAHA });
    expect(existing.type).toBe(ReactionType.HAHA);
    expect(commentsService.incrementReactionCount).not.toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledWith(ownerId, 'Reactor reacted with Haha to your comment.', postId, userId);
  });

  it('persists a new reaction with the right identifiers', async () => {
    const { service, reactionModel, session } = build();
    reactionModel.findOne.mockReturnValue(found(null));
    reactionModel.create.mockResolvedValue([{}]);

    await service.react(userId, { targetType: ReactionTargetType.POST, targetId: postId, type: ReactionType.WOW });

    const [docs, options] = reactionModel.create.mock.calls[0];
    expect(docs[0].userId.toString()).toBe(userId);
    expect(docs[0].targetId.toString()).toBe(postId);
    expect(docs[0]).toMatchObject({ targetType: ReactionTargetType.POST, type: ReactionType.WOW });
    expect(options).toEqual({ session });
  });
});

describe('ReactionsService failure handling', () => {
  it('rethrows non-duplicate errors without retrying or notifying, and always ends the session', async () => {
    const { service, session, connection, notifications } = build();
    session.withTransaction.mockRejectedValue(new Error('boom'));

    await expect(service.react(userId, { targetType: ReactionTargetType.POST, targetId: postId, type: ReactionType.LIKE })).rejects.toThrow('boom');

    expect(connection.startSession).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('does not open a transaction when the comment does not exist', async () => {
    const { service, connection, commentsService } = build();
    commentsService.ensureCommentExists.mockRejectedValue(new NotFoundException('Comment not found'));

    await expect(service.react(userId, { targetType: ReactionTargetType.COMMENT, targetId: commentId, type: ReactionType.LIKE })).rejects.toBeInstanceOf(NotFoundException);
    expect(connection.startSession).not.toHaveBeenCalled();
  });
});

describe('ReactionsService queries', () => {
  it('rejects invalid target ids', async () => {
    const { service } = build();
    await expect(service.getMyReaction(userId, ReactionTargetType.POST, 'bad')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.listForTarget(ReactionTargetType.POST, 'bad')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the current reaction type or null', async () => {
    const { service, reactionModel } = build();
    reactionModel.findOne.mockReturnValueOnce({ lean: mk().mockResolvedValue({ type: 'love' }) });
    expect(await service.getMyReaction(userId, ReactionTargetType.POST, postId)).toBe('love');
    reactionModel.findOne.mockReturnValueOnce({ lean: mk().mockResolvedValue(null) });
    expect(await service.getMyReaction(userId, ReactionTargetType.POST, postId)).toBeNull();
  });

  it('lists reactors grouped by type order while keeping recency within a type', async () => {
    const { service, reactionModel } = build();
    const at = (n: number) => new Date(2026, 0, n);
    const rows = [
      { _id: '1', type: 'wow', createdAt: at(4), userId: { _id: 'u1', name: 'A', avatarUrl: '' } },
      { _id: '2', type: 'like', createdAt: at(3), userId: { _id: 'u2', name: 'B', avatarUrl: 'x' } },
      { _id: '3', type: 'wow', createdAt: at(2), userId: { _id: 'u3', name: 'C', avatarUrl: '' } },
      { _id: '4', type: 'love', createdAt: at(1), userId: null },
    ];
    reactionModel.find.mockReturnValue({ populate: () => ({ sort: () => ({ lean: async () => rows }) }) });

    const result = await service.listForTarget(ReactionTargetType.POST, postId);

    expect(result.map((item) => item._id)).toEqual(['2', '4', '1', '3']);
    expect(result[1].user).toBeNull();
    expect(result[0].user).toEqual({ _id: 'u2', name: 'B', avatarUrl: 'x' });
  });
});
