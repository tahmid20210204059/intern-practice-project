import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PostsService } from './posts.service.js';
import { PostSortOption } from './dto/query-posts.dto.js';
import type { SearchPostsDto } from './dto/search-posts.dto.js';

const mk = () => jest.fn<(...args: any[]) => any>();
const DAY = 24 * 60 * 60 * 1000;

function build() {
  const postModel: any = {
    findOne: mk(), findById: mk(), find: mk(), countDocuments: mk(), aggregate: mk(), deleteOne: mk(), deleteMany: mk(),
  };
  const notifications = { create: mk().mockResolvedValue(undefined) };
  const service = new PostsService(postModel, notifications as any, { summarize: mk() } as any);
  return { service, postModel, notifications };
}

function makePost(authorId = new Types.ObjectId(), extra: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    authorId,
    title: 'Hello',
    body: 'World',
    imageUrl: '',
    deletedAt: null as Date | null,
    save: mk().mockResolvedValue(undefined),
    populate: mk().mockResolvedValue(undefined),
    ...extra,
  };
}

function listQuery(items: unknown[]) {
  const q: any = {};
  q.sort = mk().mockReturnValue(q);
  q.skip = mk().mockReturnValue(q);
  q.limit = mk().mockReturnValue(q);
  q.maxTimeMS = mk().mockReturnValue(q);
  q.populate = mk().mockResolvedValue(items);
  return q;
}

