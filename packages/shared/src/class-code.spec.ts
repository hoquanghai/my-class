import {
  CLASS_CODE_ALPHABET,
  generateClassCode,
  isValidClassCode,
  normalizeClassCode,
} from './class-code.js';

describe('generateClassCode', () => {
  it('sinh mã 6 ký tự chỉ gồm bảng chữ không nhầm lẫn', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateClassCode();
      expect(code).toHaveLength(6);
      for (const ch of code) expect(CLASS_CODE_ALPHABET).toContain(ch);
    }
  });

  it('không chứa ký tự dễ nhầm 0 O 1 I L', () => {
    for (const ch of '0O1IL') expect(CLASS_CODE_ALPHABET).not.toContain(ch);
  });

  it('dùng nguồn ngẫu nhiên được truyền vào (deterministic)', () => {
    const fixed = () => 0; // luôn chọn ký tự đầu bảng
    expect(generateClassCode(fixed)).toBe('AAAAAA');
  });
});

describe('isValidClassCode', () => {
  it('chấp nhận mã hợp lệ', () => {
    expect(isValidClassCode('AB2CD3')).toBe(true);
  });

  it('từ chối sai độ dài hoặc ký tự ngoài bảng', () => {
    expect(isValidClassCode('AB2CD')).toBe(false);
    expect(isValidClassCode('AB0CD3')).toBe(false);
    expect(isValidClassCode('ab2cd3')).toBe(false);
  });
});

describe('normalizeClassCode', () => {
  it('bỏ khoảng trắng, viết hoa', () => {
    expect(normalizeClassCode(' ab2 cd3 ')).toBe('AB2CD3');
  });
});
