import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiCall } from '@/lib/http/client';
import type { CreatePostInput, FeedPage, Post, UpdatePostInput } from '../types';
import { isPostListQuery, postQueryKey } from '../queries/posts';

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
