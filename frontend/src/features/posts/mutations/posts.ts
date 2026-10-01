import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiCall } from '@/lib/http/client';
import type { CreatePostInput, FeedPage, Post, PostSummary, UpdatePostInput } from '../types';
import { isPostListQuery, postQueryKey } from '../queries/posts';
import { cleanUntrustedText, parseSummaryResponse } from '../utils/untrustedText';

const SUMMARIZE_REQUEST_TIMEOUT_MS = 20000;

export class SummarizeError extends Error {
  statusCode: number;
  retryable: boolean;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'SummarizeError';
    this.statusCode = statusCode;
    this.retryable = statusCode === 0 || statusCode === 408 || statusCode === 429 || statusCode >= 500;
  }
}

export async function createPost(payload: CreatePostInput): Promise<Post> {
  const res = await apiCall<Post>('/posts', { method: 'POST', body: JSON.stringify(payload) });
  if (!res.success) throw new Error(res.message || 'Failed to create post');
  return res.data;
}

export async function updatePostRequest(id: string, payload: UpdatePostInput): Promise<Post> {
  const res = await apiCall<Post>(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  if (!res.success) throw new Error(res.message || 'Failed to update post');
  return res.data;
}

export async function deletePostRequest(id: string): Promise<{ message: string }> {
  const res = await apiCall<{ message: string }>(`/posts/${id}`, { method: 'DELETE' });
  if (!res.success) throw new Error(res.message || 'Failed to delete post');
  return res.data;
}

export async function summarizePostRequest(id: string): Promise<PostSummary> {
  const res = await apiCall<unknown>(`/posts/${id}/summarize`, {
    method: 'POST',
    signal: AbortSignal.timeout(SUMMARIZE_REQUEST_TIMEOUT_MS),
  });
  if (!res.success) {
    throw new SummarizeError(cleanUntrustedText(res.message, 200) || 'Could not summarize this post.', res.statusCode);
  }
  const parsed = parseSummaryResponse(res.data);
  if (!parsed) throw new SummarizeError('The summarizer returned an unreadable result. Please try again.', 502);
  return parsed;
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePostInput) => createPost(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: isPostListQuery });
    },
  });
}

export function useUpdatePost(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePostInput) => updatePostRequest(id, payload),
    onSuccess: (updatedPost) => {
      queryClient.setQueryData(postQueryKey(id), updatedPost);
      queryClient.setQueriesData<InfiniteData<FeedPage>>({ predicate: isPostListQuery }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((post) => (post._id === id ? updatedPost : post)),
          })),
        };
      });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePostRequest(id),
    onSuccess: (_result, id) => {
      queryClient.setQueriesData<InfiniteData<FeedPage>>({ predicate: isPostListQuery }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((post) => post._id !== id),
          })),
        };
      });
      queryClient.removeQueries({ queryKey: postQueryKey(id) });
    },
  });
}

export function useSummarizePost(id: string) {
  return useMutation<PostSummary, SummarizeError, void>({
    mutationFn: () => summarizePostRequest(id),
  });
}