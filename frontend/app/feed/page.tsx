'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, PenSquare, RotateCw } from 'lucide-react';
import { apiCall } from '@/lib/api';
import { useFeed } from '@/lib/posts';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';
import PostCardSkeleton from '@/components/PostCardSkeleton';

export default function FeedPage() {
  const router = useRouter();
  const [viewer, setViewer] = useState<any>(null);
  const [viewerLoading, setViewerLoading] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useFeed();

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  const handleRefresh = async () => {
    await refetch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Feed</h1>
            <p className="mt-1 text-sm text-slate-500">See what the community is sharing.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefetching}
              aria-label="Refresh feed"
              title="Refresh feed"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60"
            >
              <RotateCw size={16} className={isRefetching ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/posts/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <PenSquare size={15} />
              New Post
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto text-red-500" size={22} />
            <p className="mt-2 text-sm font-medium text-red-700">{(error as Error)?.message || 'Failed to load the feed.'}</p>
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

        {!isLoading && !isError && posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-500">No posts yet.</p>
            <p className="mt-1 text-sm text-slate-400">Be the first to share something with the community.</p>
            <Link
              href="/posts/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <PenSquare size={15} />
              Create a post
            </Link>
          </div>
        )}

        {!isLoading && !isError && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} currentUserId={viewer._id} currentUserRole={viewer.role} variant="feed" />
            ))}
          </div>
        )}

        <div ref={loadMoreRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="mt-4 space-y-4">
            <PostCardSkeleton />
          </div>
        )}

        {!isLoading && !isError && posts.length > 0 && !hasNextPage && (
          <p className="mt-6 text-center text-sm text-slate-400">You've reached the end of the feed.</p>
        )}
      </main>
    </div>
  );
}