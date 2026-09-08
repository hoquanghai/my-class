import { hashPassword, randomToken, sha256, verifyPassword } from './tokens.js';

describe('tokens', () => {
  it('sha256 ổn định', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('randomToken 32 byte cho 43 ký tự base64url, mỗi lần khác nhau', () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).toHaveLength(43);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
  });

  it('hash/verify mật khẩu', async () => {
    const h = await hashPassword('demo1234');
    expect(h.startsWith('$argon2')).toBe(true);
    await expect(verifyPassword(h, 'demo1234')).resolves.toBe(true);
    await expect(verifyPassword(h, 'sai-roi')).resolves.toBe(false);
    await expect(verifyPassword('khong-phai-hash', 'x')).resolves.toBe(false);
  });
});
