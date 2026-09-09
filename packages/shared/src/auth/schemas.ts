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

// ---------- Hồ sơ giáo viên ----------

/** Cấp dạy: THCS (lớp 6–9) hoặc THPT (lớp 10–12); có thể chọn cả hai. */
export const TEACHING_LEVELS = ['thcs', 'thpt'] as const;
export type TeachingLevel = (typeof TEACHING_LEVELS)[number];
export const TEACHING_LEVEL_LABELS: Record<TeachingLevel, string> = {
  thcs: 'THCS (lớp 6–9)',
  thpt: 'THPT (lớp 10–12)',
};

export const SUBJECTS = [
  'toan',
  'vat_ly',
  'hoa_hoc',
  'sinh_hoc',
  'ngu_van',
  'tieng_anh',
  'lich_su',
  'dia_ly',
  'gdkt_pl',
  'tin_hoc',
  'khac',
] as const;
export type Subject = (typeof SUBJECTS)[number];
export const SUBJECT_LABELS: Record<Subject, string> = {
  toan: 'Toán',
  vat_ly: 'Vật lý',
  hoa_hoc: 'Hóa học',
  sinh_hoc: 'Sinh học',
  ngu_van: 'Ngữ văn',
  tieng_anh: 'Tiếng Anh',
  lich_su: 'Lịch sử',
  dia_ly: 'Địa lý',
  gdkt_pl: 'Giáo dục kinh tế và pháp luật',
  tin_hoc: 'Tin học',
  khac: 'Môn khác',
};

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
