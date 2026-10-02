import { describe, expect, it } from 'vitest';
import { DEFAULT_FEED_SORT, feedSortHref, isFeedSort, parseFeedSort } from './constants';

describe('feed sort helpers', () => {
  it('recognizes valid sorts only', () => {
    expect(isFeedSort('ranked')).toBe(true);
    expect(isFeedSort('latest')).toBe(true);
    expect(isFeedSort('discussed')).toBe(true);
    expect(isFeedSort('random')).toBe(false);
    expect(isFeedSort(null)).toBe(false);
    expect(isFeedSort(undefined)).toBe(false);
  });

  it('falls back to latest for invalid input', () => {
    expect(DEFAULT_FEED_SORT).toBe('latest');
    expect(parseFeedSort('bogus')).toBe('latest');
    expect(parseFeedSort(null)).toBe('latest');
    expect(parseFeedSort('ranked')).toBe('ranked');
  });

  it('builds hrefs with the default sort omitted', () => {
    expect(feedSortHref('latest')).toBe('/feed');
    expect(feedSortHref('ranked')).toBe('/feed?sort=ranked');
    expect(feedSortHref('discussed')).toBe('/feed?sort=discussed');
  });
});
