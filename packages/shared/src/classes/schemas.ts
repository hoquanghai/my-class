import { z } from 'zod';
import { GRADES, SUBJECTS } from '../education.js';

const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** weekday theo ISO: 1 = Thứ Hai … 7 = Chủ Nhật */
export const scheduleItemSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  start: z.string().regex(TIME_HHMM, 'Giờ dạng HH:MM'),
  end: z.string().regex(TIME_HHMM, 'Giờ dạng HH:MM'),
});
export type ScheduleItem = z.infer<typeof scheduleItemSchema>;

export const classNameSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập tên lớp')
  .max(100, 'Tên lớp tối đa 100 ký tự');

const optionalShortText = z
  .string()
  .trim()
  .max(50)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const createClassSchema = z.object({
  name: classNameSchema,
  subject: z.enum(SUBJECTS, { error: 'Vui lòng chọn môn' }),
  grade: z.enum(GRADES, { error: 'Vui lòng chọn khối lớp' }),
  schedule: z.array(scheduleItemSchema).max(14).optional(),
});
export type CreateClassInput = z.infer<typeof createClassSchema>;

export const updateClassSchema = createClassSchema.partial().extend({
  rosterLocked: z.boolean().optional(),
});
export type UpdateClassInput = z.infer<typeof updateClassSchema>;

export const studentNameSchema = z
  .string()
  .trim()
  .min(1, 'Tên học sinh không được trống')
  .max(200, 'Tên học sinh tối đa 200 ký tự');

export const importNamesSchema = z.object({
  names: z.array(studentNameSchema).min(1, 'Chưa có tên nào').max(200, 'Tối đa 200 tên mỗi lần'),
});
export type ImportNamesInput = z.infer<typeof importNamesSchema>;

const optionalPhone = z
  .string()
  .trim()
  .max(20)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const updateStudentSchema = z.object({
  name: studentNameSchema.optional(),
  parentPhone: optionalPhone,
  studentCode: optionalShortText,
});
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export const reorderStudentsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});
export type ReorderStudentsInput = z.infer<typeof reorderStudentsSchema>;
