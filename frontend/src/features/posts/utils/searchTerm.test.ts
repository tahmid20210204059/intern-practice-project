import { describe, expect, it } from 'vitest';
import { MAX_SEARCH_LENGTH, isSearchableTerm, normalizeSearchTerm } from './searchTerm';

describe('normalizeSearchTerm', () => {
  it('trims, collapses whitespace and lowercases', () => {
    expect(normalizeSearchTerm('  NestJS   Testing ')).toBe('nestjs testing');
  });

  it('caps the length', () => {
    expect(normalizeSearchTerm('a'.repeat(MAX_SEARCH_LENGTH + 20))).toHaveLength(MAX_SEARCH_LENGTH);
  });
});

describe('isSearchableTerm', () => {
  it.each([['react', true], ['বাংলা', true], ['123', true], ['!!!', false], ['   ', false], ['', false], ['-"$', false]])('%s -> %s', (term, expected) => {
    expect(isSearchableTerm(term as string)).toBe(expected);
  });
});
