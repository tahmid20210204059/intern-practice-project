import { describe, expect, it, vi } from 'vitest';
import { apiCall } from '@/lib/http/client';
import { SummarizeError, summarizePostRequest } from '@/features/posts/mutations/posts';
import { fail, ok } from '@/test/utils';

vi.mock('@/lib/http/client', () => ({ apiCall: vi.fn(), apiUpload: vi.fn() }));
const apiCallMock = vi.mocked(apiCall);

describe('SummarizeError', () => {
  it.each([
    [0, true], [408, true], [429, true], [500, true], [502, true], [503, true], [504, true],
    [400, false], [404, false], [422, false],
  ])('status %i retryable=%s', (status, retryable) => {
    expect(new SummarizeError('x', status).retryable).toBe(retryable);
  });
});

describe('summarizePostRequest', () => {
  it('posts to the summarize endpoint and parses the result', async () => {
    apiCallMock.mockResolvedValue(ok({ summary: 'Short', tags: ['api'], source: 'model', truncated: false }));

    const result = await summarizePostRequest('p1');

    expect(result).toEqual({ summary: 'Short', tags: ['api'], source: 'model', truncated: false });
    expect(apiCallMock.mock.calls[0][0]).toBe('/posts/p1/summarize');
    expect(apiCallMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('maps a non-retryable failure', async () => {
    apiCallMock.mockResolvedValue(fail('Too short to summarize', 422));
    await expect(summarizePostRequest('p1')).rejects.toMatchObject({ name: 'SummarizeError', statusCode: 422, retryable: false, message: 'Too short to summarize' });
  });

  it('maps a retryable failure and strips control characters from the message', async () => {
    apiCallMock.mockResolvedValue(fail('Slow\u0007 down', 429));
    await expect(summarizePostRequest('p1')).rejects.toMatchObject({ statusCode: 429, retryable: true, message: 'Slow down' });
  });

  it('falls back to a generic message', async () => {
    apiCallMock.mockResolvedValue(fail('', 500));
    await expect(summarizePostRequest('p1')).rejects.toMatchObject({ message: 'Could not summarize this post.' });
  });

  it('treats an unreadable payload as a retryable 502', async () => {
    apiCallMock.mockResolvedValue(ok({ nope: true }));
    await expect(summarizePostRequest('p1')).rejects.toMatchObject({ statusCode: 502, retryable: true });
  });
});
