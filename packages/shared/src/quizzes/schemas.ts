import { z } from 'zod';
import { difficultySchema, questionTypeSchema } from '../questions/schemas.js';

const timeLimitSchema = z.number().int().min(5, 'Tối thiểu 5 giây').max(600, 'Tối đa 600 giây');
const pointsSchema = z.number().int().min(1).max(100);

export const createQuizSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tên đề').max(150),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  defaultTimeLimitSec: timeLimitSchema.default(30),
});
export type CreateQuizInput = z.infer<typeof createQuizSchema>;

export const updateQuizSchema = createQuizSchema.partial();
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;

export const addQuizItemsSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1).max(100),
});
export type AddQuizItemsInput = z.infer<typeof addQuizItemsSchema>;

export const quizRandomFilterSchema = z.object({
  subject: z.string().trim().max(60).optional(),
  grade: z.string().trim().max(60).optional(),
  topic: z.string().trim().max(60).optional(),
  difficulty: difficultySchema.optional(),
  type: questionTypeSchema.optional(),
});
export type QuizRandomFilter = z.infer<typeof quizRandomFilterSchema>;

export const randomQuizItemsSchema = z.object({
  count: z.number().int().min(1).max(50),
  filter: quizRandomFilterSchema.default({}),
});
export type RandomQuizItemsInput = z.infer<typeof randomQuizItemsSchema>;

export const updateQuizItemSchema = z.object({
  timeLimitSec: timeLimitSchema.nullable().optional(),
  points: pointsSchema.optional(),
});
export type UpdateQuizItemInput = z.infer<typeof updateQuizItemSchema>;

export const reorderQuizItemsSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
});
export type ReorderQuizItemsInput = z.infer<typeof reorderQuizItemsSchema>;
