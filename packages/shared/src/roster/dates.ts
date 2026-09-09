/** Ngày dạng YYYY-MM-DD có thật trên lịch và nằm trong khoảng 1900–2100. */
export function isValidIsoDate(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

const pad = (n: string): string => n.padStart(2, '0');

/**
 * Đọc ngày giáo viên nhập: "15/08/2008", "15-8-2008", "15.08.2008", "2008-08-15"
 * (kể cả ISO có giờ) → "2008-08-15". Không hợp lệ → null.
 */
export function parseDateInput(text: string): string | null {
  const t = text.trim();
  const dmy = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const ymd = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  let iso: string | null = null;
  if (dmy) iso = `${dmy[3]}-${pad(dmy[2] ?? '')}-${pad(dmy[1] ?? '')}`;
  else if (ymd) iso = `${ymd[1]}-${pad(ymd[2] ?? '')}-${pad(ymd[3] ?? '')}`;
  return iso && isValidIsoDate(iso) ? iso : null;
}

/** "2008-08-15" → "15/08/2008" để hiển thị. */
export function formatDateVi(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
