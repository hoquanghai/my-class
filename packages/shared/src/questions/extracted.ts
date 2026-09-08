import { z } from 'zod';
import { stripDiacritics } from '../text/normalize.js';
import type { ParsedOption, ParsedQuestion, ParseIssue } from './parser/types.js';
import type { QuestionType } from './schemas.js';

/**
 * Kết quả trích xuất từ AI (ảnh/PDF). Mọi trường bắt buộc, dùng `null` thay vì bỏ trống
 * để tương thích JSON Schema strict của cả Claude lẫn OpenAI.
 */
export const extractedOptionSchema = z.object({
  label: z.string().describe('Nhãn phương án: A, B, C, D…'),
  content: z.string().describe('Nội dung phương án, công thức viết LaTeX trong $…$'),
  isCorrect: z
    .boolean()
    .nullable()
    .describe('true nếu đề đánh dấu đây là đáp án đúng, null nếu không rõ'),
});

export const extractedQuestionSchema = z.object({
  number: z.number().int().nullable().describe('Số thứ tự câu trong đề, null nếu không có'),
  type: z
    .enum(['single_choice', 'multiple_choice', 'true_false', 'short_text'])
    .nullable()
    .describe('Loại câu; null nếu không chắc'),
  stem: z.string().describe('Đề bài, giữ nguyên tiếng Việt, công thức LaTeX trong $…$'),
  options: z.array(extractedOptionSchema).describe('Danh sách phương án, rỗng nếu câu tự luận'),
  answer: z
    .string()
    .nullable()
    .describe('Đáp án nếu đề ghi: chữ cái (vd "B" hoặc "A, C") hoặc đáp án trả lời ngắn'),
  explanation: z.string().nullable().describe('Lời giải/giải thích nếu có'),
});

export const extractionOutputSchema = z.object({
  questions: z.array(extractedQuestionSchema),
});

export type ExtractedOption = z.infer<typeof extractedOptionSchema>;
export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;
export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

const TRUE_FALSE = /^(dung|sai|true|false|d|s)$/i;
const norm = (s: string) => stripDiacritics(s).toLowerCase().trim();

/** Chuyển kết quả AI sang dạng câu hỏi cho lưới preview-and-fix (cùng quy tắc với parser). */
export function extractedToParsed(items: ExtractedQuestion[]): ParsedQuestion[] {
  return items.map((item) => {
    const issues: ParseIssue[] = [];
    const stemMd = item.stem.trim();
    if (!stemMd) issues.push('empty_stem');

    const options: ParsedOption[] = item.options.map((o, i) => ({
      label: (o.label.trim().toUpperCase() || String.fromCharCode(65 + i)).slice(0, 1),
      contentMd: o.content.trim(),
      isCorrect: o.isCorrect === true,
      imageKeys: [],
    }));

    const answer = item.answer?.trim() ?? '';
    const answerLetters = answer.toUpperCase().match(/\b[A-H]\b/g);
    if (options.length > 0 && !options.some((o) => o.isCorrect) && answerLetters) {
      for (const o of options) o.isCorrect = answerLetters.includes(o.label);
    }

    let type: QuestionType;
    let acceptedAnswers: string[] = [];
    if (options.length === 0) {
      type = 'short_text';
      issues.push('no_options');
      if (answer) acceptedAnswers = [answer];
      else issues.push('no_answer');
    } else {
      const correctCount = options.filter((o) => o.isCorrect).length;
      const isTrueFalse =
        options.length === 2 && options.every((o) => TRUE_FALSE.test(norm(o.contentMd)));
      if (item.type && item.type !== 'short_text') type = item.type;
      else if (isTrueFalse) type = 'true_false';
      else type = correctCount > 1 ? 'multiple_choice' : 'single_choice';
      if (type === 'single_choice' && correctCount > 1) type = 'multiple_choice';
      if (options.length === 1) issues.push('too_few_options');
      if (correctCount === 0) issues.push('no_answer');
    }

    return {
      number: item.number,
      type,
      stemMd,
      options,
      acceptedAnswers,
      explanationMd: item.explanation?.trim() || null,
      imageKeys: [],
      issues,
    };
  });
}
