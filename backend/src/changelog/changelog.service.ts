import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChangelogEntry } from './schemas/changelog-entry.schema.js';
import type { ChangelogProvider } from './changelog.types.js';
import { UpstreamError } from './changelog.types.js';
import { normalizePrivateKey, parseRepo } from './changelog.utils.js';
import { GithubAppChangelogProvider } from './providers/github-app-changelog.provider.js';
import { MockChangelogProvider } from './providers/mock-changelog.provider.js';

export const CHANGELOG_BRANCH = 'main';
const MIN_TIMEOUT_MS = 2000;
const MAX_TIMEOUT_MS = 3000;
const DEFAULT_TIMEOUT_MS = 2500;
const LIST_LIMIT = 20;
const DUPLICATE_KEY = 11000;

@Injectable()
export class ChangelogService {
  private readonly logger = new Logger(ChangelogService.name);
  private readonly provider: ChangelogProvider;
  private readonly timeoutMs: number;
  private readonly defaultRepo: string | null;

  constructor(
    @InjectModel(ChangelogEntry.name) private model: Model<ChangelogEntry>,
    private configService: ConfigService,
  ) {
    this.timeoutMs = this.readTimeout();
    this.defaultRepo = this.configService.get<string>('CHANGELOG_DEFAULT_REPO')?.trim() || null;
    this.provider = this.buildProvider();
  }

  async list(repoInput?: string) {
    const filter: Record<string, unknown> = { source: this.provider.name };
    if (repoInput?.trim()) {
      const { owner, repo } = parseRepo(repoInput);
      filter.owner = owner;
      filter.repo = repo;
    }
    const rows = await this.model.find(filter).sort({ mergedAt: -1 }).limit(LIST_LIMIT).lean();
    return {
      provider: this.provider.name,
      defaultRepo: this.defaultRepo,
      entries: rows.map((row) => this.toView(row)),
    };
  }

  async sync(repoInput?: string) {
    const { owner, repo } = parseRepo(repoInput?.trim() || this.defaultRepo);
    let pr;
    try {
      pr = await this.runWithDeadline((signal) => this.provider.fetchLastMergedPr(owner, repo, CHANGELOG_BRANCH, signal));
    } catch (err) {
      if (err instanceof UpstreamError) {
        this.logger.warn(`Changelog sync failed for ${owner}/${repo}: ${err.code}`);
        throw new HttpException({ message: err.message, code: err.code }, err.status);
      }
      this.logger.error(`Changelog sync failed for ${owner}/${repo}: unexpected ${err instanceof Error ? err.name : 'error'}`);
      throw new HttpException({ message: 'Changelog sync failed unexpectedly.', code: 'CHANGELOG_SYNC_FAILED' }, 502);
    }

    if (!pr) {
      return {
        provider: this.provider.name,
        repo: `${owner}/${repo}`,
        synced: false,
        message: `No pull request has been merged into ${CHANGELOG_BRANCH} yet.`,
        entry: null,
      };
    }

    const row = await this.upsert(owner, repo, pr);
    return { provider: this.provider.name, repo: `${owner}/${repo}`, synced: true, entry: this.toView(row) };
  }

  private async upsert(owner: string, repo: string, pr: { prNumber: number; title: string; authorLogin: string; mergedAt: Date; htmlUrl: string; baseBranch: string }) {
    const run = () =>
      this.model
        .findOneAndUpdate(
          { source: this.provider.name, owner, repo, prNumber: pr.prNumber },
          {
            $set: {
              title: pr.title,
              authorLogin: pr.authorLogin,
              mergedAt: pr.mergedAt,
              htmlUrl: pr.htmlUrl,
              baseBranch: pr.baseBranch,
              syncedAt: new Date(),
            },
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
        )
        .lean();
    try {
      return await run();
    } catch (err: any) {
      if (err?.code === DUPLICATE_KEY) return run();
      throw err;
    }
  }

  private toView(row: any) {
    return {
      id: String(row._id),
      owner: row.owner,
      repo: row.repo,
      prNumber: row.prNumber,
      title: row.title,
      authorLogin: row.authorLogin,
      mergedAt: row.mergedAt,
      htmlUrl: row.htmlUrl,
      baseBranch: row.baseBranch,
      syncedAt: row.syncedAt,
      source: row.source,
    };
  }

  private async runWithDeadline<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new UpstreamError('GITHUB_TIMEOUT'));
      }, this.timeoutMs);
    });
    try {
      return await Promise.race([task(controller.signal), deadline]);
    } finally {
      clearTimeout(timer);
    }
  }

  private readTimeout(): number {
    const value = Number(this.configService.get<string>('CHANGELOG_TIMEOUT_MS'));
    if (!Number.isFinite(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
    return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, value));
  }

  private buildProvider(): ChangelogProvider {
    const mode = this.configService.get<string>('CHANGELOG_PROVIDER')?.trim().toLowerCase() || 'auto';
    const appId = this.configService.get<string>('GITHUB_APP_ID')?.trim() || '';
    const privateKey = normalizePrivateKey(this.configService.get<string>('GITHUB_APP_PRIVATE_KEY'));
    const installationId = this.configService.get<string>('GITHUB_APP_INSTALLATION_ID')?.trim() || '';
    const present = { GITHUB_APP_ID: !!appId, GITHUB_APP_PRIVATE_KEY: !!privateKey, GITHUB_APP_INSTALLATION_ID: !!installationId };

    if (mode !== 'mock' && appId && privateKey && installationId) {
      return new GithubAppChangelogProvider({ appId, privateKey, installationId });
    }
    const configured = Object.values(present).filter(Boolean).length;
    if (mode !== 'mock' && configured > 0) {
      const missing = Object.entries(present).filter(([, ok]) => !ok).map(([name]) => name);
      this.logger.warn(`GitHub App is partially configured (missing: ${missing.join(', ')}). Using the mock changelog provider.`);
    }
    const failure = this.configService.get<string>('CHANGELOG_MOCK_FAILURE')?.trim().toLowerCase() || null;
    return new MockChangelogProvider(failure);
  }
}
