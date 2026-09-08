import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  APP_URL: z.url().default('http://localhost:3000'),
  API_URL: z.url().default('http://localhost:4000'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET cần ít nhất 32 ký tự'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.stringbool().default(false),
  MAIL_FROM: z.string().default('Lớp Học <no-reply@lophoc.app>'),
  /** `memory` giữ email trong RAM (dùng cho test), `smtp` gửi thật (Mailpit ở dev). */
  MAIL_TRANSPORT: z.enum(['smtp', 'memory']).default('smtp'),
});

export type Env = z.infer<typeof envSchema>;

/** Dùng cho ConfigModule.forRoot({ validate }). Ném lỗi rõ tên biến khi cấu hình sai. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Cấu hình môi trường không hợp lệ:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
