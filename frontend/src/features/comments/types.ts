export interface CommentAuthor {
  _id: string;
  name: string;
  avatarUrl?: string;
}

export interface Comment {
  _id: string;
  postId: string;
  authorId: CommentAuthor;
  parentCommentId: string | null;
  body: string;
  depth: number;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  postId: string;
  parentCommentId?: string;
  body: string;
}

export interface UpdateCommentInput {
  body: string;
}