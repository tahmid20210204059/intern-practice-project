'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiCall } from '@/lib/api';
import { useCreatePost } from '@/lib/posts';
import Navbar from '@/components/Navbar';
import PostForm from '@/components/PostForm';
import type { PostFormValues } from '@/lib/schemas';

export default function NewPostPage() {
  const router = useRouter();
  const [viewer, setViewer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const createMutation = useCreatePost();

  useEffect(() => {
    const load = async () => {
      const res = await apiCall('/users/me');
      if (!res.success) {
        router.push('/login');
        return;
      }
      setViewer(res.data);
      setLoading(false);
    };
    load();
  }, []);

  const handleSubmit = (values: PostFormValues) => {
    createMutation.mutate(values, {
      onSuccess: (post) => {
        router.push(`/posts/${post._id}`);
      },
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/feed" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to feed
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Create Post</h1>
          <p className="mt-1 text-sm text-slate-500">Share an update, question, or resource with the community.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <PostForm
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending}
            submitLabel="Publish Post"
            error={createMutation.isError ? (createMutation.error as Error).message : null}
          />
        </div>
      </main>
    </div>
  );
}