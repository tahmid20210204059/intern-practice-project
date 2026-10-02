import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CommentsService, MAX_COMMENT_DEPTH } from './comments.service.js';

const mk = () => jest.fn<(...args: any[]) => any>();
const id = () => new Types.ObjectId();

function build() {
  const commentModel: any = { findById: mk(), create: mk(), find: mk(), deleteMany: mk().mockResolvedValue({}) };
  const postsService = {
    ensurePostExists: mk().mockResolvedValue(undefined),
    incrementCommentCount: mk().mockResolvedValue(undefined),
    getAuthorId: mk(),
  };
  const notifications = { create: mk().mockResolvedValue(undefined) };
  const service = new CommentsService(commentModel, postsService as any, notifications as any);
  return { service, commentModel, postsService, notifications };
}

const created = () => ({ authorId: { name: 'Actor' }, populate: mk().mockResolvedValue(undefined) });

describe('CommentsService.create', () => {
  it('keeps the documented max depth of 3', () => {
    expect(MAX_COMMENT_DEPTH).toBe(3);
  });

  const postId = id().toString();
  const postAuthor = id().toString();
  const actor = id().toString();

  it('creates a top-level comment, increments the count and notifies the post author', async () => {
    const { service, commentModel, postsService, notifications } = build();
    commentModel.create.mockResolvedValue(created());
    postsService.getAuthorId.mockResolvedValue(postAuthor);

    await service.create(actor, { postId, body: '  Nice  ' });

    expect(commentModel.create.mock.calls[0][0]).toMatchObject({ body: 'Nice', depth: 0, parentCommentId: null });
    expect(postsService.incrementCommentCount).toHaveBeenCalledWith(postId, 1);
    expect(notifications.create).toHaveBeenCalledWith(postAuthor, 'Actor commented on your post.', postId, actor);
  });

  it('does not notify when commenting on your own post', async () => {
    const { service, commentModel, postsService, notifications } = build();
    commentModel.create.mockResolvedValue(created());
    postsService.getAuthorId.mockResolvedValue(actor);

    await service.create(actor, { postId, body: 'Mine' });
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('notifies the parent author and the post author separately for a reply', async () => {
    const { service, commentModel, postsService, notifications } = build();
    const parentAuthor = id();
    commentModel.findById.mockResolvedValue({ postId: new Types.ObjectId(postId), authorId: parentAuthor, depth: 0 });
    commentModel.create.mockResolvedValue(created());
    postsService.getAuthorId.mockResolvedValue(postAuthor);

    await service.create(actor, { postId, parentCommentId: id().toString(), body: 'Reply' });

    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledWith(parentAuthor.toString(), 'Actor replied to your comment.', postId, actor);
    expect(notifications.create).toHaveBeenCalledWith(postAuthor, 'Actor commented on your post.', postId, actor);
  });

  it('sends one notification when the parent author is also the post author', async () => {
    const { service, commentModel, postsService, notifications } = build();
    commentModel.findById.mockResolvedValue({ postId: new Types.ObjectId(postId), authorId: new Types.ObjectId(postAuthor), depth: 1 });
    commentModel.create.mockResolvedValue(created());
    postsService.getAuthorId.mockResolvedValue(postAuthor);

    await service.create(actor, { postId, parentCommentId: id().toString(), body: 'Reply' });

    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith(postAuthor, 'Actor replied to your comment.', postId, actor);
  });

  it('rejects replies deeper than the maximum depth', async () => {
    const { service, commentModel } = build();
    commentModel.findById.mockResolvedValue({ postId: new Types.ObjectId(postId), authorId: id(), depth: 3 });

    await expect(service.create(actor, { postId, parentCommentId: id().toString(), body: 'Too deep' })).rejects.toBeInstanceOf(BadRequestException);
    expect(commentModel.create).not.toHaveBeenCalled();
  });

  it('allows a reply exactly at the maximum depth', async () => {
    const { service, commentModel, postsService } = build();
    commentModel.findById.mockResolvedValue({ postId: new Types.ObjectId(postId), authorId: id(), depth: 2 });
    commentModel.create.mockResolvedValue(created());
    postsService.getAuthorId.mockResolvedValue(null);

    await service.create(actor, { postId, parentCommentId: id().toString(), body: 'Ok' });
    expect(commentModel.create.mock.calls[0][0].depth).toBe(3);
  });

  it('rejects a parent from another post and a missing parent', async () => {
    const { service, commentModel } = build();
    commentModel.findById.mockResolvedValueOnce({ postId: id(), authorId: id(), depth: 0 });
    await expect(service.create(actor, { postId, parentCommentId: id().toString(), body: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    commentModel.findById.mockResolvedValueOnce(null);
    await expect(service.create(actor, { postId, parentCommentId: id().toString(), body: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    expect(commentModel.create).not.toHaveBeenCalled();
  });
});

describe('CommentsService.update', () => {
  const author = id();

  it.each([
    ['a stranger', id().toString(), 'user'],
    ['an admin', id().toString(), 'admin'],
  ])('only lets the author edit (%s is rejected)', async (_label, userId) => {
    const { service, commentModel } = build();
    const comment = { authorId: author, body: 'old', save: mk(), populate: mk() };
    commentModel.findById.mockResolvedValue(comment);

    await expect(service.update(id().toString(), userId, { body: 'new' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(comment.body).toBe('old');
    expect(comment.save).not.toHaveBeenCalled();
  });

  it('lets the author edit and trims the body', async () => {
    const { service, commentModel } = build();
    const comment = { authorId: author, body: 'old', save: mk().mockResolvedValue(undefined), populate: mk().mockResolvedValue(undefined) };
    commentModel.findById.mockResolvedValue(comment);

    await service.update(id().toString(), author.toString(), { body: '  new  ' });
    expect(comment.body).toBe('new');
    expect(comment.save).toHaveBeenCalled();
  });

  it('returns not found for a missing comment', async () => {
    const { service, commentModel } = build();
    commentModel.findById.mockResolvedValue(null);
    await expect(service.update(id().toString(), author.toString(), { body: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CommentsService.remove', () => {
  const commentAuthor = id();
  const postOwner = id();
  const postId = id();

  function setup(children: Array<Array<{ _id: Types.ObjectId }>> = [[]]) {
    const ctx = build();
    const comment = { _id: id(), postId, authorId: commentAuthor };
    ctx.commentModel.findById.mockResolvedValue(comment);
    ctx.postsService.getAuthorId.mockResolvedValue(postOwner.toString());
    const chain = (rows: unknown[]) => ({ select: () => ({ lean: async () => rows }) });
    const find = mk();
    children.forEach((rows) => find.mockReturnValueOnce(chain(rows)));
    find.mockReturnValue(chain([]));
    ctx.commentModel.find = find;
    return { ...ctx, comment };
  }

  it('rejects a stranger', async () => {
    const { service, commentModel } = setup();
    await expect(service.remove(id().toString(), id().toString(), 'user')).rejects.toBeInstanceOf(ForbiddenException);
    expect(commentModel.deleteMany).not.toHaveBeenCalled();
  });

  it.each([
    ['the comment author', commentAuthor.toString(), 'user'],
    ['the post owner', postOwner.toString(), 'user'],
    ['an admin', id().toString(), 'admin'],
  ])('allows %s to delete', async (_label, userId, role) => {
    const { service, commentModel } = setup();
    const result = await service.remove(id().toString(), userId, role);
    expect(commentModel.deleteMany).toHaveBeenCalled();
    expect(result.deletedCount).toBe(1);
  });

  it('cascades to every descendant and decrements the post count by the deleted total', async () => {
    const child1 = id();
    const child2 = id();
    const grandchild = id();
    const { service, commentModel, postsService, comment } = setup([[{ _id: child1 }, { _id: child2 }], [{ _id: grandchild }]]);

    const result = await service.remove(id().toString(), commentAuthor.toString(), 'user');

    const deletedIds = commentModel.deleteMany.mock.calls[0][0]._id.$in.map((value: Types.ObjectId) => value.toString());
    expect(deletedIds.sort()).toEqual([child1, child2, grandchild, comment._id].map((value) => value.toString()).sort());
    expect(postsService.incrementCommentCount).toHaveBeenCalledWith(postId.toString(), -4);
    expect(result).toEqual({ message: 'Comment deleted successfully', deletedCount: 4 });
  });

  it('notifies the comment author and post owner when an admin removes a comment', async () => {
    const { service, notifications } = setup();
    await service.remove(id().toString(), id().toString(), 'admin');
    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledWith(commentAuthor.toString(), 'Your comment was removed by an admin.', postId.toString());
    expect(notifications.create).toHaveBeenCalledWith(postOwner.toString(), 'Your comment was removed by an admin.', postId.toString());
  });

  it('does not notify for an owner delete', async () => {
    const { service, notifications } = setup();
    await service.remove(id().toString(), commentAuthor.toString(), 'user');
    expect(notifications.create).not.toHaveBeenCalled();
  });
});

