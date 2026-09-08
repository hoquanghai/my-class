import type { CookieOptions, Request, Response } from 'express';

export const ACCESS_COOKIE = 'lh_at';
export const REFRESH_COOKIE = 'lh_rt';
export const OAUTH_STATE_COOKIE = 'lh_oauth_state';

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 30 * 24 * 60 * 60;
export const OAUTH_STATE_TTL_SEC = 10 * 60;

/** Refresh token chỉ gửi kèm các route auth (refresh/logout), giảm bề mặt lộ token. */
export const AUTH_COOKIE_PATH = '/api/auth';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

export function setAuthCookies(res: Response, tokens: AuthTokens, secure: boolean): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(secure),
    maxAge: ACCESS_TTL_SEC * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(secure),
    path: AUTH_COOKIE_PATH,
    maxAge: REFRESH_TTL_SEC * 1000,
  });
}

export function clearAuthCookies(res: Response, secure: boolean): void {
  res.clearCookie(ACCESS_COOKIE, baseOptions(secure));
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(secure), path: AUTH_COOKIE_PATH });
}

export function setOAuthStateCookie(res: Response, state: string, secure: boolean): void {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    ...baseOptions(secure),
    path: AUTH_COOKIE_PATH,
    maxAge: OAUTH_STATE_TTL_SEC * 1000,
  });
}

export function clearOAuthStateCookie(res: Response, secure: boolean): void {
  res.clearCookie(OAUTH_STATE_COOKIE, { ...baseOptions(secure), path: AUTH_COOKIE_PATH });
}

export function readCookie(req: Request, name: string): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[name];
}

export function readBearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const [type, token] = header.split(' ');
  return type === 'Bearer' && token ? token : undefined;
}
