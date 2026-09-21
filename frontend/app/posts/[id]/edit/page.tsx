'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiCall } from '@/lib/api';
import { usePost, useUpdatePost } from '@/lib/posts';
import Navbar from '@/components/Navbar';
import PostForm from '@/components/PostForm';
import PostCardSkeleton from '@/components/PostCardSkeleton';
import type { PostFormValues } from '@/lib/schemas';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [viewer, setViewer] = useState<any>(null);
  const [viewerLoading, setViewerLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await apiCall('/users/me');
      if (!res.success) {
        router.push('/login');
        return;
      }
      setViewer(res.data);
      setViewerLoading(false);
    };
    load();
  }, []);

  const { data: post, isLoading, isError, error } = usePost(id);
  const updateMutation = useUpdatePost(id);

  const handleSubmit = (values: PostFormValues) => {
    updateMutation.mutate(values, {
      onSuccess: () => {
        router.push(`/posts/${id}`);
      },
    });
  };

  if (viewerLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        {viewer && <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />}
        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <PostCardSkeleton />
        </main>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />
        <main className="mx-auto max-w-2xl px-4 py-8 text-center sm:px-6">
          <p className="text-sm font-medium text-red-600">{(error as Error)?.message || 'Post not found.'}</p>
          <Link href="/feed" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline">
            <ArrowLeft size={15} />
            Back to feed
          </Link>
        </main>
      </div>
    );
  }

  const isOwner = post.authorId?._id === viewer._id;
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />
        <main className="mx-auto max-w-2xl px-4 py-8 text-center sm:px-6">
          <p className="text-sm font-medium text-red-600">You don't have permission to edit this post.</p>
          <Link href={`/posts/${id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline">
            <ArrowLeft size={15} />
            Back to post
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href={`/posts/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to post
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Edit Post</h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <PostForm
            defaultValues={{ title: post.title, body: post.body, imageUrl: post.imageUrl || '' }}
            onSubmit={handleSubmit}
            isSubmitting={updateMutation.isPending}
            submitLabel="Save Changes"
            error={updateMutation.isError ? (updateMutation.error as Error).message : null}
            onCancel={() => router.push(`/posts/${id}`)}
          />
        </div>
      </main>
    </div>
  );
}