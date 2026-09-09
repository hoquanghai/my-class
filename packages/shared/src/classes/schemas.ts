import { z } from 'zod';
import { GRADES, SUBJECTS } from '../education.js';
import { isValidIsoDate } from '../roster/dates.js';

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

/** Chuỗi tùy chọn: rỗng → null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();
const optionalShortText = optionalText(50);

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

export const GENDERS = ['nam', 'nu', 'khac'] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS: Record<Gender, string> = { nam: 'Nam', nu: 'Nữ', khac: 'Khác' };

const optionalGender = z.preprocess(
  (v) => (v === '' ? null : v),
  z.enum(GENDERS, { error: 'Giới tính không hợp lệ' }).nullable().optional(),
);

const optionalIsoDate = optionalText(10).refine(
  (v) => v == null || isValidIsoDate(v),
  'Ngày sinh không hợp lệ',
);

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, 'Email tối đa 120 ký tự')
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .refine((v) => v == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email không hợp lệ');

/** Sửa học sinh: chỉ tên là bắt buộc phải có giá trị; các trường khác tùy chọn (khớp file Excel mẫu). */
export const updateStudentSchema = z.object({
  name: studentNameSchema.optional(),
  studentCode: optionalShortText,
  dateOfBirth: optionalIsoDate,
  gender: optionalGender,
  phone: optionalPhone,
  email: optionalEmail,
  school: optionalText(120),
  parentName: optionalText(100),
  parentPhone: optionalPhone,
  note: optionalText(500),
});
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

/** Thêm một học sinh từ form: tên bắt buộc, các trường khác như khi sửa. */
export const createStudentSchema = updateStudentSchema.extend({ name: studentNameSchema });
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const reorderStudentsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});
export type ReorderStudentsInput = z.infer<typeof reorderStudentsSchema>;
