'use client';
import { useState } from 'react';
import { useCreateComment } from '@/features/comments/mutations/comments';
import { commentBodySchema } from '@/features/comments/schemas/comment';

interface NewCommentFormProps {
  postId: string;
}

export default function NewCommentForm({ postId }: NewCommentFormProps) {
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState('');
  const createMutation = useCreateComment(postId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = commentBodySchema.safeParse({ body });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || 'Please write a comment.');
      return;
    }
    setFormError('');
    createMutation.mutate(
      { postId, body: parsed.data.body },
      {
        onSuccess: () => {
          setBody('');
        },
      }
    );
  };

  const isPending = createMutation.isPending;
  const rawServerError = createMutation.isError ? (createMutation.error as Error).message : '';
  const serverError = createMutation.isError
    ? rawServerError || 'Failed to post your comment. Please try again.'
    : '';

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Write a comment..."
        disabled={isPending}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
      />
      {(formError || serverError) && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {formError || serverError}
        </p>
      )}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}