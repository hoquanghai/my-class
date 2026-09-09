/**
 * Phần học sinh chạy trên sub-domain riêng (dev: hs.localhost:3000, prod: ví dụ hs.lophoc.app)
 * để học sinh không thấy trang giáo viên. Đường dẫn vào lớp ngắn: `${STUDENT_ORIGIN}/<mã lớp>`.
 */
export const STUDENT_ORIGIN = (
  process.env.NEXT_PUBLIC_STUDENT_ORIGIN ?? 'http://hs.localhost:3000'
).replace(/\/$/, '');

export const STUDENT_HOST = new URL(STUDENT_ORIGIN).host;

export function studentJoinUrl(code: string): string {
  return `${STUDENT_ORIGIN}/${code}`;
}

/** Hiển thị gọn cho học sinh chép tay: bỏ giao thức. */
export function studentJoinDisplay(code: string): string {
  return `${STUDENT_HOST}/${code}`;
}
