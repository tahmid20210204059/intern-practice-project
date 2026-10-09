import { jest } from '@jest/globals';
import { generateKeyPairSync } from 'node:crypto';
import { BadRequestException, HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ChangelogService } from './changelog.service.js';
import { GithubAppChangelogProvider } from './providers/github-app-changelog.provider.js';
import { MOCK_MERGED_AT } from './providers/mock-changelog.provider.js';

const makeModel = () => {
  const lean = jest.fn(async () => ({ _id: 'abc', owner: 'acme', repo: 'widgets', prNumber: 42, title: 'fix login cookie flags', authorLogin: 'alice', mergedAt: new Date(MOCK_MERGED_AT), htmlUrl: 'https://github.com/acme/widgets/pull/42', baseBranch: 'main', syncedAt: new Date(), source: 'mock' }));
  const findOneAndUpdate = jest.fn(() => ({ lean }));
  const find = jest.fn(() => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }));
  return { findOneAndUpdate, find };
};

const makeService = (values: Record<string, string> = {}) => {
  const model = makeModel();
  const service = new ChangelogService(model as any, { get: (key: string) => values[key] } as unknown as ConfigService);
  return { service, model };
};

describe('ChangelogService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the deterministic mock provider and upserts when GitHub App credentials are missing', async () => {
    const { service, model } = makeService();
    const result = await service.sync('Acme/Widgets');
    expect(result.provider).toBe('mock');
    expect(result.synced).toBe(true);
    const [filter, update, options] = model.findOneAndUpdate.mock.calls[0] as any[];
    expect(filter).toEqual({ source: 'mock', owner: 'acme', repo: 'widgets', prNumber: 42 });
    expect(update.$set.baseBranch).toBe('main');
    expect(update.$set.mergedAt.toISOString()).toBe(MOCK_MERGED_AT);
    expect(options.upsert).toBe(true);
  });

  it.each(['', 'nope', 'a/b/c', 'ac me/widgets', '-bad/repo', 'acme/..', 'acme/'])('rejects invalid repo %p with a 400', async (repo) => {
    const { service, model } = makeService();
    await expect(service.sync(repo)).rejects.toBeInstanceOf(BadRequestException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('fails soft: maps an upstream rate limit to a stable 429 and writes nothing', async () => {
    const { service, model } = makeService({ CHANGELOG_MOCK_FAILURE: 'rate_limit' });
    const error: any = await service.sync('acme/widgets').catch((e) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(429);
    expect(error.getResponse()).toEqual({ message: 'GitHub rate limit reached. Please try again later.', code: 'GITHUB_RATE_LIMITED' });
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    await expect(service.list()).resolves.toMatchObject({ provider: 'mock', entries: [] });
  });

  it('enforces the hard timeout when the provider hangs', async () => {
    const { service } = makeService({ CHANGELOG_TIMEOUT_MS: '2000' });
    (service as any).provider = { name: 'github', fetchLastMergedPr: () => new Promise(() => undefined) };
    const started = Date.now();
    const error: any = await service.sync('acme/widgets').catch((e) => e);
    expect(Date.now() - started).toBeLessThan(2600);
    expect(error.getStatus()).toBe(504);
    expect(error.getResponse().code).toBe('GITHUB_TIMEOUT');
  });
});

describe('GithubAppChangelogProvider', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const provider = () => new GithubAppChangelogProvider({ appId: '123', privateKey, installationId: '999' });
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('picks the most recently merged PR into main and never sends the private key', async () => {
    const calls: string[] = [];
    jest.spyOn(globalThis, 'fetch').mockImplementation((async (url: any, init: any) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      expect(JSON.stringify(init)).not.toContain('PRIVATE KEY');
      if (String(url).includes('/access_tokens')) return json(201, { token: 'ghs_x', expires_at: new Date(Date.now() + 3600_000).toISOString() });
      return json(200, [
        { number: 1, title: 'old', merged_at: '2026-01-01T00:00:00Z', base: { ref: 'main' }, user: { login: 'bob' }, html_url: 'https://github.com/acme/widgets/pull/1' },
        { number: 2, title: 'closed unmerged', merged_at: null, base: { ref: 'main' }, user: { login: 'bob' } },
        { number: 3, title: 'newest', merged_at: '2026-02-01T00:00:00Z', base: { ref: 'main' }, user: { login: 'alice' }, html_url: 'https://github.com/acme/widgets/pull/3' },
      ]);
    }) as any);
    const pr = await provider().fetchLastMergedPr('acme', 'widgets', 'main', new AbortController().signal);
    expect(pr).toMatchObject({ prNumber: 3, title: 'newest', authorLogin: 'alice', baseBranch: 'main' });
    expect(calls[1]).toContain('base=main');
  });

  it.each([
    [429, {}, 'GITHUB_RATE_LIMITED'],
    [403, { 'x-ratelimit-remaining': '0' }, 'GITHUB_RATE_LIMITED'],
    [403, {}, 'GITHUB_FORBIDDEN'],
    [404, {}, 'GITHUB_REPO_NOT_FOUND'],
    [503, {}, 'GITHUB_UNAVAILABLE'],
  ])('maps upstream %p to %p', async (status, headers, code) => {
    jest.spyOn(globalThis, 'fetch').mockImplementation((async (url: any) =>
      String(url).includes('/access_tokens')
        ? json(201, { token: 'ghs_x', expires_at: new Date(Date.now() + 3600_000).toISOString() })
        : json(status as number, { message: 'secret detail' }, headers as Record<string, string>)) as any);
    await expect(provider().fetchLastMergedPr('acme', 'widgets', 'main', new AbortController().signal)).rejects.toMatchObject({ code });
  });
});
