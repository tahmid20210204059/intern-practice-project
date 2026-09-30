export const MAX_SEARCH_TERMS = 10;
export function sanitizeSearchQuery(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, MAX_SEARCH_TERMS)
    .join(' ');
}