describe('PostsService authorization', () => {
  const owner = new Types.ObjectId();
  const ownerId = owner.toString();
  const strangerId = new Types.ObjectId().toString();

  it('rejects an invalid post id before touching the database', async () => {
    const { service, postModel } = build();
    await expect(service.update('bad-id', ownerId, 'user', { title: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    expect(postModel.findOne).not.toHaveBeenCalled();
  });

  it('returns not found for a missing or soft-deleted post', async () => {
    const { service, postModel } = build();
    postModel.findOne.mockResolvedValue(null);
    await expect(service.update(new Types.ObjectId().toString(), ownerId, 'user', { title: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks a non-owner from editing and does not save', async () => {
    const { service, postModel } = build();
    const post = makePost(owner);
    postModel.findOne.mockResolvedValue(post);

    await expect(service.update(String(post._id), strangerId, 'user', { title: 'Hacked' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(post.save).not.toHaveBeenCalled();
    expect(post.title).toBe('Hello');
  });

  it('lets the owner edit and trims the fields', async () => {
    const { service, postModel } = build();
    const post = makePost(owner);
    postModel.findOne.mockResolvedValue(post);

    const updated: any = await service.update(String(post._id), ownerId, 'user', { title: '  New  ', body: ' Body ', imageUrl: ' https://x.io/a.png ' });

    expect(updated.title).toBe('New');
    expect(updated.body).toBe('Body');
    expect(updated.imageUrl).toBe('https://x.io/a.png');
    expect(post.save).toHaveBeenCalledTimes(1);
  });

  it('lets an admin edit another user post', async () => {
    const { service, postModel } = build();
    const post = makePost(owner);
    postModel.findOne.mockResolvedValue(post);

    await service.update(String(post._id), strangerId, 'admin', { title: 'Moderated' });
    expect(post.title).toBe('Moderated');
  });

  it('blocks a non-owner from deleting', async () => {
    const { service, postModel, notifications } = build();
    const post = makePost(owner);
    postModel.findOne.mockResolvedValue(post);

    await expect(service.remove(String(post._id), strangerId, 'user')).rejects.toBeInstanceOf(ForbiddenException);
    expect(post.deletedAt).toBeNull();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('soft-deletes for the owner without notifying anyone', async () => {
    const { service, postModel, notifications } = build();
    const post = makePost(owner);
    postModel.findOne.mockResolvedValue(post);

    await service.remove(String(post._id), ownerId, 'user');
    expect(post.deletedAt).toBeInstanceOf(Date);
    expect(post.save).toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('notifies the author when an admin removes their post', async () => {
    const { service, postModel, notifications } = build();
    const post = makePost(owner);
    postModel.findOne.mockResolvedValue(post);

    await service.remove(String(post._id), strangerId, 'admin');
    expect(notifications.create).toHaveBeenCalledWith(ownerId, 'Your post "Hello" was removed by an admin.');
  });
});

describe('PostsService.restore retention', () => {
  const owner = new Types.ObjectId();
  const ownerId = owner.toString();

  it('blocks a non-owner', async () => {
    const { service, postModel } = build();
    const post = makePost(owner, { deletedAt: new Date() });
    postModel.findById.mockResolvedValue(post);
    await expect(service.restore(String(post._id), new Types.ObjectId().toString(), 'user')).rejects.toBeInstanceOf(ForbiddenException);
    expect(post.deletedAt).not.toBeNull();
  });

  it('rejects restoring a post that is not deleted', async () => {
    const { service, postModel } = build();
    postModel.findById.mockResolvedValue(makePost(owner));
    await expect(service.restore(new Types.ObjectId().toString(), ownerId, 'user')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects restoring after the 5-day retention window', async () => {
    const { service, postModel } = build();
    const post = makePost(owner, { deletedAt: new Date(Date.now() - 6 * DAY) });
    postModel.findById.mockResolvedValue(post);
    await expect(service.restore(String(post._id), ownerId, 'user')).rejects.toThrow('retention period has expired');
    expect(post.save).not.toHaveBeenCalled();
  });

  it('restores within the retention window', async () => {
    const { service, postModel } = build();
    const post = makePost(owner, { deletedAt: new Date(Date.now() - 4 * DAY) });
    postModel.findById.mockResolvedValue(post);
    await service.restore(String(post._id), ownerId, 'user');
    expect(post.deletedAt).toBeNull();
    expect(post.save).toHaveBeenCalled();
  });

  it('hard-deletes only posts deleted more than 5 days ago', async () => {
    const { service, postModel } = build();
    postModel.deleteMany.mockResolvedValue({ deletedCount: 2 });
    const before = Date.now();
    await service.hardDeleteExpired();
    const filter = postModel.deleteMany.mock.calls[0][0];
    expect(filter.deletedAt.$ne).toBeNull();
    expect(filter.deletedAt.$lte.getTime()).toBeGreaterThanOrEqual(before - 5 * DAY);
    expect(filter.deletedAt.$lte.getTime()).toBeLessThanOrEqual(Date.now() - 5 * DAY);
  });

  it('only permanently deletes posts that are already soft-deleted', async () => {
    const { service, postModel } = build();
    postModel.findById.mockResolvedValue(makePost(owner));
    await expect(service.permanentlyDelete(new Types.ObjectId().toString())).rejects.toBeInstanceOf(NotFoundException);
    expect(postModel.deleteOne).not.toHaveBeenCalled();
  });
});

describe('PostsService.findAll sorting and pagination', () => {
  it('sorts latest by createdAt then _id and excludes soft-deleted posts', async () => {
    const { service, postModel } = build();
    const q = listQuery([{ _id: 1 }]);
    postModel.find.mockReturnValue(q);
    postModel.countDocuments.mockResolvedValue(45);

    const result = await service.findAll({ page: 2, limit: 20, sort: PostSortOption.LATEST });

    expect(postModel.find).toHaveBeenCalledWith({ deletedAt: null });
    expect(q.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(q.skip).toHaveBeenCalledWith(20);
    expect(q.limit).toHaveBeenCalledWith(20);
    expect(result.pagination).toEqual({ page: 2, limit: 20, totalItems: 45, totalPages: 3, hasNextPage: true, hasPrevPage: true });
  });

  it('sorts discussed by commentCount with stable tie-breakers', async () => {
    const { service, postModel } = build();
    const q = listQuery([]);
    postModel.find.mockReturnValue(q);
    postModel.countDocuments.mockResolvedValue(0);

    const result = await service.findAll({ sort: PostSortOption.DISCUSSED });

    expect(q.sort).toHaveBeenCalledWith({ commentCount: -1, createdAt: -1, _id: -1 });
    expect(result.pagination).toMatchObject({ totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false });
  });

  it('converts the authorId filter to an ObjectId', async () => {
    const { service, postModel } = build();
    postModel.find.mockReturnValue(listQuery([]));
    postModel.countDocuments.mockResolvedValue(0);
    const authorId = new Types.ObjectId().toString();

    await service.findAll({ authorId });

    const filter = postModel.find.mock.calls[0][0];
    expect(filter.deletedAt).toBeNull();
    expect(filter.authorId).toBeInstanceOf(Types.ObjectId);
    expect(filter.authorId.toString()).toBe(authorId);
  });

  it('runs ranked sorting as an aggregation with a deterministic sort', async () => {
    const { service, postModel } = build();
    postModel.aggregate.mockReturnValue({ exec: mk().mockResolvedValue([{ metadata: [{ total: 3 }], data: [{ _id: 'a' }] }]) });

    const result: any = await service.findAll({ page: 1, limit: 2, sort: PostSortOption.RANKED });

    const pipeline = postModel.aggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({ $match: { deletedAt: null } });
    expect(pipeline[1].$addFields.rankScore).toBeDefined();
    expect(pipeline[2]).toEqual({ $sort: { rankScore: -1, createdAt: -1, _id: -1 } });
    expect(postModel.find).not.toHaveBeenCalled();
    expect(result.items).toEqual([{ _id: 'a' }]);
    expect(result.pagination).toMatchObject({ totalItems: 3, totalPages: 2, hasNextPage: true });
  });

  it('handles an empty ranked result', async () => {
    const { service, postModel } = build();
    postModel.aggregate.mockReturnValue({ exec: mk().mockResolvedValue([]) });
    const result: any = await service.findAll({ sort: PostSortOption.RANKED });
    expect(result.items).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });
});

describe('PostsService.search', () => {
  it('sanitizes the term and excludes soft-deleted posts', async () => {
    const { service, postModel } = build();
    const q = listQuery([]);
    postModel.find.mockReturnValue(q);
    postModel.countDocuments.mockReturnValue({ maxTimeMS: mk().mockResolvedValue(0) });

    await service.search({ q: '"nest" -react $where' } as SearchPostsDto);

    expect(postModel.find).toHaveBeenCalledWith(
      { deletedAt: null, $text: { $search: 'nest react where' } },
      { score: { $meta: 'textScore' } },
    );
    expect(q.sort).toHaveBeenCalledWith({ score: { $meta: 'textScore' }, createdAt: -1, _id: -1 });
    expect(q.maxTimeMS).toHaveBeenCalledWith(5000);
  });

  it('returns an empty page without querying for symbol-only input', async () => {
    const { service, postModel } = build();
    const result = await service.search({ q: '!!! ---' } as SearchPostsDto);
    expect(postModel.find).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.query).toBe('!!! ---');
    expect(result.pagination.totalItems).toBe(0);
  });
});
