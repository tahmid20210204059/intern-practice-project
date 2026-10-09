import { createSign } from 'node:crypto';
import type { ChangelogProvider, MergedPr } from '../changelog.types.js';
import { UpstreamError } from '../changelog.types.js';

export interface GithubAppCredentials {
  appId: string;
  privateKey: string;
  installationId: string;
  apiUrl?: string;
}

const DEFAULT_API_URL = 'https://api.github.com';
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const PULLS_PER_PAGE = 50;

export class GithubAppChangelogProvider implements ChangelogProvider {
  readonly name = 'github' as const;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly credentials: GithubAppCredentials) {}

  async fetchLastMergedPr(owner: string, repo: string, branch: string, signal: AbortSignal): Promise<MergedPr | null> {
    const token = await this.getInstallationToken(signal);
    const query = new URLSearchParams({
      state: 'closed',
      base: branch,
      sort: 'updated',
      direction: 'desc',
      per_page: String(PULLS_PER_PAGE),
    });
    const res = await this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${query.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
      signal,
    );
    if (!res.ok) throw this.mapFailure(res);
    const body = await this.readJson(res, signal);
    if (!Array.isArray(body)) throw new UpstreamError('GITHUB_UNAVAILABLE');

    let latest: any = null;
    for (const pr of body) {
      if (!pr || typeof pr.merged_at !== 'string' || pr?.base?.ref !== branch) continue;
      if (!latest || Date.parse(pr.merged_at) > Date.parse(latest.merged_at)) latest = pr;
    }
    if (!latest) return null;

    const mergedAt = new Date(latest.merged_at);
    if (!Number.isInteger(latest.number) || typeof latest.title !== 'string' || Number.isNaN(mergedAt.getTime())) {
      throw new UpstreamError('GITHUB_UNAVAILABLE');
    }
    const htmlUrl = typeof latest.html_url === 'string' && latest.html_url.startsWith('https://github.com/') ? latest.html_url : `https://github.com/${owner}/${repo}/pull/${latest.number}`;
    return {
      prNumber: latest.number,
      title: latest.title.slice(0, 300),
      authorLogin: typeof latest.user?.login === 'string' ? latest.user.login : 'unknown',
      mergedAt,
      htmlUrl,
      baseBranch: branch,
    };
  }

  private async getInstallationToken(signal: AbortSignal): Promise<string> {
    if (this.token && this.token.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) return this.token.value;
    const res = await this.request(
      `/app/installations/${encodeURIComponent(this.credentials.installationId)}/access_tokens`,
      { method: 'POST', headers: { Authorization: `Bearer ${this.signAppJwt()}` } },
      signal,
    );
    if (!res.ok) {
      const failure = this.mapFailure(res);
      throw failure.code === 'GITHUB_REPO_NOT_FOUND' || failure.code === 'GITHUB_FORBIDDEN'
        ? new UpstreamError('GITHUB_AUTH_FAILED')
        : failure;
    }
    const body: any = await this.readJson(res, signal);
    const expiresAt = Date.parse(body?.expires_at);
    if (typeof body?.token !== 'string' || !body.token) throw new UpstreamError('GITHUB_AUTH_FAILED');
    this.token = { value: body.token, expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 5 * 60_000 };
    return this.token.value;
  }

  private signAppJwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: this.credentials.appId })}`;
    try {
      const signature = createSign('RSA-SHA256').update(unsigned).sign(this.credentials.privateKey).toString('base64url');
      return `${unsigned}.${signature}`;
    } catch {
      throw new UpstreamError('GITHUB_AUTH_FAILED');
    }
  }

  private async request(path: string, init: RequestInit, signal: AbortSignal): Promise<Response> {
    try {
      return await fetch(`${this.credentials.apiUrl || DEFAULT_API_URL}${path}`, {
        ...init,
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'dev-community-changelog',
          ...(init.headers as Record<string, string>),
        },
        signal,
      });
    } catch {
      throw new UpstreamError(signal.aborted ? 'GITHUB_TIMEOUT' : 'GITHUB_UNAVAILABLE');
    }
  }

  private async readJson(res: Response, signal: AbortSignal): Promise<unknown> {
    try {
      return await res.json();
    } catch {
      throw new UpstreamError(signal.aborted ? 'GITHUB_TIMEOUT' : 'GITHUB_UNAVAILABLE');
    }
  }

  private mapFailure(res: Response): UpstreamError {
    const status = res.status;
    if (status === 429) return new UpstreamError('GITHUB_RATE_LIMITED');
    if (status === 403) {
      const exhausted = res.headers.get('x-ratelimit-remaining') === '0' || res.headers.has('retry-after');
      return new UpstreamError(exhausted ? 'GITHUB_RATE_LIMITED' : 'GITHUB_FORBIDDEN');
    }
    if (status === 401) return new UpstreamError('GITHUB_AUTH_FAILED');
    if (status === 404) return new UpstreamError('GITHUB_REPO_NOT_FOUND');
    return new UpstreamError('GITHUB_UNAVAILABLE');
  }
}
