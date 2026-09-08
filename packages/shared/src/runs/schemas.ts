import { z } from 'zod';

export const RUN_MODES = ['paced', 'self_paced'] as const;
export const runModeSchema = z.enum(RUN_MODES);
export type RunMode = z.infer<typeof runModeSchema>;

export const RUN_STATUSES = ['lobby', 'in_progress', 'finished'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const launchRunSchema = z
  .object({
    quizId: z.string().min(1),
    mode: runModeSchema,
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
    /** Self-paced: thời gian làm bài (phút) tính từ lúc bắt đầu */
    selfPacedMinutes: z.number().int().min(1).max(180).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === 'self_paced' && !v.selfPacedMinutes) {
      ctx.addIssue({
        code: 'custom',
        path: ['selfPacedMinutes'],
        message: 'Chế độ tự làm cần thời gian làm bài',
      });
    }
  });
export type LaunchRunInput = z.infer<typeof launchRunSchema>;

export const submitAnswerSchema = z
  .object({
    runQuestionId: z.string().min(1),
    selectedOptionIds: z.array(z.string().min(1)).max(8).optional(),
    textAnswer: z.string().trim().max(200).optional(),
    /** Client sinh ra để chống nộp trùng khi retry */
    clientRequestId: z.string().max(64).optional(),
    /** Thời gian từ lúc câu mở tới lúc nộp (ms), client đo */
    responseMs: z.number().int().min(0).max(3_600_000).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.selectedOptionIds?.length && !v.textAnswer?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['selectedOptionIds'],
        message: 'Chưa chọn câu trả lời',
      });
    }
  });
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

export const overrideAnswerSchema = z.object({
  isCorrect: z.boolean(),
});
export type OverrideAnswerInput = z.infer<typeof overrideAnswerSchema>;
