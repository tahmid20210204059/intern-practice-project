export const SEARCH_DEBOUNCE_MS = 300;
export const MAX_SEARCH_LENGTH = 100;
const SEARCHABLE_CHAR = new RegExp('[\\p{L}\\p{N}]', 'u');
export function normalizeSearchTerm(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, MAX_SEARCH_LENGTH);
}
export function isSearchableTerm(term: string): boolean {
  return SEARCHABLE_CHAR.test(term);
}