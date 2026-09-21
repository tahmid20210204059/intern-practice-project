'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, MessageCircle, Heart } from 'lucide-react';
import type { Post } from '@/lib/posts';
import { useDeletePost } from '@/lib/posts';

interface PostCardProps {
  post: Post;
  currentUserId: string;
  currentUserRole: 'user' | 'admin';
  variant?: 'feed' | 'detail';
  onDeleted?: () => void;
}

const URL_REGEX = /((?:https?:\/\/)[^\s]+)/g;

function renderBodyWithLinks(text: string) {
  return text.split(URL_REGEX).map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="break-all text-indigo-600 underline hover:text-indigo-700"
        >
          {part}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
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

export default function PostCard({ post, currentUserId, currentUserRole, variant = 'feed', onDeleted }: PostCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteMutation = useDeletePost();

  const isOwner = post.authorId?._id === currentUserId;
  const canManage = isOwner || currentUserRole === 'admin';
  const isEdited = post.updatedAt !== post.createdAt;
  const authorName = post.authorId?.name || 'Unknown';
  const authorAvatar = post.authorId?.avatarUrl;
  const authorId = post.authorId?._id;

  const handleDelete = () => {
    setDeleteError('');
    deleteMutation.mutate(post._id, {
      onSuccess: () => {
        onDeleted?.();
      },
      onError: (err: any) => setDeleteError(err?.message || 'Failed to delete post.'),
    });
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/profile/${authorId}`} className="flex items-center gap-3">
          {authorAvatar ? (
            <img src={authorAvatar} alt={authorName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {authorName.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900">{authorName}</p>
            <p className="text-xs text-slate-400">
              {timeAgo(post.createdAt)}
              {isEdited ? ' · Edited' : ''}
            </p>
          </div>
        </Link>

        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            {isOwner && (
              <Link
                href={`/posts/${post._id}/edit`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                aria-label="Edit post"
              >
                <Pencil size={15} />
              </Link>
            )}
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete post"
              >
                <Trash2 size={15} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}

      <div className="mt-4">
        {variant === 'feed' ? (
          <Link href={`/posts/${post._id}`}>
            <h2 className="break-words text-base font-semibold text-slate-900 hover:text-indigo-600">{post.title}</h2>
          </Link>
        ) : (
          <h1 className="break-words text-xl font-bold text-slate-900">{post.title}</h1>
        )}
        <p
          className={`mt-2 min-w-0 overflow-hidden whitespace-pre-line break-words text-sm leading-relaxed text-slate-600 ${
            variant === 'feed' ? 'line-clamp-4' : ''
          }`}
        >
          {renderBodyWithLinks(post.body)}
        </p>
        {variant === 'feed' && post.body.length > 280 && (
          <Link href={`/posts/${post._id}`} className="mt-1 inline-block text-sm font-medium text-indigo-600 hover:underline">
            Read more
          </Link>
        )}
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            className="mt-3 max-h-[480px] w-full rounded-xl border border-slate-100 object-cover"
          />
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Heart size={14} />
          {post.likeCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={14} />
          {post.commentCount}
        </span>
      </div>
    </article>
  );
}