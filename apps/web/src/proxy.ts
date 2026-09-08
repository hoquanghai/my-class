import { type NextRequest, NextResponse } from 'next/server';

/** Cookie gợi ý phiên (không httpOnly) do API đặt khi đăng nhập, xóa khi đăng xuất. */
const SESSION_HINT_COOKIE = 'lh_session';

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_HINT_COOKIE)) return NextResponse.next();

  const login = new URL('/login', request.url);
  login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/app/:path*'],
};
