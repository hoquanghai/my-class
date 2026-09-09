import { z } from 'zod';
import { SUBJECTS, type Subject, TEACHING_LEVELS, type TeachingLevel } from '../education.js';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Email không hợp lệ' }));

export const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(128, 'Mật khẩu tối đa 128 ký tự');

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập tên')
  .max(100, 'Tên tối đa 100 ký tự');

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, { error: 'Bạn cần đồng ý điều khoản sử dụng' }),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({ token: z.string().min(1) });
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ---------- Hồ sơ giáo viên ----------

/** Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx; chuỗi rỗng → null. */
const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .transform((v) => v.replace(/[\s.-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^(\+84|0)\d{8,10}$/, 'Số điện thoại không hợp lệ')
      .or(z.literal('')),
  )
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const schoolSchema = z
  .string()
  .trim()
  .max(120, 'Tối đa 120 ký tự')
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema,
  school: schoolSchema,
  levels: z.array(z.enum(TEACHING_LEVELS)).max(TEACHING_LEVELS.length).optional(),
  subjects: z.array(z.enum(SUBJECTS)).max(SUBJECTS.length).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  /** Bỏ trống khi tài khoản chỉ đăng nhập bằng Google/Facebook và chưa có mật khẩu */
  currentPassword: z.string().max(128).optional(),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface TeacherDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  plan: string;
  phone: string | null;
  school: string | null;
  levels: TeachingLevel[];
  subjects: Subject[];
  /** false khi tài khoản tạo bằng Google/Facebook và chưa đặt mật khẩu */
  hasPassword: boolean;
  /** Nhà cung cấp đã liên kết: google, facebook */
  providers: string[];
}

export interface AuthProvidersDto {
  google: boolean;
  facebook: boolean;
}
