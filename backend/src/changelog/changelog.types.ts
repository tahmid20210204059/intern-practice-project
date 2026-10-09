export type ProviderName = 'github' | 'mock';

export interface MergedPr {
  prNumber: number;
  title: string;
  authorLogin: string;
  mergedAt: Date;
  htmlUrl: string;
  baseBranch: string;
}

export interface ChangelogProvider {
  readonly name: ProviderName;
  fetchLastMergedPr(owner: string, repo: string, branch: string, signal: AbortSignal): Promise<MergedPr | null>;
}

export type UpstreamErrorCode =
  | 'GITHUB_RATE_LIMITED'
  | 'GITHUB_FORBIDDEN'
  | 'GITHUB_AUTH_FAILED'
  | 'GITHUB_REPO_NOT_FOUND'
  | 'GITHUB_TIMEOUT'
  | 'GITHUB_UNAVAILABLE';

export const UPSTREAM_MESSAGES: Record<UpstreamErrorCode, string> = {
  GITHUB_RATE_LIMITED: 'GitHub rate limit reached. Please try again later.',
  GITHUB_FORBIDDEN: 'GitHub refused the request. Check that the GitHub App can access this repository.',
  GITHUB_AUTH_FAILED: 'GitHub App authentication failed. Check the server GitHub App configuration.',
  GITHUB_REPO_NOT_FOUND: 'Repository not found, or the GitHub App cannot see it.',
  GITHUB_TIMEOUT: 'GitHub did not respond in time. Showing the last synced changelog.',
  GITHUB_UNAVAILABLE: 'GitHub is unavailable right now. Showing the last synced changelog.',
};

export const UPSTREAM_STATUS: Record<UpstreamErrorCode, number> = {
  GITHUB_RATE_LIMITED: 429,
  GITHUB_FORBIDDEN: 502,
  GITHUB_AUTH_FAILED: 502,
  GITHUB_REPO_NOT_FOUND: 404,
  GITHUB_TIMEOUT: 504,
  GITHUB_UNAVAILABLE: 502,
};

export class UpstreamError extends Error {
  readonly status: number;
  constructor(readonly code: UpstreamErrorCode) {
    super(UPSTREAM_MESSAGES[code]);
    this.name = 'UpstreamError';
    this.status = UPSTREAM_STATUS[code];
  }
}
