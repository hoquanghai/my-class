import { stripDiacritics } from '../text/normalize.js';

const norm = (s: string): string => stripDiacritics(s).toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Dòng "râu ria" thường gặp trong đề (so khớp sau khi bỏ dấu, chữ thường):
 * đầu trang hành chính, tên trường/trung tâm/giáo viên, tiêu đề phần/chương, chân trang, website.
 */
const NOISE_PATTERNS: RegExp[] = [
  // Đầu trang hành chính
  /^ho va ten/,
  /^ho ten/,
  /^ma (de|mon|so)/,
  /^de so/,
  /^so bao danh/,
  /^sbd\b/,
  /^lop\s*[:.]/,
  /^lop\s*[:.]?\s*\d{1,2}[a-z]{0,2}\d{0,2}$/,
  /^khoi\s*[:.]?\s*\d/,
  /^so giao duc/,
  /^so gd/,
  /^phong giao duc/,
  /^phong gd/,
  /^bo giao duc/,
  /^ubnd\b/,
  /^truong\b/,
  /^(trung tam|tt)\b/,
  /^(gv|giao vien|giang vien|teacher|thay|co)\s*[:.]/,
  /^(bien soan|nguoi soan|soan boi|tac gia|suu tam|tong hop)\b/,
  /^(de|bai) (kiem tra|thi|on tap|cuong|luyen|minh hoa|tham khao|chinh thuc)/,
  /^kiem tra (\d+ phut|giua|cuoi|hoc ki|hoc ky|thuong xuyen|dinh ki)/,
  /^ky thi\b/,
  /^thoi gian( lam bai)?/,
  /^nam hoc/,
  /^hoc (ki|ky)\b/,
  /^mon\s*[:.]/,
  /^mon (thi|hoc)\b/,
  /^ngay (thi|kiem tra)/,
  /^diem\s*[:.]?$/,
  /^diem\b.*loi phe/,
  /^(chu ky|ky ten|giam thi|can bo coi thi|nguoi cham)/,
  /^(thi sinh|hoc sinh) (khong |duoc )?(duoc )?su dung/,
  // Tiêu đề phần
  /^(phan|part)\s+[ivx\d]+\s*[:.]?\s*(trac nghiem|tu luan)?$/,
  /^(i|ii|iii|iv)\s*[.)]\s*(phan\s+)?(trac nghiem|tu luan)/,
  /^(trac nghiem|tu luan)( khach quan)?\s*[:.]?$/,
  /^loi giai chi tiet/,
  /^huong dan (giai|cham)/,
  // Chân trang, liên hệ
  /^trang\s*\d+/,
  /^page\s*\d+/,
  /^\d{1,3}\s*\/\s*\d{1,3}$/,
  /^-{3,}$|^_{3,}$|^={3,}$|^\.{3,}$/,
  /^-*\s*het\s*-*$/,
  /^(website|web|fanpage|facebook|zalo|hotline|email|sdt|dien thoai|tel)\s*[:.]/,
  /^https?:\/\//,
  /^(www\.)?[a-z0-9-]+\.(com|vn|net|org|edu|info)(\/\S*)?$/,
  /^(tai lieu|nguon)\s*[:.]/,
];

/** "PHẦN I", "Chương 2:", "Chủ đề 3", "Chuyên đề 1", "Mục II", "Dạng 2", "Tiết 5". */
const SECTION_HEADER =
  /^(phan|part|chuong|chapter|muc|chu de|chuyen de|dang|tiet|unit|section)\s+[ivxlc\d]+\b/;
const BAI_HEADER = /^bai\s+\d{1,3}\b/;
const QUESTION_START = /^(cau|question)\s*\d/;
const OPTION_LIKE = /^\*?\(?[a-h]\s*[.)]/;

/** Tỷ lệ chữ hoa trong các chữ cái của dòng; tiêu đề thường viết hoa toàn bộ. */
export function upperRatio(text: string): number {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return 0;
  const upper = letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length;
  return upper / letters.length;
}

/** Dòng viết hoa toàn bộ, đủ dài, không có công thức, không kết thúc bằng dấu hỏi: tiêu đề. */
export function isAllCapsTitle(text: string): boolean {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  return letters >= 6 && upperRatio(text) >= 0.9 && !text.includes('$') && !/\?\s*$/.test(text);
}

/**
 * Dòng nhiễu: không phải đề bài hay phương án. Dùng cho parser văn bản/Word và
 * để lọc kết quả AI. "Bài N." chỉ bị coi là tiêu đề khi viết hoa toàn bộ
 * ("BÀI 5. ỨNG DỤNG ĐẠO HÀM…"); "Bài 1. Giải phương trình…" vẫn là câu hỏi.
 */
export function isNoiseLine(text: string): boolean {
  const plain = text.replace(/\*\*|__/g, '');
  const n = norm(plain);
  if (n === '') return true;
  if (NOISE_PATTERNS.some((re) => re.test(n))) return true;
  if (SECTION_HEADER.test(n)) return true;
  if (BAI_HEADER.test(n)) return isAllCapsTitle(plain);
  if (QUESTION_START.test(n) || OPTION_LIKE.test(n)) return false;
  return isAllCapsTitle(plain);
}

const QUESTION_LABEL = /^\s*(?:c[âa]u|b[àa]i|question)\s*\d{1,3}\s*[:.)\-–]*\s*/iu;

/**
 * Làm sạch đề bài do AI trả về: bỏ các dòng nhiễu ở đầu/cuối (tiêu đề phần, chân trang)
 * và nhãn "Câu N." đứng đầu. Dòng nhiễu nằm giữa đề bài được giữ nguyên.
 */
export function stripStemNoise(stem: string): string {
  const lines = stem.split(/\r?\n/);
  let start = 0;
  while (start < lines.length && isNoiseLine(lines[start] as string)) start++;
  let end = lines.length;
  while (end > start && isNoiseLine(lines[end - 1] as string)) end--;
  const kept = lines.slice(start, end);
  if (kept.length === 0) return '';
  kept[0] = (kept[0] as string).replace(QUESTION_LABEL, '');
  return kept.join('\n').trim();
}
