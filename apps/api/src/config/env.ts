import { z } from 'zod';

export const envSchema = z
  .object({
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
    /**
     * `resend` gọi API HTTPS của Resend (production), `smtp` gửi qua máy chủ SMTP (Mailpit ở dev),
     * `memory` giữ email trong RAM (test).
     */
    MAIL_TRANSPORT: z.enum(['smtp', 'resend', 'memory']).default('smtp'),
    /** API key của Resend (https://resend.com/api-keys), bắt buộc khi MAIL_TRANSPORT=resend. */
    RESEND_API_KEY: z.string().optional(),
    /** Nhận email khi giáo viên báo đã chuyển khoản (kèm link duyệt kích hoạt gói). */
    BILLING_ADMIN_EMAIL: z.string().default('hoquanghai.bka@gmail.com'),

    /** `spaces` = DigitalOcean Spaces (API tương thích S3); `memory` cho test và khi chưa có khóa. */
    STORAGE_DRIVER: z.enum(['spaces', 'memory']).default('spaces'),
    /** Vùng của Space: sgp1 (Singapore, gần Việt Nam nhất), nyc3, fra1, sfo3, blr1, syd1… */
    SPACES_REGION: z.string().default('sgp1'),
    /** Tên Space (vai trò như bucket S3). */
    SPACES_BUCKET: z.string().default('lophoc'),
    /** Access Key ID, 20 ký tự dạng DO00… (https://cloud.digitalocean.com/account/api/spaces). */
    SPACES_KEY: z.string().optional(),
    /** Secret key, 43 ký tự; DigitalOcean chỉ hiện một lần lúc tạo khóa. */
    SPACES_SECRET: z.string().optional(),
    /** Ghi đè endpoint; mặc định https://<vùng>.digitaloceanspaces.com */
    SPACES_ENDPOINT: z.string().optional(),
    /** URL công khai; mặc định https://<space>.<vùng>.digitaloceanspaces.com. Đặt khi bật CDN hoặc dùng tên miền riêng. */
    SPACES_PUBLIC_URL: z.string().optional(),
    /** Tiền tố key để tách file dev/prod trong cùng một Space, ví dụ `dev`. */
    SPACES_PREFIX: z.string().optional(),

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
    AI_GEMINI_THINKING: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW'),
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
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === 'spaces') {
      for (const key of ['SPACES_KEY', 'SPACES_SECRET'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `STORAGE_DRIVER=spaces cần ${key} (https://cloud.digitalocean.com/account/api/spaces)`,
          });
        }
      }
    }
    if (env.MAIL_TRANSPORT === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'MAIL_TRANSPORT=resend cần RESEND_API_KEY (https://resend.com/api-keys)',
      });
    }
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
