import { useInfiniteQuery, useQuery, type Query } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { apiCall } from '@/lib/http/client';
import type { FeedPage, Post } from '../types';

const FEED_PAGE_SIZE = 10;
export const FEED_QUERY_KEY = ['posts', 'feed'] as const;
export const postQueryKey = (id: string) => ['posts', 'detail', id] as const;
export const userPostsQueryKey = (authorId: string) => ['posts', 'user', authorId] as const;
const LATEST_PEEK_QUERY_KEY = ['posts', 'latest-peek'] as const;

const LIVE_REFRESH_INTERVAL_MS = 8000;

export const isPostListQuery = (query: Query) => query.queryKey[0] === 'posts' && (query.queryKey[1] === 'feed' || query.queryKey[1] === 'user');

export async function fetchFeed(page: number, authorId?: string): Promise<FeedPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(FEED_PAGE_SIZE) });
  if (authorId) params.set('authorId', authorId);
  const res = await apiCall<FeedPage>(`/posts?${params.toString()}`);
  if (!res.success) throw new Error(res.message || 'Failed to load feed');
  return res.data;
}

export async function fetchPost(id: string): Promise<Post> {
  const res = await apiCall<Post>(`/posts/${id}`);
  if (!res.success) throw new Error(res.message || 'Failed to load post');
  return res.data;
}

export function useFeed() {
  return useInfiniteQuery({
    queryKey: FEED_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchFeed(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined),
    refetchInterval: LIVE_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useUserPosts(authorId: string) {
  return useInfiniteQuery({
    queryKey: userPostsQueryKey(authorId),
    queryFn: ({ pageParam }) => fetchFeed(pageParam as number, authorId),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined),
    enabled: !!authorId,
    refetchInterval: LIVE_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: postQueryKey(id),
    queryFn: () => fetchPost(id),
    enabled: !!id,
    refetchInterval: LIVE_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

let seenPostId: string | null = null;
const seenListeners = new Set<() => void>();

function emitSeenChange() {
  seenListeners.forEach((listener) => listener());
}

export function setSeenPostId(id: string | null) {
  if (id === seenPostId) return;
  seenPostId = id;
  emitSeenChange();
}

function subscribeSeenPostId(listener: () => void) {
  seenListeners.add(listener);
  return () => {
    seenListeners.delete(listener);
  };
}

function getSeenPostIdSnapshot() {
  return seenPostId;
}

function getSeenPostIdServerSnapshot() {
  return null;
}

function useSeenPostId() {
  return useSyncExternalStore(subscribeSeenPostId, getSeenPostIdSnapshot, getSeenPostIdServerSnapshot);
}

export function useLatestPostPeek() {
  return useQuery({
    queryKey: LATEST_PEEK_QUERY_KEY,
    queryFn: async () => {
      const res = await apiCall<FeedPage>('/posts?page=1&limit=1');
      if (!res.success) throw new Error(res.message || 'Failed to check for new posts');
      return res.data.items[0]?._id ?? null;
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
}

export function useHasNewPosts(): boolean {
  const { data: latestId } = useLatestPostPeek();
  const seenId = useSeenPostId();
  if (!latestId || seenId === null) return false;
  return latestId !== seenId;
}

export function useMarkFeedSeen() {
  const { data: latestId } = useLatestPostPeek();
  return () => setSeenPostId(latestId ?? null);
}