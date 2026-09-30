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
    <div>
      <label htmlFor="feed-sort" className="sr-only">
        Sort feed by
      </label>
      <select
        id="feed-sort"
        value={active}
        onChange={handleChange}
        className="w-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
