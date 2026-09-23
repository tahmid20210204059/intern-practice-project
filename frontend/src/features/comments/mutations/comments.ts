import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/lib/http/client';
import type { Comment, CreateCommentInput, UpdateCommentInput } from '../types';
import { commentsQueryKey } from '../queries/comments';
import { postQueryKey, isPostListQuery } from '@/features/posts/queries/posts';

export async function createCommentRequest(payload: CreateCommentInput): Promise<Comment> {
  const res = await apiCall<Comment>('/comments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.success) throw new Error(res.message || '');
  return res.data;
}

export async function updateCommentRequest(id: string, payload: UpdateCommentInput): Promise<Comment> {
  const res = await apiCall<Comment>(`/comments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.success) throw new Error(res.message || '');
  return res.data;
}

export async function deleteCommentRequest(id: string): Promise<{ message: string; deletedCount: number }> {
  const res = await apiCall<{ message: string; deletedCount: number }>(`/comments/${id}`, {
    method: 'DELETE',
  });
  if (!res.success) throw new Error(res.message || '');
  return res.data;
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommentInput) => createCommentRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) });
      queryClient.invalidateQueries({ queryKey: postQueryKey(postId) });
      queryClient.invalidateQueries({ predicate: isPostListQuery });
    },
  });
}

export function useUpdateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updateCommentRequest(id, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCommentRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) });
      queryClient.invalidateQueries({ queryKey: postQueryKey(postId) });
      queryClient.invalidateQueries({ predicate: isPostListQuery });
    },
  });
}