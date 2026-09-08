import { z } from 'zod';

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const;
export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const SESSION_STATUSES = ['active', 'ended'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

const noteSchema = z
  .string()
  .trim()
  .max(200, 'Ghi chú tối đa 200 ký tự')
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const attendanceUpdateItemSchema = z.object({
  studentId: z.string().min(1),
  status: attendanceStatusSchema,
  note: noteSchema,
});
export type AttendanceUpdateItem = z.infer<typeof attendanceUpdateItemSchema>;

export const updateAttendanceSchema = z.object({
  updates: z.array(attendanceUpdateItemSchema).min(1).max(100),
});
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;

export const sessionFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(500, 'Góp ý tối đa 500 ký tự')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
});
export type SessionFeedbackInput = z.infer<typeof sessionFeedbackSchema>;
