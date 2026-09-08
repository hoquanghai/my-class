/** "1. ", "12) ", "3 - ", "4<tab>" ở đầu dòng: số thứ tự do giáo viên dán kèm. */
const LEADING_INDEX = /^\s*\d{1,3}\s*[.)\-:–]?\s+/;

export const MAX_STUDENT_NAME_LENGTH = 200;

/** Tách văn bản dán vào thành danh sách tên: mỗi dòng một tên, bỏ dòng trống và số thứ tự. */
export function parseNameLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(LEADING_INDEX, '').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .map((line) => line.slice(0, MAX_STUDENT_NAME_LENGTH));
}
