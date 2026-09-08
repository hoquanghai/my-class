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

  /** `s3` = MinIO (dev) hoặc Cloudflare R2 (prod); `memory` chỉ dùng cho test. */
  STORAGE_DRIVER: z.enum(['s3', 'memory']).default('s3'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().default('lophoc'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  /** URL công khai của bucket, ví dụ http://localhost:9000/lophoc hoặc https://media.example.com */
  S3_PUBLIC_URL: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.stringbool().default(true),
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
