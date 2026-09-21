import { useInfiniteQuery, useQuery, useMutation, useQueryClient, type InfiniteData, type Query } from '@tanstack/react-query';
import { apiCall } from './api';
import type { PostFormValues } from './schemas';

const FEED_PAGE_SIZE = 10;
export const FEED_QUERY_KEY = ['posts', 'feed'] as const;
export const postQueryKey = (id: string) => ['posts', 'detail', id] as const;
export const userPostsQueryKey = (authorId: string) => ['posts', 'user', authorId] as const;

const isPostListQuery = (query: Query) => query.queryKey[0] === 'posts' && (query.queryKey[1] === 'feed' || query.queryKey[1] === 'user');

export interface PostAuthor {
  _id: string;
  name: string;
  avatarUrl?: string;
}

export interface Post {
  _id: string;
  authorId: PostAuthor;
  title: string;
  body: string;
  likeCount: number;
  commentCount: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface FeedPage {
  items: Post[];
  pagination: PaginationMeta;
}

export type CreatePostInput = PostFormValues;
export type UpdatePostInput = PostFormValues;

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

export function useFeed() {
  return useInfiniteQuery({
    queryKey: FEED_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchFeed(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined),
  });
}

export function useUserPosts(authorId: string) {
  return useInfiniteQuery({
    queryKey: userPostsQueryKey(authorId),
    queryFn: ({ pageParam }) => fetchFeed(pageParam as number, authorId),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined),
    enabled: !!authorId,
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: postQueryKey(id),
    queryFn: () => fetchPost(id),
    enabled: !!id,
  });
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