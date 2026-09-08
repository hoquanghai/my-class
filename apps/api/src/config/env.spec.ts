import { validateEnv } from './env.js';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_SECRET: 'x'.repeat(32),
  };

  it('áp giá trị mặc định', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.SMTP_SECURE).toBe(false);
    expect(env.MAIL_TRANSPORT).toBe('smtp');
  });

  it('ép kiểu PORT từ chuỗi và SMTP_SECURE từ "true"', () => {
    const env = validateEnv({ ...base, PORT: '5001', SMTP_SECURE: 'true' });
    expect(env.PORT).toBe(5001);
    expect(env.SMTP_SECURE).toBe(true);
  });

  it('ném lỗi có tên biến khi thiếu DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_SECRET: 'x'.repeat(32) })).toThrow(/DATABASE_URL/);
  });

  it('từ chối JWT_SECRET ngắn', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });
});
