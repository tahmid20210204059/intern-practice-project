'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { postSchema, PostFormValues } from '@/lib/schemas';

interface PostFormProps {
  defaultValues?: PostFormValues;
  onSubmit: (values: PostFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  error?: string | null;
  onCancel?: () => void;
}

export default function PostForm({ defaultValues, onSubmit, isSubmitting, submitLabel, error, onCancel }: PostFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: defaultValues || { title: '', body: '' },
  });

  const submit = (values: PostFormValues) => {
    if (isSubmitting) return;
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Title</label>
        <input
          {...register('title')}
          maxLength={150}
          placeholder="Give your post a title"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Body</label>
        <textarea
          {...register('body')}
          rows={8}
          maxLength={5000}
          placeholder="Share something with the community..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}