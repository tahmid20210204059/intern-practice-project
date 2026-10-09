import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/lib/http/client';

export const CHANGELOG_QUERY_KEY = ['changelog'];

export interface ChangelogEntry {
  id: string;
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  authorLogin: string;
  mergedAt: string;
  htmlUrl: string;
  baseBranch: string;
  syncedAt: string;
  source: 'github' | 'mock';
}

export interface ChangelogList {
  provider: 'github' | 'mock';
  defaultRepo: string | null;
  entries: ChangelogEntry[];
}

export interface ChangelogSyncResult {
  provider: 'github' | 'mock';
  repo: string;
  synced: boolean;
  message?: string;
  entry: ChangelogEntry | null;
}

export function useChangelog() {
  return useQuery({
    queryKey: CHANGELOG_QUERY_KEY,
    retry: false,
    queryFn: async () => {
      const res = await apiCall<ChangelogList>('/changelog');
      if (!res.success) throw new Error(res.message || 'Failed to load changelog');
      return res.data;
    },
  });
}

export function useSyncChangelog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (repo: string) => {
      const res = await apiCall<ChangelogSyncResult>('/changelog/sync', {
        method: 'POST',
        body: JSON.stringify(repo.trim() ? { repo: repo.trim() } : {}),
      });
      if (!res.success) throw new Error(res.message || 'Changelog sync failed');
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHANGELOG_QUERY_KEY }),
  });
}
