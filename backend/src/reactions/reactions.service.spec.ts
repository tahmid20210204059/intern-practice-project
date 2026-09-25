import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ReactionsService } from './reactions.service.js';
import { ReactionTargetType, ReactionType } from './schemas/reaction.schema.js';

describe('ReactionsService', () => {
  const userId = new Types.ObjectId().toString();
  const postId = new Types.ObjectId().toString();
  const postAuthorId = new Types.ObjectId().toString();

  let reactionModel: any;
  let connection: any;
  let session: any;
  let postsService: any;
  let commentsService: any;
  let notificationsService: any;
  let usersService: any;
  let service: ReactionsService;

  const resolvedMock = <T>(value: T) => jest.fn<() => Promise<T>>().mockResolvedValue(value);
  const queryMock = <T>(value: T) => ({ session: resolvedMock(value) });

  beforeEach(() => {
    session = {
      withTransaction: jest.fn(async (fn: () => Promise<void>) => {
        await fn();
      }),
      endSession: resolvedMock(undefined),
    };

    connection = {
      startSession: resolvedMock(session),
    };

    reactionModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
    };

    postsService = {
      ensurePostExists: resolvedMock(undefined),
      incrementReactionCount: resolvedMock(undefined),
      getAuthorId: resolvedMock(postAuthorId),
    };

    commentsService = {
      ensureCommentExists: resolvedMock(undefined),
      incrementReactionCount: resolvedMock(undefined),
      getOwnerAndPostId: resolvedMock({ authorId: postAuthorId, postId }),
    };

    notificationsService = {
      create: resolvedMock(undefined),
    };

    usersService = {
      findById: resolvedMock({ name: 'Reactor' }),
    };

    service = new ReactionsService(
      reactionModel,
      connection,
      postsService,
      commentsService,
      notificationsService,
      usersService,
    );
  });

  it('creates a new reaction and increments the post count when none exists yet', async () => {
    reactionModel.findOne.mockReturnValue(queryMock(null));
    reactionModel.create.mockResolvedValue([{}]);

    const result = await service.react(userId, {
      targetType: ReactionTargetType.POST,
      targetId: postId,
      type: ReactionType.LIKE,
    });

    expect(postsService.ensurePostExists).toHaveBeenCalledWith(postId);
    expect(reactionModel.create).toHaveBeenCalled();
    expect(postsService.incrementReactionCount).toHaveBeenCalledWith(postId, 1, session);
    expect(result).toEqual({ action: 'added', type: ReactionType.LIKE });
    expect(notificationsService.create).toHaveBeenCalledWith(
      postAuthorId,
      'Reactor reacted with Like to your post.',
      postId,
      userId,
    );
  });

  it('removes the reaction and decrements the count when the same reaction is sent again', async () => {
    const existing = { type: ReactionType.LIKE, _id: new Types.ObjectId(), save: jest.fn() };
    reactionModel.findOne.mockReturnValue(queryMock(existing));
    reactionModel.deleteOne.mockReturnValue(queryMock(undefined));

    const result = await service.react(userId, {
      targetType: ReactionTargetType.POST,
      targetId: postId,
      type: ReactionType.LIKE,
    });

    expect(reactionModel.deleteOne).toHaveBeenCalledWith({ _id: existing._id });
    expect(postsService.incrementReactionCount).toHaveBeenCalledWith(postId, -1, session);
    expect(result).toEqual({ action: 'removed', type: null });
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('switches the reaction type without changing the count when a different type is sent', async () => {
    const existing = { type: ReactionType.LIKE, _id: new Types.ObjectId(), save: resolvedMock(undefined) };
    reactionModel.findOne.mockReturnValue(queryMock(existing));

    const result = await service.react(userId, {
      targetType: ReactionTargetType.POST,
      targetId: postId,
      type: ReactionType.LOVE,
    });

    expect(existing.type).toBe(ReactionType.LOVE);
    expect(existing.save).toHaveBeenCalledWith({ session });
    expect(postsService.incrementReactionCount).not.toHaveBeenCalled();
    expect(reactionModel.deleteOne).not.toHaveBeenCalled();
    expect(result).toEqual({ action: 'switched', type: ReactionType.LOVE });
    expect(notificationsService.create).toHaveBeenCalledWith(
      postAuthorId,
      'Reactor reacted with Love to your post.',
      postId,
      userId,
    );
  });

  it('supports comment targets using CommentsService instead of PostsService', async () => {
    const commentId = new Types.ObjectId().toString();
    reactionModel.findOne.mockReturnValue(queryMock(null));
    reactionModel.create.mockResolvedValue([{}]);

    await service.react(userId, {
      targetType: ReactionTargetType.COMMENT,
      targetId: commentId,
      type: ReactionType.LIKE,
    });

    expect(commentsService.ensureCommentExists).toHaveBeenCalledWith(commentId);
    expect(commentsService.incrementReactionCount).toHaveBeenCalledWith(commentId, 1, session);
    expect(postsService.incrementReactionCount).not.toHaveBeenCalled();
    expect(notificationsService.create).toHaveBeenCalledWith(
      postAuthorId,
      'Reactor reacted with Like to your comment.',
      postId,
      userId,
    );
  });

  it('does not notify when the reactor is the owner of the target', async () => {
    reactionModel.findOne.mockReturnValue(queryMock(null));
    reactionModel.create.mockResolvedValue([{}]);
    postsService.getAuthorId.mockResolvedValue(userId);

    await service.react(userId, {
      targetType: ReactionTargetType.POST,
      targetId: postId,
      type: ReactionType.LIKE,
    });

    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('rejects a reaction on a missing or deleted post', async () => {
    postsService.ensurePostExists.mockRejectedValue(new NotFoundException('Post not found'));

    await expect(
      service.react(userId, { targetType: ReactionTargetType.POST, targetId: postId, type: ReactionType.LIKE }),
    ).rejects.toThrow(NotFoundException);

    expect(reactionModel.findOne).not.toHaveBeenCalled();
  });

  it('retries after a duplicate-key conflict from a concurrent identical request', async () => {
    let attempt = 0;
    session.withTransaction.mockImplementation(async (fn: () => Promise<void>) => {
      attempt += 1;
      if (attempt === 1) {
        const err: any = new Error('duplicate key');
        err.code = 11000;
        throw err;
      }
      await fn();
    });

    const existing = { type: ReactionType.LIKE, _id: new Types.ObjectId(), save: jest.fn() };
    reactionModel.findOne.mockReturnValue(queryMock(existing));
    reactionModel.deleteOne.mockReturnValue(queryMock(undefined));

    const result = await service.react(userId, {
      targetType: ReactionTargetType.POST,
      targetId: postId,
      type: ReactionType.LIKE,
    });

    expect(session.withTransaction).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ action: 'removed', type: null });
  });

  it('gives up after exhausting retries on repeated duplicate-key conflicts', async () => {
    session.withTransaction.mockImplementation(async () => {
      const err: any = new Error('duplicate key');
      err.code = 11000;
      throw err;
    });

    await expect(
      service.react(userId, { targetType: ReactionTargetType.POST, targetId: postId, type: ReactionType.LIKE }),
    ).rejects.toThrow();
  });
});