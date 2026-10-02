import { describe, expect, it } from 'vitest';
import { cleanUntrustedText, parseSummaryResponse } from './untrustedText';

describe('cleanUntrustedText', () => {
  it('returns an empty string for non-strings', () => {
    expect(cleanUntrustedText(42, 10)).toBe('');
    expect(cleanUntrustedText(null, 10)).toBe('');
    expect(cleanUntrustedText({}, 10)).toBe('');
  });

  it('removes control and bidirectional override characters', () => {
    expect(cleanUntrustedText('a\u0007b\u202Ec\u200Bd', 50)).toBe('abcd');
  });

  it('collapses whitespace and truncates', () => {
    expect(cleanUntrustedText('  a \n\n  b   c  ', 50)).toBe('a b c');
    expect(cleanUntrustedText('abcdefghij', 4)).toBe('abcd');
  });
});

describe('parseSummaryResponse', () => {
  it.each([null, undefined, 'text', 5, [], { summary: '' }, { summary: '   ' }, { tags: ['a'] }])('rejects %j', (value) => {
    expect(parseSummaryResponse(value)).toBeNull();
  });

  it('normalizes a valid response', () => {
    expect(parseSummaryResponse({ summary: ' Short\n summary ', tags: ['NestJS', 'nestjs', ' api ', '', 5], source: 'model', truncated: true })).toEqual({
      summary: 'Short summary',
      tags: ['NestJS', 'api'],
      source: 'model',
      truncated: true,
    });
  });

  it('defaults to mock source and untruncated', () => {
    expect(parseSummaryResponse({ summary: 'x', tags: 'nope', source: 'other', truncated: 'true' })).toEqual({
      summary: 'x',
      tags: [],
      source: 'mock',
      truncated: false,
    });
  });

  it('caps tags at 8, each at 30 characters, and the summary at 600', () => {
    const tags = Array.from({ length: 12 }, (_, i) => `tag${i}`);
    const parsed = parseSummaryResponse({ summary: 'a'.repeat(700), tags: [...tags, 'z'.repeat(40)] });
    expect(parsed?.tags).toHaveLength(8);
    expect(parsed?.summary).toHaveLength(600);
    expect(parseSummaryResponse({ summary: 'x', tags: ['z'.repeat(40)] })?.tags[0]).toHaveLength(30);
  });
});
