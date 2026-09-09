/**
 * Định dạng file giáo viên hay dùng khi nhập đề cho AI.
 * Ảnh và PDF gửi thẳng cho model nhìn; .tex/.txt/.md là văn bản gửi nguyên (LaTeX giữ được công thức).
 * Word không được nhận: công thức MathType/Equation không nằm trong chữ, model sẽ tự bịa cho đủ câu;
 * giáo viên lưu PDF từ Word rồi tải PDF lên.
 */
export type AiFileKind = 'image' | 'pdf' | 'text';

export const AI_FILE_KIND_BY_EXT: Record<string, AiFileKind> = {
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.webp': 'image',
  '.gif': 'image',
  '.pdf': 'pdf',
  '.tex': 'text',
  '.txt': 'text',
  '.md': 'text',
};

/** Giá trị cho thuộc tính `accept` của ô chọn file. */
export const AI_IMPORT_ACCEPT = [
  ...Object.keys(AI_FILE_KIND_BY_EXT),
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
].join(',');

/** File Word (.doc/.docx): không nhận, nhưng nhắc riêng cách chuyển sang PDF. */
export function isWordFileName(name: string): boolean {
  return /\.docx?$/i.test(name);
}

export function aiFileKindByName(name: string): AiFileKind | null {
  const ext = name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  return ext ? (AI_FILE_KIND_BY_EXT[ext] ?? null) : null;
}

/** Văn bản tính hạn mức theo số ký tự: 3.000 ký tự tương đương một trang đề. */
export const AI_TEXT_CHARS_PER_PAGE = 3000;

export function textPageCount(chars: number): number {
  return Math.max(1, Math.ceil(chars / AI_TEXT_CHARS_PER_PAGE));
}
