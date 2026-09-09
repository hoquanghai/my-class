import { z } from 'zod';
import {
  difficultySchema,
  questionGradeSchema,
  questionSubjectSchema,
  questionTypeSchema,
} from '../questions/schemas.js';

/** Trạng thái bài đăng: nháp chỉ mình thấy; công khai vào kho; chỉ ai có link; lưu trữ (ẩn, người đã lấy vẫn giữ). */
export const SHARED_SET_STATUSES = ['draft', 'published', 'unlisted', 'archived'] as const;
export const sharedSetStatusSchema = z.enum(SHARED_SET_STATUSES);
export type SharedSetStatus = z.infer<typeof sharedSetStatusSchema>;
export const SHARED_SET_STATUS_LABELS: Record<SharedSetStatus, string> = {
  draft: 'Nháp',
  published: 'Công khai',
  unlisted: 'Chỉ ai có link',
  archived: 'Đã lưu trữ',
};

export const COMMUNITY_SORTS = ['new', 'liked', 'cloned'] as const;
export type CommunitySort = (typeof COMMUNITY_SORTS)[number];

export const REPORT_REASONS = ['spam', 'copyright', 'wrong_answer', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam, quảng cáo',
  copyright: 'Vi phạm bản quyền',
  wrong_answer: 'Sai đáp án hoặc nội dung',
  other: 'Lý do khác',
};

export const MAX_SET_QUESTIONS = 200;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

const titleSchema = z
  .string()
  .trim()
  .min(3, 'Tiêu đề tối thiểu 3 ký tự')
  .max(120, 'Tiêu đề tối đa 120 ký tự');

const questionIdsSchema = z.array(z.string().min(1)).max(MAX_SET_QUESTIONS).optional();
const quizIdSchema = z.string().min(1).optional();
const SOURCE_MESSAGE = 'Chọn câu hỏi trong ngân hàng hoặc một đề kiểm tra';

/** Đăng bộ đề: nội dung lấy từ danh sách câu hỏi hoặc từ một đề; bắt buộc xác nhận quyền chia sẻ. */
export const publishSetSchema = z
  .object({
    title: titleSchema,
    description: optionalText(2000),
    subject: questionSubjectSchema,
    grade: questionGradeSchema,
    topic: optionalText(80),
    source: optionalText(200),
    status: z.enum(['draft', 'published', 'unlisted']).default('draft'),
    questionIds: questionIdsSchema,
    quizId: quizIdSchema,
    agree: z.literal(true, { error: 'Cần xác nhận bạn có quyền chia sẻ nội dung này' }),
  })
  .superRefine((v, ctx) => {
    const hasIds = (v.questionIds?.length ?? 0) > 0;
    if (hasIds === Boolean(v.quizId)) {
      ctx.addIssue({ code: 'custom', path: ['questionIds'], message: SOURCE_MESSAGE });
    }
  });
export type PublishSetInput = z.infer<typeof publishSetSchema>;

export const updateSetSchema = z.object({
  title: titleSchema.optional(),
  description: optionalText(2000),
  subject: questionSubjectSchema.optional(),
  grade: questionGradeSchema.optional(),
  topic: optionalText(80),
  source: optionalText(200),
  status: sharedSetStatusSchema.optional(),
});
export type UpdateSetInput = z.infer<typeof updateSetSchema>;

/** Đăng bản mới: chụp lại nội dung từ ngân hàng/đề hiện tại, tăng số bản. */
export const republishSetSchema = z
  .object({ questionIds: questionIdsSchema, quizId: quizIdSchema })
  .superRefine((v, ctx) => {
    const hasIds = (v.questionIds?.length ?? 0) > 0;
    if (hasIds === Boolean(v.quizId)) {
      ctx.addIssue({ code: 'custom', path: ['questionIds'], message: SOURCE_MESSAGE });
    }
  });
export type RepublishSetInput = z.infer<typeof republishSetSchema>;

export const cloneSetSchema = z.object({
  /** Tạo luôn một đề kiểm tra gồm các câu vừa lấy về */
  createQuiz: z.boolean().default(false),
});
export type CloneSetInput = z.infer<typeof cloneSetSchema>;

export const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Nội dung không được trống')
    .max(1000, 'Bình luận tối đa 1000 ký tự'),
  /** Góp ý về câu số N (1-based) trong bộ đề */
  questionIndex: z.number().int().min(1).max(MAX_SET_QUESTIONS).nullable().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const reportSetSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  detail: optionalText(500),
});
export type ReportSetInput = z.infer<typeof reportSetSchema>;

export const communityListQuerySchema = z.object({
  subject: questionSubjectSchema.optional(),
  grade: questionGradeSchema.optional(),
  topic: z.string().trim().max(80).optional(),
  type: questionTypeSchema.optional(),
  difficulty: difficultySchema.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(COMMUNITY_SORTS).default('new'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type CommunityListQuery = z.infer<typeof communityListQuerySchema>;

export const communityFacetsQuerySchema = z.object({
  subject: questionSubjectSchema.optional(),
  grade: questionGradeSchema.optional(),
});
export type CommunityFacetsQuery = z.infer<typeof communityFacetsQuerySchema>;
