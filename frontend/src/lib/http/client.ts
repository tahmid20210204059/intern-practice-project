import { getAccessToken, setAccessToken, clearSession, hasSession, notifySessionExpired } from '../auth';
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors: string[];
}
export type ApiResult<T> = ApiSuccess<T> | ApiError;
const NO_REFRESH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh'];
const REFRESH_TIMEOUT_MS = 10000;
let refreshPromise: Promise<boolean> | null = null;
function expireSession() {
  const hadSession = hasSession();
  clearSession();
  if (hadSession) notifySessionExpired();
}
async function readJson<T>(res: Response): Promise<ApiResult<T>> {
  try {
    return await res.json();
  } catch {
    return {
      success: false,
      statusCode: res.status,
      message: res.status === 413 ? 'The request was too large.' : 'Unexpected server response.',
      errors: [],
    };
  }
}
async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
        });
        if (!res.ok) return false;
        const json = await res.json();
        if (json.success && json.data?.access_token) {
          setAccessToken(json.data.access_token);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
export async function apiCall<T = any>(path: string, options: RequestInit = {}, allowRetry = true): Promise<ApiResult<T>> {
  const token = getAccessToken();
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (res.status === 401 && !NO_REFRESH_PATHS.includes(path.split('?')[0])) {
      if (allowRetry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return apiCall<T>(path, options, false);
        }
      }
      expireSession();
    }
    return await readJson<T>(res);
  } catch (error) {
    if (options.signal?.aborted && error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    return { success: false, statusCode: 0, message: 'Network error: could not reach server', errors: [] };
  }
}
export async function apiUpload<T = any>(path: string, formData: FormData, allowRetry = true): Promise<ApiResult<T>> {
  const token = getAccessToken();
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (res.status === 401) {
      if (allowRetry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return apiUpload<T>(path, formData, false);
        }
      }
      expireSession();
    }
    const json: any = await readJson<T>(res);
    if (json?.success && json?.data && json.data.success !== undefined && json.data.data !== undefined) {
      return json.data as ApiResult<T>;
    }
    return json;
  } catch {
    return { success: false, statusCode: 0, message: 'Network error: could not reach server', errors: [] };
  }
}