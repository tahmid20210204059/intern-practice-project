'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, PenSquare } from 'lucide-react';
import { apiCall } from '@/lib/http/client';
import { useFeed, setSeenPostId } from '@/features/posts/queries/posts';
import { FEED_SORT_PARAM, isFeedSort, parseFeedSort } from '@/features/posts/constants';
import type { Post } from '@/features/posts/types';
import Navbar from '@/components/layout/Navbar';
import PostCard from '@/features/posts/components/PostCard';
import PostCardSkeleton from '@/features/posts/components/PostCardSkeleton';
import FeedTabs from '@/features/posts/components/FeedTabs';

function FeedLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm font-medium text-slate-500">Loading...</p>
    </div>
  );
}

function FeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSort = searchParams.get(FEED_SORT_PARAM);
  const sort = parseFeedSort(rawSort);
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

  useEffect(() => {
    if (rawSort !== null && !isFeedSort(rawSort)) {
      router.replace('/feed');
    }
  }, [rawSort, router]);

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
  } = useFeed(sort);

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

  const posts = useMemo(() => {
    const seen = new Set<string>();
    const list: Post[] = [];
    for (const page of data?.pages ?? []) {
      for (const post of page.items) {
        if (!seen.has(post._id)) {
          seen.add(post._id);
          list.push(post);
        }
      }
    }
    return list;
  }, [data]);

  useEffect(() => {
    if (sort === 'latest' && posts.length > 0) {
      setSeenPostId(posts[0]._id);
    }
  }, [posts, sort]);

  if (viewerLoading) {
    return <FeedLoading />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Feed</h1>
          <FeedTabs active={sort} />
        </div>
        <Link href="/posts/new" className="mb-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50">
          {viewer.avatarUrl ? (
            <img src={viewer.avatarUrl} alt={viewer.name} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{viewer.name.charAt(0).toUpperCase()}</span>
          )}
          <span className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-left text-sm text-slate-500">What&apos;s on your mind?</span>
        </Link>

        {isLoading && (
          <div className="space-y-3">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-center">
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
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-500">No posts yet.</p>
            <p className="mt-1 text-sm text-slate-400">Be the first to share something with the community.</p>
            <Link
              href="/posts/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              <PenSquare size={15} />
              Create a post
            </Link>
          </div>
        )}

        {!isLoading && !isError && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} currentUserId={viewer._id} currentUserRole={viewer.role} variant="feed" />
            ))}
          </div>
        )}

        <div ref={loadMoreRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="mt-4 space-y-3">
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

export default function FeedPage() {
  return (
    <Suspense fallback={<FeedLoading />}>
      <FeedContent />
    </Suspense>
  );
}
