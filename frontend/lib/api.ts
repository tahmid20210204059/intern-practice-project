import { getAccessToken, setAccessToken, clearSession } from './auth';

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

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
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

    if (res.status === 401 && allowRetry && !NO_REFRESH_PATHS.includes(path)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiCall<T>(path, options, false);
      }
      clearSession();
    }

    return await res.json();
  } catch {
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

    if (res.status === 401 && allowRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiUpload<T>(path, formData, false);
      }
      clearSession();
    }

    return await res.json();
  } catch {
    return { success: false, statusCode: 0, message: 'Network error: could not reach server', errors: [] };
  }
}