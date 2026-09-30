import { MAX_SEARCH_TERMS, sanitizeSearchQuery } from './search-query.js';
describe('sanitizeSearchQuery', () => {
  it('keeps plain words', () => {
    expect(sanitizeSearchQuery('nestjs testing')).toBe('nestjs testing');
  });
  it('strips quotes, negation and operators', () => {
    expect(sanitizeSearchQuery('"nest js" -react $where')).toBe('nest js react where');
  });
  it('returns an empty string for symbol-only input', () => {
    expect(sanitizeSearchQuery('!!! --- ""')).toBe('');
  });
  it('preserves non-latin letters and combining marks', () => {
    expect(sanitizeSearchQuery('বাংলা কোড')).toBe('বাংলা কোড');
  });
  it('limits the number of terms', () => {
    const many = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
    expect(sanitizeSearchQuery(many).split(' ')).toHaveLength(MAX_SEARCH_TERMS);
  });
});