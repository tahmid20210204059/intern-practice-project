import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/http/client';
import type { Comment } from '../types';

export const commentsQueryKey = (postId: string) => ['comments', postId] as const;

const LIVE_REFRESH_INTERVAL_MS = 8000;

export async function fetchComments(postId: string): Promise<Comment[]> {
  const res = await apiCall<Comment[]>(`/comments/post/${postId}`);
  if (!res.success) throw new Error(res.message || 'Failed to load comments');
  return res.data;
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: commentsQueryKey(postId),
    queryFn: () => fetchComments(postId),
    enabled: !!postId,
    refetchInterval: LIVE_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}