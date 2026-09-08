import { z } from 'zod';

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

export const updateProfileSchema = z.object({ name: nameSchema });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export interface TeacherDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  plan: string;
}

export interface AuthProvidersDto {
  google: boolean;
  facebook: boolean;
}
