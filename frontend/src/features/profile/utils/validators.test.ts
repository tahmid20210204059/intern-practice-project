import { describe, expect, it } from 'vitest';
import { getPasswordError, isValidLinkUrl } from './validators';
import { formatMonth } from './dateUtils';
import { isValidEmail } from '@/lib/validators';

describe('getPasswordError', () => {
  it('requires a password', () => {
    expect(getPasswordError('')).toBe('Password is required.');
  });

  it.each(['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere'])('rejects %s', (password) => {
    expect(getPasswordError(password)).toMatch(/^Password must be at least 8 characters/);
  });

  it('accepts a strong password', () => {
    expect(getPasswordError('Password1')).toBeNull();
  });
});

describe('isValidLinkUrl', () => {
  it.each([undefined, null, ''])('treats %s as valid (optional field)', (value) => {
    expect(isValidLinkUrl('github', value)).toBe(true);
  });

  it('requires an http(s) scheme', () => {
    expect(isValidLinkUrl('github', 'github.com/a')).toBe(false);
    expect(isValidLinkUrl('portfolio', 'javascript:alert(1)')).toBe(false);
    expect(isValidLinkUrl('portfolio', 'ftp://x.io')).toBe(false);
  });

  it('accepts any http(s) url for portfolio', () => {
    expect(isValidLinkUrl('portfolio', 'https://my.site/path')).toBe(true);
    expect(isValidLinkUrl('portfolio', 'http://my.site')).toBe(true);
  });

  it('accepts only the platform hosts', () => {
    expect(isValidLinkUrl('github', 'https://github.com/a')).toBe(true);
    expect(isValidLinkUrl('github', 'https://www.github.com/a')).toBe(true);
    expect(isValidLinkUrl('linkedin', 'https://www.linkedin.com/in/a')).toBe(true);
    expect(isValidLinkUrl('facebook', 'https://fb.com/a')).toBe(true);
  });

  it('rejects look-alike hosts', () => {
    expect(isValidLinkUrl('github', 'https://evilgithub.com/a')).toBe(false);
    expect(isValidLinkUrl('github', 'https://github.com.evil.io/a')).toBe(false);
    expect(isValidLinkUrl('linkedin', 'https://github.com/a')).toBe(false);
  });
});

describe('formatMonth', () => {
  it('formats a month and treats empty as present', () => {
    expect(formatMonth('2024-03')).toBe('Mar 2024');
    expect(formatMonth('')).toBe('Present');
  });
});

describe('isValidEmail', () => {
  it('accepts plain emails and rejects malformed ones', () => {
    expect(isValidEmail(' a@b.co ')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
