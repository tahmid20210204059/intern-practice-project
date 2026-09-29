'use client';
import Link from 'next/link';
import { FEED_SORT_OPTIONS, feedSortHref } from '@/features/posts/constants';
import type { FeedSort } from '@/features/posts/types';

interface FeedTabsProps {
  active: FeedSort;
}

export default function FeedTabs({ active }: FeedTabsProps) {
  return (
    <nav aria-label="Feed filters" className="mb-5 flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
      {FEED_SORT_OPTIONS.map((option) => {
        const isActive = option.value === active;
        return (
          <Link
            key={option.value}
            href={feedSortHref(option.value)}
            scroll={false}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
              isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}