'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ReplyForm from './ReplyForm';
import EditCommentForm from './EditCommentForm';
import CommentActionsMenu from './CommentActionsMenu';
import DeleteConfirmPopover from './DeleteConfirmPopover';
import { useDeleteComment } from '@/features/comments/mutations/comments';
import type { Comment } from '@/features/comments/types';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  postAuthorId: string;
  currentUserId: string;
  currentUserRole: 'user' | 'admin';
}

// must match backend MAX_COMMENT_DEPTH (backend/src/comments/comments.service.ts)
const MAX_COMMENT_DEPTH = 3;

interface FlatReply {
  comment: Comment;
  replyingToName: string;
}

function flattenReplies(node: Comment): FlatReply[] {
  let result: FlatReply[] = [];
  for (const reply of node.replies || []) {
    result.push({ comment: reply, replyingToName: node.authorId?.name || 'Unknown' });
    result = result.concat(flattenReplies(reply));
  }
  return result;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ReplyRow({
  postId,
  postAuthorId,
  reply,
  rootAuthorName,
  currentUserId,
  currentUserRole,
}: {
  postId: string;
  postAuthorId: string;
  reply: FlatReply;
  rootAuthorName: string;
  currentUserId: string;
  currentUserRole: 'user' | 'admin';
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const replyButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const deleteMutation = useDeleteComment(postId);

  const { comment, replyingToName } = reply;
  const isOwner = comment.authorId?._id === currentUserId;
  const isPostOwner = postAuthorId === currentUserId;
  const isAdmin = currentUserRole === 'admin';
  const canEdit = isOwner;
  const canDelete = isOwner || isPostOwner || isAdmin;
  const canReply = comment.depth < MAX_COMMENT_DEPTH;
  const isEdited = comment.updatedAt !== comment.createdAt;
  const authorName = comment.authorId?.name || 'Unknown';
  const authorAvatar = comment.authorId?.avatarUrl;
  const showReplyingTo = replyingToName !== rootAuthorName;

  useEffect(() => {
    if (!replyOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      replyButtonRef.current?.focus();
    }
    if (replyOpen) wasOpenRef.current = true;
  }, [replyOpen]);

  const handleDelete = () => {
    setDeleteError('');
    deleteMutation.mutate(comment._id, {
      onSuccess: () => setShowDeleteConfirm(false),
      onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to delete reply.'),
    });
  };

  return (
    <div className="flex gap-2.5">
      {authorAvatar ? (
        <img src={authorAvatar} alt={authorName} className="h-7 w-7 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
          {authorName.charAt(0).toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="text-sm font-semibold text-slate-900">{authorName}</p>
              <p className="text-xs text-slate-400">
                {timeAgo(comment.createdAt)}
                {isEdited ? ' · Edited' : ''}
              </p>
            </div>
            {!editOpen && (
              <CommentActionsMenu
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={() => setEditOpen(true)}
                onDelete={() => setShowDeleteConfirm(true)}
                label="reply"
              />
            )}
          </div>

          {showReplyingTo && !editOpen && (
            <p className="text-xs font-medium text-indigo-500">Replying to @{replyingToName}</p>
          )}

          {editOpen ? (
            <EditCommentForm
              postId={postId}
              commentId={comment._id}
              initialBody={comment.body}
              onSuccess={() => setEditOpen(false)}
              onCancel={() => setEditOpen(false)}
            />
          ) : (
            <p className="mt-0.5 min-w-0 overflow-hidden whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">
              {comment.body}
            </p>
          )}
        </div>

        {showDeleteConfirm && (
          <DeleteConfirmPopover
            label="reply"
            isPending={deleteMutation.isPending}
            error={deleteError}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}

        {canReply && !replyOpen && !editOpen && !showDeleteConfirm && (
          <button
            type="button"
            ref={replyButtonRef}
            onClick={() => setReplyOpen(true)}
            className="mt-1.5 text-xs font-semibold text-indigo-600 hover:underline"
          >
            Reply
          </button>
        )}

        {replyOpen && (
          <ReplyForm
            postId={postId}
            parentCommentId={comment._id}
            authorName={authorName}
            onSuccess={() => setReplyOpen(false)}
            onCancel={() => setReplyOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function CommentItem({ comment, postId, postAuthorId, currentUserId, currentUserRole }: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const replyButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const deleteMutation = useDeleteComment(postId);

  const isOwner = comment.authorId?._id === currentUserId;
  const isPostOwner = postAuthorId === currentUserId;
  const isAdmin = currentUserRole === 'admin';
  const canEdit = isOwner;
  const canDelete = isOwner || isPostOwner || isAdmin;
  const canReply = comment.depth < MAX_COMMENT_DEPTH;
  const isEdited = comment.updatedAt !== comment.createdAt;
  const authorName = comment.authorId?.name || 'Unknown';
  const authorAvatar = comment.authorId?.avatarUrl;
  const flatReplies = flattenReplies(comment);
  const replyCount = flatReplies.length;

  useEffect(() => {
    if (!replyOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      replyButtonRef.current?.focus();
    }
    if (replyOpen) wasOpenRef.current = true;
  }, [replyOpen]);

  const handleDelete = () => {
    setDeleteError('');
    deleteMutation.mutate(comment._id, {
      onSuccess: () => setShowDeleteConfirm(false),
      onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Failed to delete comment.'),
    });
  };

  return (
    <div>
      <div className="flex gap-3">
        {authorAvatar ? (
          <img src={authorAvatar} alt={authorName} className="h-8 w-8 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {authorName.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-semibold text-slate-900">{authorName}</p>
                <p className="text-xs text-slate-400">
                  {timeAgo(comment.createdAt)}
                  {isEdited ? ' · Edited' : ''}
                </p>
              </div>
              {!editOpen && (
                <CommentActionsMenu
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={() => setEditOpen(true)}
                  onDelete={() => setShowDeleteConfirm(true)}
                  label="comment"
                />
              )}
            </div>

            {editOpen ? (
              <EditCommentForm
                postId={postId}
                commentId={comment._id}
                initialBody={comment.body}
                onSuccess={() => setEditOpen(false)}
                onCancel={() => setEditOpen(false)}
              />
            ) : (
              <p className="mt-0.5 min-w-0 overflow-hidden whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">
                {comment.body}
              </p>
            )}
          </div>

          {showDeleteConfirm && (
            <DeleteConfirmPopover
              label="comment"
              isPending={deleteMutation.isPending}
              error={deleteError}
              onConfirm={handleDelete}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          )}

          <div className="mt-1.5 flex items-center gap-3">
            {canReply && !replyOpen && !editOpen && !showDeleteConfirm && (
              <button
                type="button"
                ref={replyButtonRef}
                onClick={() => setReplyOpen(true)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Reply
              </button>
            )}

            {replyCount > 0 && (
              <button
                type="button"
                onClick={() => setRepliesOpen((prev) => !prev)}
                aria-expanded={repliesOpen}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600"
              >
                {repliesOpen ? (
                  <>
                    <ChevronUp size={13} />
                    Hide replies
                  </>
                ) : (
                  <>
                    <ChevronDown size={13} />
                    View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                  </>
                )}
              </button>
            )}
          </div>

          {replyOpen && (
            <ReplyForm
              postId={postId}
              parentCommentId={comment._id}
              authorName={authorName}
              onSuccess={() => setReplyOpen(false)}
              onCancel={() => setReplyOpen(false)}
            />
          )}

          {repliesOpen && replyCount > 0 && (
            <div className="mt-3 ml-3 sm:ml-6 space-y-3 border-l-2 border-slate-100 pl-3 sm:pl-4">
              {flatReplies.map((r) => (
                <ReplyRow
                  key={r.comment._id}
                  postId={postId}
                  postAuthorId={postAuthorId}
                  reply={r}
                  rootAuthorName={authorName}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
