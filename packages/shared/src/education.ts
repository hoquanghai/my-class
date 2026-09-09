/**
 * Danh mục giáo dục phổ thông dùng chung cho hồ sơ giáo viên, lớp học và báo cáo.
 * Lưu trong DB dưới dạng mã (`toan`, `12`), hiển thị qua nhãn tiếng Việt ở đây.
 */

/** Cấp dạy: THCS (lớp 6–9) hoặc THPT (lớp 10–12); giáo viên có thể chọn cả hai. */
export const TEACHING_LEVELS = ['thcs', 'thpt'] as const;
export type TeachingLevel = (typeof TEACHING_LEVELS)[number];
export const TEACHING_LEVEL_LABELS: Record<TeachingLevel, string> = {
  thcs: 'THCS (lớp 6–9)',
  thpt: 'THPT (lớp 10–12)',
};

/** Môn học theo chương trình 2018, thêm "Môn khác" cho các môn không có trong danh sách. */
export const SUBJECTS = [
  'toan',
  'vat_ly',
  'hoa_hoc',
  'sinh_hoc',
  'ngu_van',
  'tieng_anh',
  'lich_su',
  'dia_ly',
  'gdkt_pl',
  'tin_hoc',
  'khac',
] as const;
export type Subject = (typeof SUBJECTS)[number];
export const SUBJECT_LABELS: Record<Subject, string> = {
  toan: 'Toán',
  vat_ly: 'Vật lý',
  hoa_hoc: 'Hóa học',
  sinh_hoc: 'Sinh học',
  ngu_van: 'Ngữ văn',
  tieng_anh: 'Tiếng Anh',
  lich_su: 'Lịch sử',
  dia_ly: 'Địa lý',
  gdkt_pl: 'Giáo dục kinh tế và pháp luật',
  tin_hoc: 'Tin học',
  khac: 'Môn khác',
};

/** Khối lớp 6–12, lưu dạng chuỗi để khớp cột `Class.grade`. */
export const GRADES = ['6', '7', '8', '9', '10', '11', '12'] as const;
export type Grade = (typeof GRADES)[number];
export const GRADES_BY_LEVEL: Record<TeachingLevel, readonly Grade[]> = {
  thcs: ['6', '7', '8', '9'],
  thpt: ['10', '11', '12'],
};

export function isSubject(value: unknown): value is Subject {
  return typeof value === 'string' && (SUBJECTS as readonly string[]).includes(value);
}

/**
 * Nhãn hiển thị của môn: mã trong danh mục → nhãn tiếng Việt;
 * giá trị tự do cũ (trước khi có danh mục) trả nguyên; rỗng → null.
 */
export function subjectLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return isSubject(value) ? SUBJECT_LABELS[value] : value;
}
