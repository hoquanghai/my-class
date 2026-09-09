import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  APP_URL: z.url().default('http://localhost:3000'),
  API_URL: z.url().default('http://localhost:4000'),
  /** Sub-domain học sinh: dùng cho CORS, Socket.IO và đường dẫn trong mã QR. */
  STUDENT_APP_URL: z.url().default('http://hs.localhost:3000'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET cần ít nhất 32 ký tự'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

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

  /**
   * Trích xuất câu hỏi từ ảnh/PDF. `mock` không gọi mạng (dev/test);
   * `cascade` = model rẻ đọc cả đề, trang bị cờ chất lượng mới đưa sang model mạnh.
   */
  AI_PROVIDER: z.enum(['claude', 'openai', 'gemini', 'mock', 'cascade']).default('claude'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  /** Ghi đè model của nhà cung cấp chính (claude-sonnet-5 / gpt-5.6 / gemini-3.7-flash). */
  AI_MODEL: z.string().optional(),
  AI_EFFORT: z.enum(['low', 'medium', 'high']).default('medium'),
  /** Mức suy nghĩ của Gemini 3.x; chép đề chỉ cần LOW (token suy nghĩ tính vào giá ra). */
  AI_GEMINI_THINKING: z.enum(['MINIMAL', 'LOW', 'MEDIUM', 'HIGH']).default('LOW'),
  /** Cascade: nhà cung cấp chính (rẻ) và nhà cung cấp leo thang (mạnh). */
  AI_PRIMARY_PROVIDER: z.enum(['claude', 'openai', 'gemini', 'mock']).default('gemini'),
  AI_ESCALATION_PROVIDER: z.enum(['claude', 'openai', 'gemini', 'mock']).default('claude'),
  AI_ESCALATION_MODEL: z.string().optional(),
  /** Tỷ lệ trang tối đa được leo thang (0–1); 1 = mọi trang bị cờ. */
  AI_ESCALATION_MAX_SHARE: z.coerce.number().min(0).max(1).default(1),

  /** `bullmq` cần Redis; `inline` chạy job ngay trong tiến trình (test). */
  QUEUE_DRIVER: z.enum(['bullmq', 'inline']).default('bullmq'),
  /** Socket.IO adapter: `redis` để chạy nhiều instance api; `memory` cho test/một instance. */
  REALTIME_ADAPTER: z.enum(['redis', 'memory']).default('redis'),
  /** Giai đoạn 1: worker chạy chung tiến trình api. Đặt false khi tách container worker. */
  WORKER_INLINE: z.stringbool().default(true),
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
