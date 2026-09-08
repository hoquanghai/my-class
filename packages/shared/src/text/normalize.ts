/** Bỏ dấu tiếng Việt: "Nguyễn Văn Đức" → "Nguyen Van Duc". */
export function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuẩn hóa để so khớp không phân biệt hoa thường, dấu, khoảng trắng thừa.
 * Dùng cho chấm câu trả lời ngắn và so tên.
 */
export function normalizeText(input: string): string {
  return stripDiacritics(input).toLowerCase().replace(/\s+/g, ' ').trim();
}
