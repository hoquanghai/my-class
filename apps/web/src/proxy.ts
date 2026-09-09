import { type NextRequest, NextResponse } from 'next/server';
import { STUDENT_HOST, STUDENT_ORIGIN } from '@/lib/student-origin';

/** Cookie gợi ý phiên (không httpOnly) do API đặt khi đăng nhập, xóa khi đăng xuất. */
const SESSION_HINT_COOKIE = 'lh_session';

/**
 * Mã lớp: đúng 6 ký tự trong bảng ABCDEFGHJKMNPQRSTUVWXYZ23456789 (packages/shared class-code).
 * Bảng không có I, L, O, 0, 1 nên các đường dẫn như /login, /signup không bị nhận nhầm là mã.
 */
const CLASS_CODE_PATH = /^\/([abcdefghjkmnpqrstuvwxyz23456789]{6})$/i;

/** Đường dẫn được phép trên host học sinh. */
const STUDENT_ALLOWED = [/^\/join(\/|$)/, /^\/s$/, /^\/terms$/, /^\/privacy$/];

function isStudentHost(request: NextRequest): boolean {
  const host = request.headers.get('host') ?? '';
  return host.toLowerCase() === STUDENT_HOST.toLowerCase();
}

/**
 * Định tuyến theo host:
 * - Host học sinh: `/` → trang nhập mã, `/ABC123` → chọn tên, mọi trang giáo viên bị đẩy về `/`.
 * - Host giáo viên: `/join*` và `/s` chuyển sang host học sinh (mã QR cũ vẫn dùng được);
 *   `/app/*` cần cookie phiên.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStudentHost(request)) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/join', request.url));
    }
    const code = pathname.match(CLASS_CODE_PATH)?.[1];
    if (code) {
      return NextResponse.rewrite(new URL(`/join/${code.toUpperCase()}`, request.url));
    }
    if (STUDENT_ALLOWED.some((re) => re.test(pathname))) return NextResponse.next();
    // request.url mang host nội bộ của server, nên chuyển hướng bằng origin học sinh đã cấu hình
    return NextResponse.redirect(`${STUDENT_ORIGIN}/`);
  }

  if (pathname === '/s' || pathname.startsWith('/join')) {
    return NextResponse.redirect(`${STUDENT_ORIGIN}${pathname}${search}`, 308);
  }

  if (pathname.startsWith('/app')) {
    if (request.cookies.has(SESSION_HINT_COOKIE)) return NextResponse.next();
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname + search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|img/|favicon.ico|robots.txt).*)'],
};
