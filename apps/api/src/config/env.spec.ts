import { validateEnv } from './env.js';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_SECRET: 'x'.repeat(32),
    STORAGE_DRIVER: 'memory',
  };

  it('áp giá trị mặc định', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.SMTP_SECURE).toBe(false);
    expect(env.MAIL_TRANSPORT).toBe('smtp');
    expect(env.STORAGE_DRIVER).toBe('memory');
  });

  it('ép kiểu PORT từ chuỗi và SMTP_SECURE từ "true"', () => {
    const env = validateEnv({ ...base, PORT: '5001', SMTP_SECURE: 'true' });
    expect(env.PORT).toBe(5001);
    expect(env.SMTP_SECURE).toBe(true);
  });

  it('ném lỗi có tên biến khi thiếu DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_SECRET: 'x'.repeat(32) })).toThrow(/DATABASE_URL/);
  });

  it('STORAGE_DRIVER=spaces cần SPACES_KEY và SPACES_SECRET', () => {
    expect(() => validateEnv({ ...base, STORAGE_DRIVER: 'spaces' })).toThrow(/SPACES_KEY/);
    const env = validateEnv({
      ...base,
      STORAGE_DRIVER: 'spaces',
      SPACES_KEY: 'DO00X',
      SPACES_SECRET: 's'.repeat(43),
    });
    expect(env.SPACES_REGION).toBe('sgp1');
    expect(env.SPACES_BUCKET).toBe('lophoc');
  });

  it('MAIL_TRANSPORT=resend cần RESEND_API_KEY', () => {
    expect(() => validateEnv({ ...base, MAIL_TRANSPORT: 'resend' })).toThrow(/RESEND_API_KEY/);
    const env = validateEnv({ ...base, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_x' });
    expect(env.MAIL_TRANSPORT).toBe('resend');
  });

  it('từ chối JWT_SECRET ngắn', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });
});
