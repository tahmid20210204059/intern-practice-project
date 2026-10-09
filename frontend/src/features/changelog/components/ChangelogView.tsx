'use client';
import { useState } from 'react';
import { useChangelog, useSyncChangelog } from '@/features/changelog/queries/changelog';

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function ChangelogView() {
  const { data, isLoading, isError, error, refetch } = useChangelog();
  const sync = useSyncChangelog();
  const [repoInput, setRepoInput] = useState<string | null>(null);
  const repo = repoInput ?? data?.defaultRepo ?? '';
  const entries = data?.entries ?? [];

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={repo}
          onChange={(e) => setRepoInput(e.target.value)}
          placeholder="owner/repo (e.g. acme/widgets)"
          aria-label="GitHub repository"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="button"
          onClick={() => {
            sync.reset();
            sync.mutate(repo);
          }}
          disabled={sync.isPending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {sync.isPending ? 'Syncing...' : 'Sync from GitHub'}
        </button>
      </div>

      {data && (
        <p className="mt-2 text-xs text-slate-400">
          Source: {data.provider === 'mock' ? 'mock data (no GitHub App credentials configured)' : 'GitHub App'}
        </p>
      )}

      {sync.isError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {(sync.error as Error).message}
          {entries.length > 0 ? ' Showing the last synced entries below.' : ''}
        </p>
      )}
      {sync.isSuccess && sync.data.message && (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">{sync.data.message}</p>
      )}
      {sync.isSuccess && sync.data.synced && (
        <p className="mt-3 rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">Synced #{sync.data.entry?.prNumber} from {sync.data.repo}.</p>
      )}

      <div className="mt-6 space-y-4">
        {isLoading && <p className="text-sm text-slate-500">Loading changelog...</p>}
        {isError && (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <p>{(error as Error).message || 'Failed to load changelog.'}</p>
            <button type="button" onClick={() => refetch()} className="mt-1 font-medium underline">
              Try again
            </button>
          </div>
        )}
        {!isLoading && !isError && entries.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
            No changelog entries yet. Enter a repository and press Sync.
          </p>
        )}
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">PR #{entry.prNumber}</span>
              <span>
                {entry.owner}/{entry.repo}
              </span>
              <span>→ {entry.baseBranch}</span>
            </div>
            <h2 className="mt-2 text-base font-semibold text-slate-900">{entry.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Merged by <span className="font-medium text-slate-700">{entry.authorLogin}</span> on {formatDate(entry.mergedAt)}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
              <span>Last synced {formatDate(entry.syncedAt)}</span>
              {entry.htmlUrl.startsWith('https://') && (
                <a href={entry.htmlUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
                  View on GitHub
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
