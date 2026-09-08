import type { QuestionType } from '../schemas.js';

/**
 * Một dòng đầu vào của parser. Dán văn bản chỉ có `text`; từ file Word có thêm
 * in đậm/gạch chân dưới dạng `**…**` / `__…__` trong `text` và ảnh trong `images`.
 */
export interface ParserLine {
  text: string;
  images?: string[];
}

export type ParseIssue =
  'empty_stem' | 'no_options' | 'too_few_options' | 'no_answer' | 'multiple_correct_in_single';

export interface ParsedOption {
  label: string;
  contentMd: string;
  isCorrect: boolean;
  imageKeys: string[];
}

export interface ParsedQuestion {
  /** Số thứ tự ghi trong đề (để khớp bảng đáp án), null nếu không có. */
  number: number | null;
  type: QuestionType;
  stemMd: string;
  options: ParsedOption[];
  acceptedAnswers: string[];
  explanationMd: string | null;
  imageKeys: string[];
  issues: ParseIssue[];
}

export interface ParseResult {
  questions: ParsedQuestion[];
  /** Có tìm thấy bảng đáp án cuối đề hay không. */
  answerKeyFound: boolean;
  /** Số dòng bị bỏ qua (nhiễu, đầu trang, dòng lạc). */
  skippedLines: number;
}

export const PARSE_ISSUE_LABELS: Record<ParseIssue, string> = {
  empty_stem: 'Thiếu đề bài',
  no_options: 'Không có phương án (coi là trả lời ngắn)',
  too_few_options: 'Chỉ có một phương án',
  no_answer: 'Chưa có đáp án đúng',
  multiple_correct_in_single: 'Nhiều đáp án đúng',
};
