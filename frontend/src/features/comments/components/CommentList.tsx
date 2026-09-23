import CommentItem from './CommentItem';
import type { Comment } from '@/features/comments/types';

interface CommentListProps {
  comments: Comment[];
  postId: string;
  postAuthorId: string;
  currentUserId: string;
  currentUserRole: 'user' | 'admin';
}

export default function CommentList({ comments, postId, postAuthorId, currentUserId, currentUserRole }: CommentListProps) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment._id}
          comment={comment}
          postId={postId}
          postAuthorId={postAuthorId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      ))}
    </div>
  );
}