'use client';
import { useComments } from '@/features/comments/queries/comments';
import CommentsHeader from './CommentsHeader';
import NewCommentForm from './NewCommentForm';
import CommentList from './CommentList';

interface CommentsSectionProps {
  postId: string;
  postAuthorId: string;
  commentCount: number;
  currentUserId: string;
  currentUserRole: 'user' | 'admin';
}

export default function CommentsSection({ postId, postAuthorId, commentCount, currentUserId, currentUserRole }: CommentsSectionProps) {
  const { data: comments, isLoading, isError, error, refetch, isRefetching } = useComments(postId);

  return (
    <div>
      <CommentsHeader count={commentCount} />

      <div className="mt-3">
        <NewCommentForm postId={postId} />
      </div>

      <div className="mt-5">
        {isLoading && <p className="text-sm text-slate-400">Loading comments...</p>}

        {isError && !isLoading && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-center">
            <p className="text-sm font-medium text-red-700">
              {(error as Error)?.message || 'Failed to load comments.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isRefetching ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {!isLoading && !isError && comments && comments.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
            <p className="text-2xl">💬</p>
            <p className="mt-2 text-sm font-medium text-slate-500">No comments yet</p>
            <p className="text-xs text-slate-400">Be the first to comment.</p>
          </div>
        )}

        {!isLoading && !isError && comments && comments.length > 0 && (
          <CommentList
            comments={comments}
            postId={postId}
            postAuthorId={postAuthorId}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        )}
      </div>
    </div>
  );
}