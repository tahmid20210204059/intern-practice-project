'use client';
import { useMemo, useRef, useState } from 'react';
import { AlertCircle, Search, SearchX, X } from 'lucide-react';
import { useSearchPosts } from '@/features/posts/queries/posts';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { MAX_SEARCH_LENGTH, SEARCH_DEBOUNCE_MS, isSearchableTerm, normalizeSearchTerm } from '@/features/posts/utils/searchTerm';
import type { Post } from '@/features/posts/types';
import PostCard from '@/features/posts/components/PostCard';
import PostCardSkeleton from '@/features/posts/components/PostCardSkeleton';
interface PostSearchProps {
  currentUserId: string;
  currentUserRole: 'user' | 'admin';
}
type SearchView = 'initial' | 'invalid' | 'searching' | 'error' | 'empty' | 'results';
export default function PostSearch({ currentUserId, currentUserRole }: PostSearchProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const liveTerm = normalizeSearchTerm(input);
  const debouncedInput = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);
  const debouncedTerm = normalizeSearchTerm(debouncedInput);
  const activeTerm = liveTerm ? debouncedTerm : '';
  const isDebouncing = liveTerm !== '' && liveTerm !== debouncedTerm;
  const searchable = isSearchableTerm(liveTerm);
  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useSearchPosts(activeTerm);
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
  const totalItems = data?.pages[0]?.pagination.totalItems ?? 0;
  let view: SearchView;
  if (!liveTerm) view = 'initial';
  else if (!searchable) view = 'invalid';
  else if (isDebouncing || isPending) view = 'searching';
  else if (isError && posts.length === 0) view = 'error';
  else if (posts.length === 0) view = 'empty';
  else view = 'results';
  const statusText =
    view === 'searching'
      ? 'Searching'
      : view === 'results'
        ? `${totalItems} ${totalItems === 1 ? 'result' : 'results'} found`
        : view === 'empty' || view === 'invalid'
          ? 'No results found'
          : view === 'error'
            ? 'Search failed'
            : '';
  const handleClear = () => {
    setInput('');
    inputRef.current?.focus();
  };
  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="post-search" className="sr-only">
          Search posts
        </label>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="post-search"
          ref={inputRef}
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setInput('');
          }}
          maxLength={MAX_SEARCH_LENGTH}
          placeholder="Search posts by title or content..."
          autoComplete="off"
          autoFocus
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 [&::-webkit-search-cancel-button]:hidden"
        />
        {input && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </form>
      <p aria-live="polite" className="sr-only">
        {statusText}
      </p>
      <div className="mt-6">
        {view === 'initial' && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
            <Search className="mx-auto text-slate-300" size={28} />
            <p className="mt-3 text-sm font-medium text-slate-500">Search the community</p>
            <p className="mt-1 text-sm text-slate-400">Type a keyword to find posts by title or content.</p>
          </div>
        )}
        {view === 'searching' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Searching...</p>
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        )}
        {(view === 'empty' || view === 'invalid') && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
            <SearchX className="mx-auto text-slate-300" size={28} />
            <p className="mt-3 text-sm font-medium text-slate-500">No posts found for &ldquo;{liveTerm}&rdquo;</p>
            <p className="mt-1 text-sm text-slate-400">
              {view === 'invalid' ? 'Use letters or numbers to search.' : 'Try a different keyword or check the spelling.'}
            </p>
          </div>
        )}
        {view === 'error' && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto text-red-500" size={22} />
            <p className="mt-2 text-sm font-medium text-red-700">{(error as Error)?.message || 'Search failed. Please try again.'}</p>
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
        {view === 'results' && (
          <div>
            <p className="mb-4 text-sm text-slate-500">
              {totalItems} {totalItems === 1 ? 'result' : 'results'} for &ldquo;{activeTerm}&rdquo;
            </p>
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} currentUserId={currentUserId} currentUserRole={currentUserRole} variant="feed" />
              ))}
            </div>
            {isFetchingNextPage && (
              <div className="mt-4">
                <PostCardSkeleton />
              </div>
            )}
            {isError && <p className="mt-4 text-center text-sm text-red-600">{(error as Error)?.message || 'Failed to load more results.'}</p>}
            {hasNextPage && !isFetchingNextPage && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Load more
                </button>
              </div>
            )}
            {!hasNextPage && <p className="mt-6 text-center text-sm text-slate-400">No more results.</p>}
          </div>
        )}
      </div>
    </div>
  );
}