/**
 * Trang cần quay lại sau khi đăng nhập/đăng ký (`?next=`). Chỉ nhận đường dẫn nội bộ để không
 * thành open redirect; mặc định về danh sách lớp.
 */
export function safeNext(next: string | null | undefined, fallback = '/app/classes'): string {
  if (!next || next.length > 300) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

/** Gắn `?next=` vào link đăng nhập/đăng ký khi có trang cần quay lại. */
export function withNext(href: string, next: string | null | undefined): string {
  return next ? `${href}?next=${encodeURIComponent(next)}` : href;
}
