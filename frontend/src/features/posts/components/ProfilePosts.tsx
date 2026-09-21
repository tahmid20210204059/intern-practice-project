'use client';
import { useEffect, useMemo, useRef } from 'react';
import { FileText } from 'lucide-react';
import { useUserPosts } from '@/features/posts/queries/posts';
import PostCard from '@/features/posts/components/PostCard';
import PostCardSkeleton from '@/features/posts/components/PostCardSkeleton';

interface ProfilePostsProps {
  profileId: string;
  currentUserId: string;
  currentUserRole: 'user' | 'admin';
  isOwnProfile: boolean;
}

export default function ProfilePosts({ profileId, currentUserId, currentUserRole, isOwnProfile }: ProfilePostsProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
  } = useUserPosts(profileId);

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">{(error as Error)?.message || 'Failed to load posts.'}</p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isRefetching ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
        <FileText className="mx-auto text-slate-300" size={28} />
        <p className="mt-3 text-sm font-medium text-slate-500">
          {isOwnProfile ? "You haven't posted anything yet." : 'No posts yet.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} currentUserId={currentUserId} currentUserRole={currentUserRole} variant="feed" />
        ))}
      </div>

      <div ref={loadMoreRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="mt-4">
          <PostCardSkeleton />
        </div>
      )}

      {!hasNextPage && <p className="mt-6 text-center text-sm text-slate-400">No more posts to show.</p>}
    </div>
  );
}
