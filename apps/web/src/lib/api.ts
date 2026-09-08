import type { ApiErrorBody } from '@lophoc/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
  /** Tự gọi /auth/refresh một lần khi gặp 401 rồi thử lại. */
  retryOn401?: boolean;
}

const NO_REFRESH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout'];

let refreshInFlight: Promise<boolean> | null = null;

/** Gọi refresh một lần cho nhiều request 401 đồng thời. */
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export function apiUrl(path: string): string {
  return `${API_URL}/api${path}`;
}

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, formData, signal, retryOn401 = true } = opts;
  const res = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    signal,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (
    res.status === 401 &&
    retryOn401 &&
    !NO_REFRESH_PATHS.some((p) => path.startsWith(p)) &&
    (await refreshSession())
  ) {
    return apiFetch<T>(path, { ...opts, retryOn401: false });
  }

  if (!res.ok) {
    let parsed: Partial<ApiErrorBody> = {};
    try {
      parsed = (await res.json()) as Partial<ApiErrorBody>;
    } catch {
      // body rỗng hoặc không phải JSON
    }
    throw new ApiError(res.status, parsed.code, parsed.message ?? `Lỗi ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Có lỗi xảy ra, vui lòng thử lại';
}
