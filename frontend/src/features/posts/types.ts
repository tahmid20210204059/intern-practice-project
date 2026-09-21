import type { PostFormValues } from './schemas/post';

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
  imageUrl?: string;
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
