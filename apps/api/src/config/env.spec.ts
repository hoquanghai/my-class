import { validateEnv } from './env.js';

describe('validateEnv', () => {
  const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

  it('áp giá trị mặc định', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('ép kiểu PORT từ chuỗi', () => {
    expect(validateEnv({ ...base, PORT: '5001' }).PORT).toBe(5001);
  });

  it('ném lỗi có tên biến khi thiếu DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });
});
