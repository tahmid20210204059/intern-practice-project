'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiCall } from '@/lib/http/client';
import { usePost } from '@/features/posts/queries/posts';
import Navbar from '@/components/layout/Navbar';
import PostCard from '@/features/posts/components/PostCard';
import PostCardSkeleton from '@/features/posts/components/PostCardSkeleton';

export default function PostDetailPage() {
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

  const { data: post, isLoading, isError, error, refetch, isRefetching } = usePost(id);

  if (viewerLoading) {
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

        {isLoading && <PostCardSkeleton />}

        {isError && !isLoading && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-700">{(error as Error)?.message || 'Failed to load this post.'}</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isRefetching ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {post && (
          <PostCard
            post={post}
            currentUserId={viewer._id}
            currentUserRole={viewer.role}
            variant="detail"
            onDeleted={() => router.push('/feed')}
          />
        )}
      </main>
    </div>
  );
}
