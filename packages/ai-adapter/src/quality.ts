import type { ExtractedQuestion } from '@lophoc/shared';

/** Dấu hiệu một câu trích xuất chưa đạt; chỉ dùng quy tắc, không tốn token. */
export type QualityFlag =
  | 'empty_stem'
  | 'too_few_options'
  | 'odd_option_count'
  | 'empty_option'
  | 'lost_formula'
  | 'unbalanced_latex';

export interface QuestionQuality {
  index: number;
  page: number | null;
  flags: QualityFlag[];
}

export interface QualityReport {
  total: number;
  flagged: QuestionQuality[];
  /** Trang (đếm từ 1) có câu bị cờ, xếp theo số cờ giảm dần. */
  flaggedPages: number[];
  /** Có câu bị cờ nhưng model không cho biết trang. */
  unknownPageFlagged: boolean;
}

/**
 * Khoảng trắng đứng trước dấu câu hoặc ngoặc rỗng: chỗ công thức đã bị rơi.
 * Không xét câu kết thúc bằng "là"/"bằng": đề trắc nghiệm tiếng Việt thường viết vậy trước phương án.
 */
const LOST_FORMULA = /(\s[.,;:](\s|$)|\(\s*\))/u;
const ONLY_PUNCT = /^[\s.,;:()[\]]*$/;

export function latexBalanced(text: string): boolean {
  const dollars = (text.replace(/\\\$/g, '').match(/\$/g) ?? []).length;
  if (dollars % 2 !== 0) return false;
  let depth = 0;
  for (const ch of text.replace(/\\[{}]/g, '')) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function questionFlags(q: ExtractedQuestion, usualOptionCount: number): QualityFlag[] {
  const flags = new Set<QualityFlag>();
  const stem = collapse(q.stem);
  if (!stem) flags.add('empty_stem');
  else if (LOST_FORMULA.test(stem)) flags.add('lost_formula');
  if (!latexBalanced(stem)) flags.add('unbalanced_latex');

  const n = q.options.length;
  if (n === 1) flags.add('too_few_options');
  if (n >= 2 && n !== usualOptionCount && n !== 2 && q.type !== 'multiple_choice') {
    flags.add('odd_option_count');
  }
  for (const o of q.options) {
    const content = collapse(o.content);
    if (ONLY_PUNCT.test(content)) flags.add('empty_option');
    else if (LOST_FORMULA.test(content)) flags.add('lost_formula');
    if (!latexBalanced(content)) flags.add('unbalanced_latex');
  }
  return [...flags];
}

/** Số phương án phổ biến nhất trong các câu có phương án (thường là 4); 4 nếu chưa đủ dữ liệu. */
function usualOptionCount(questions: ExtractedQuestion[]): number {
  const counts = new Map<number, number>();
  for (const q of questions) {
    if (q.options.length >= 2)
      counts.set(q.options.length, (counts.get(q.options.length) ?? 0) + 1);
  }
  let best = 4;
  let bestCount = 0;
  for (const [n, c] of counts) {
    if (c > bestCount) {
      best = n;
      bestCount = c;
    }
  }
  return best;
}

/** Chấm toàn bộ kết quả: câu nào bị cờ, trang nào cần đưa sang model mạnh hơn. */
export function assessQuestions(questions: ExtractedQuestion[]): QualityReport {
  const usual = usualOptionCount(questions);
  const flagged: QuestionQuality[] = [];
  questions.forEach((q, index) => {
    const flags = questionFlags(q, usual);
    if (flags.length > 0) flagged.push({ index, page: q.page, flags });
  });
  const perPage = new Map<number, number>();
  let unknownPageFlagged = false;
  for (const f of flagged) {
    if (f.page === null || f.page < 1) unknownPageFlagged = true;
    else perPage.set(f.page, (perPage.get(f.page) ?? 0) + f.flags.length);
  }
  const flaggedPages = [...perPage.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([page]) => page);
  return { total: questions.length, flagged, flaggedPages, unknownPageFlagged };
}
