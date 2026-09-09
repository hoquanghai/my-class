import { z } from 'zod';
import { GRADES, SUBJECTS } from '../education.js';

export const QUESTION_TYPES = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'short_text',
] as const;
export const questionTypeSchema = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const DIFFICULTIES = ['nhan_biet', 'thong_hieu', 'van_dung'] as const;
export const difficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof difficultySchema>;

/** `community`: lấy về từ bộ đề chia sẻ (Question.sharedSetId trỏ về bài gốc). */
export const QUESTION_SOURCES = ['paste', 'docx', 'image_ai', 'manual', 'community'] as const;
export const questionSourceSchema = z.enum(QUESTION_SOURCES);
export type QuestionSource = z.infer<typeof questionSourceSchema>;

/** Môn và khối theo danh mục chung (education.ts); chủ đề do giáo viên đặt. */
export const questionSubjectSchema = z.enum(SUBJECTS, { error: 'Vui lòng chọn môn' });
export const questionGradeSchema = z.enum(GRADES, { error: 'Vui lòng chọn khối' });
export const topicSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập chủ đề')
  .max(80, 'Chủ đề tối đa 80 ký tự')
  .transform((v) => v.replace(/\s+/g, ' '));

const mdSchema = (max: number, message: string) => z.string().trim().min(1, message).max(max);

export const questionOptionInputSchema = z.object({
  label: z.string().trim().min(1).max(3),
  contentMd: z.string().trim().max(2000),
  isCorrect: z.boolean(),
  imageKey: z.string().max(300).nullable().optional(),
});
export type QuestionOptionInput = z.infer<typeof questionOptionInputSchema>;

export const questionInputSchema = z
  .object({
    type: questionTypeSchema,
    stemMd: mdSchema(5000, 'Đề bài không được trống'),
    explanationMd: z
      .string()
      .trim()
      .max(5000)
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
    imageKey: z.string().max(300).nullable().optional(),
    subject: questionSubjectSchema,
    grade: questionGradeSchema,
    topic: topicSchema,
    difficulty: difficultySchema.nullable().optional(),
    source: questionSourceSchema,
    options: z.array(questionOptionInputSchema).max(8).default([]),
    acceptedAnswers: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
  })
  .superRefine((q, ctx) => {
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (q.type === 'short_text') {
      if (q.acceptedAnswers.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['acceptedAnswers'],
          message: 'Cần ít nhất một đáp án',
        });
      }
      return;
    }
    if (q.options.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Cần ít nhất 2 phương án' });
    }
    if (correct === 0) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Chưa chọn đáp án đúng' });
    }
    if ((q.type === 'single_choice' || q.type === 'true_false') && correct > 1) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Chỉ được một đáp án đúng' });
    }
    if (q.type === 'true_false' && q.options.length !== 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Câu đúng/sai cần đúng 2 phương án',
      });
    }
  });
export type QuestionInput = z.infer<typeof questionInputSchema>;

export const bulkCreateQuestionsSchema = z.object({
  questions: z.array(questionInputSchema).min(1, 'Chưa có câu hỏi').max(200),
  source: questionSourceSchema,
});
export type BulkCreateQuestionsInput = z.infer<typeof bulkCreateQuestionsSchema>;

export const updateQuestionSchema = z.object({
  type: questionTypeSchema.optional(),
  stemMd: mdSchema(5000, 'Đề bài không được trống').optional(),
  explanationMd: z
    .string()
    .trim()
    .max(5000)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  imageKey: z.string().max(300).nullable().optional(),
  subject: questionSubjectSchema.optional(),
  grade: questionGradeSchema.optional(),
  topic: topicSchema.optional(),
  difficulty: difficultySchema.nullable().optional(),
  options: z.array(questionOptionInputSchema).max(8).optional(),
  acceptedAnswers: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
});
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

export const questionFilterSchema = z.object({
  subject: z.string().trim().max(60).optional(),
  grade: z.string().trim().max(60).optional(),
  topic: z.string().trim().max(60).optional(),
  difficulty: difficultySchema.optional(),
  type: questionTypeSchema.optional(),
  /** Lọc theo nguồn (ví dụ `community` = lấy về từ cộng đồng) */
  source: questionSourceSchema.optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type QuestionFilter = z.infer<typeof questionFilterSchema>;

/** `GET /questions/facets`: lọc danh sách chủ đề theo môn/khối đang chọn. */
export const questionFacetsQuerySchema = z.object({
  subject: z.string().trim().max(60).optional(),
  grade: z.string().trim().max(60).optional(),
});
export type QuestionFacetsQuery = z.infer<typeof questionFacetsQuerySchema>;
