import type { ChangelogProvider, MergedPr } from '../changelog.types.js';
import { UpstreamError } from '../changelog.types.js';

export const MOCK_MERGED_AT = '2026-01-15T10:30:00.000Z';

export class MockChangelogProvider implements ChangelogProvider {
  readonly name = 'mock' as const;

  constructor(private readonly failure: string | null = null) {}

  async fetchLastMergedPr(owner: string, repo: string, branch: string): Promise<MergedPr | null> {
    if (this.failure === 'timeout') throw new UpstreamError('GITHUB_TIMEOUT');
    if (this.failure === 'rate_limit') throw new UpstreamError('GITHUB_RATE_LIMITED');
    if (this.failure === 'unavailable') throw new UpstreamError('GITHUB_UNAVAILABLE');
    return {
      prNumber: 42,
      title: 'fix login cookie flags',
      authorLogin: 'alice',
      mergedAt: new Date(MOCK_MERGED_AT),
      htmlUrl: `https://github.com/${owner}/${repo}/pull/42`,
      baseBranch: branch,
    };
  }
}
