'use client';
import { useRouter } from 'next/navigation';
import { FEED_SORT_OPTIONS, feedSortHref } from '@/features/posts/constants';
import type { FeedSort } from '@/features/posts/types';

interface FeedTabsProps {
  active: FeedSort;
}

export default function FeedTabs({ active }: FeedTabsProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as FeedSort;
    router.push(feedSortHref(value), { scroll: false });
  };

  return (
    <div className="mb-5">
      <label htmlFor="feed-sort" className="sr-only">
        Sort feed by
      </label>
      <select
        id="feed-sort"
        value={active}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-56"
      >
        {FEED_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}