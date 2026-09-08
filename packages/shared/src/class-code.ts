/** Bảng chữ không có 0/O, 1/I/L để đọc trên máy chiếu không nhầm. */
export const CLASS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CLASS_CODE_LENGTH = 6;

const CODE_REGEX = new RegExp(`^[${CLASS_CODE_ALPHABET}]{${CLASS_CODE_LENGTH}}$`);

type MinimalCrypto = { getRandomValues(array: Uint32Array): Uint32Array };

function secureRandom(): number {
  const cryptoObj = (globalThis as { crypto?: MinimalCrypto }).crypto;
  if (!cryptoObj) throw new Error('Web Crypto API is not available in this runtime');
  const buf = new Uint32Array(1);
  cryptoObj.getRandomValues(buf);
  return (buf[0] as number) / 0x1_0000_0000;
}

/**
 * Sinh mã lớp 6 ký tự. `random` trả về số trong [0, 1); mặc định dùng crypto.
 */
export function generateClassCode(random: () => number = secureRandom): string {
  let code = '';
  for (let i = 0; i < CLASS_CODE_LENGTH; i++) {
    const idx = Math.floor(random() * CLASS_CODE_ALPHABET.length);
    code += CLASS_CODE_ALPHABET[idx];
  }
  return code;
}

export function isValidClassCode(code: string): boolean {
  return CODE_REGEX.test(code);
}

/** Chuẩn hóa mã do người dùng nhập: bỏ khoảng trắng, viết hoa. */
export function normalizeClassCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}
