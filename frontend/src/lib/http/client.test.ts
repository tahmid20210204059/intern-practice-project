import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { apiCall, apiUpload } from '@/lib/http/client';
import { getAccessToken, getStoredUser, saveSession, setAccessToken } from '@/lib/auth';

const fetchMock = vi.fn();

const response = (status: number, body: unknown) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => body }) as unknown as Response;

const unauthorized = () => response(401, { success: false, statusCode: 401, message: 'Unauthorized', errors: [] });
const refreshOk = (token = 'new-token') => response(200, { success: true, data: { access_token: token } });
const authHeader = (init: any) => init?.headers?.Authorization;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiCall', () => {
  it('sends the bearer token with credentials to the configured API url', async () => {
    setAccessToken('abc');
    fetchMock.mockResolvedValue(response(200, { success: true, data: { ok: 1 } }));

    const result = await apiCall('/users/me');

    expect(result).toEqual({ success: true, data: { ok: 1 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/users/me');
    expect(init.credentials).toBe('include');
    expect(init.headers.Authorization).toBe('Bearer abc');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('omits the Authorization header when there is no token', async () => {
    fetchMock.mockResolvedValue(response(200, { success: true, data: null }));
    await apiCall('/health');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    setAccessToken('expired');
    fetchMock.mockImplementation(async (url: string, init: any) => {
      if (url.endsWith('/auth/refresh')) return refreshOk('fresh');
      return authHeader(init) === 'Bearer fresh' ? response(200, { success: true, data: 'secret' }) : unauthorized();
    });

    const result = await apiCall('/users/me');

    expect(result).toEqual({ success: true, data: 'secret' });
    expect(getAccessToken()).toBe('fresh');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('http://api.test/auth/refresh');
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
  });

  it('clears the session when the refresh fails', async () => {
    saveSession('old', { id: '1' });
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/auth/refresh') ? response(401, {}) : unauthorized()));

    const result = await apiCall('/users/me');

    expect(result).toMatchObject({ success: false, statusCode: 401 });
    expect(getAccessToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('does not refresh for login, signup or refresh paths', async () => {
    fetchMock.mockResolvedValue(unauthorized());
    const result = await apiCall('/auth/login', { method: 'POST' });
    expect(result).toMatchObject({ success: false, statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not loop when the retried request is still unauthorized', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/auth/refresh') ? refreshOk() : unauthorized()));

    const result = await apiCall('/users/me');

    expect(result).toMatchObject({ success: false, statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('shares a single refresh between concurrent 401 responses', async () => {
    let refreshCalls = 0;
    fetchMock.mockImplementation(async (url: string, init: any) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return refreshOk('fresh');
      }
      return authHeader(init) === 'Bearer fresh' ? response(200, { success: true, data: url }) : unauthorized();
    });

    const [a, b] = await Promise.all([apiCall('/a'), apiCall('/b')]);

    expect(refreshCalls).toBe(1);
    expect(a).toEqual({ success: true, data: 'http://api.test/a' });
    expect(b).toEqual({ success: true, data: 'http://api.test/b' });
  });

  it('returns a network error result when fetch fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await apiCall('/users/me')).toEqual({
      success: false,
      statusCode: 0,
      message: 'Network error: could not reach server',
      errors: [],
    });
  });

  it('rethrows an abort so callers can cancel', async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValue(new DOMException('aborted', 'AbortError'));
    await expect(apiCall('/slow', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('apiUpload', () => {
  it('posts form data without forcing a content type', async () => {
    setAccessToken('abc');
    fetchMock.mockResolvedValue(response(200, { success: true, data: { url: 'u' } }));
    const form = new FormData();
    form.append('file', new File(['x'], 'a.png', { type: 'image/png' }));

    const result = await apiUpload('/uploads/avatar', form);

    expect(result).toEqual({ success: true, data: { url: 'u' } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(form);
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer abc');
  });

  it('unwraps a double-wrapped success response', async () => {
    fetchMock.mockResolvedValue(response(200, { success: true, data: { success: true, data: { url: 'inner' } } }));
    expect(await apiUpload('/uploads/avatar', new FormData())).toEqual({ success: true, data: { url: 'inner' } });
  });

  it('refreshes and retries on 401', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(refreshOk())
      .mockResolvedValueOnce(response(200, { success: true, data: { url: 'u' } }));

    expect(await apiUpload('/uploads/avatar', new FormData())).toEqual({ success: true, data: { url: 'u' } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns a network error result on failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('x'));
    expect(await apiUpload('/uploads/avatar', new FormData())).toMatchObject({ success: false, statusCode: 0 });
  });
});
