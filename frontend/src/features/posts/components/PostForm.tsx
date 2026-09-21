'use client';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, X } from 'lucide-react';
import { apiUpload } from '@/lib/http/client';
import { postSchema, PostFormValues } from '@/features/posts/schemas/post';

interface PostFormProps {
  defaultValues?: PostFormValues;
  onSubmit: (values: PostFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  error?: string | null;
  onCancel?: () => void;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export default function PostForm({ defaultValues, onSubmit, isSubmitting, submitLabel, error, onCancel }: PostFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: defaultValues || { title: '', body: '', imageUrl: '' },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const imageUrl = watch('imageUrl');

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('Image must be smaller than 5MB.');
      return;
    }

    setImageError('');
    setImageUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiUpload<{ url: string }>('/uploads/post-image', formData);
    setImageUploading(false);

    if (res.success) {
      setValue('imageUrl', res.data.url, { shouldDirty: true });
    } else {
      setImageError(res.message || 'Failed to upload image.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = () => {
    setValue('imageUrl', '', { shouldDirty: true });
    setImageError('');
  };

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

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Photo (optional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImagePick}
          disabled={imageUploading}
          className="hidden"
        />
        {imageUrl ? (
          <div className="relative inline-block">
            <img src={imageUrl} alt="Post attachment" className="max-h-64 rounded-xl border border-slate-200 object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={imageUploading}
              aria-label="Remove image"
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow hover:bg-slate-800 disabled:opacity-60"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <ImagePlus size={16} />
            {imageUploading ? 'Uploading...' : 'Add photo'}
          </button>
        )}
        {imageError && <p className="mt-1 text-xs text-red-600">{imageError}</p>}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || imageUploading}
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
