import type { FeedSort } from './types';
export const FEED_SORT_PARAM = 'sort';
export const DEFAULT_FEED_SORT: FeedSort = 'latest';
export const FEED_SORT_OPTIONS: { value: FeedSort; label: string }[] = [
  { value: 'ranked', label: 'Top' },
  { value: 'latest', label: 'Latest' },
  { value: 'discussed', label: 'Most Discussed' },
];
export const FEED_SORTS: string[] = FEED_SORT_OPTIONS.map((option) => option.value);
export function isFeedSort(value: string | null | undefined): value is FeedSort {
  return !!value && FEED_SORTS.includes(value);
}
export function parseFeedSort(value: string | null | undefined): FeedSort {
  return isFeedSort(value) ? value : DEFAULT_FEED_SORT;
}
export function feedSortHref(sort: FeedSort): string {
  return sort === DEFAULT_FEED_SORT ? '/feed' : `/feed?${FEED_SORT_PARAM}=${sort}`;
}