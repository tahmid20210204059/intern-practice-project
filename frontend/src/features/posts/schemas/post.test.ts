import { describe, expect, it } from 'vitest';
import { postSchema } from './post';

const messages = (value: unknown) => {
  const result = postSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('postSchema', () => {
  it('trims fields and defaults imageUrl to an empty string', () => {
    const result = postSchema.safeParse({ title: '  Hello  ', body: '  World  ' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ title: 'Hello', body: 'World', imageUrl: '' });
  });

  it('keeps a provided image url', () => {
    expect(postSchema.parse({ title: 'T', body: 'B', imageUrl: 'https://x.io/a.png' }).imageUrl).toBe('https://x.io/a.png');
  });

  it('rejects empty and whitespace-only title and body', () => {
    expect(messages({ title: '   ', body: '' })).toEqual(expect.arrayContaining(['Title is required', 'Body is required']));
  });

  it('enforces the 150 and 5000 character limits', () => {
    expect(messages({ title: 'a'.repeat(151), body: 'b' })).toContain('Title must be 150 characters or fewer');
    expect(messages({ title: 'a', body: 'b'.repeat(5001) })).toContain('Body must be 5000 characters or fewer');
    expect(messages({ title: 'a'.repeat(150), body: 'b'.repeat(5000) })).toEqual([]);
  });
});
