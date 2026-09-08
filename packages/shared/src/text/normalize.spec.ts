import { normalizeText, stripDiacritics } from './normalize.js';

describe('stripDiacritics', () => {
  it('bỏ dấu và chuyển đ/Đ', () => {
    expect(stripDiacritics('Nguyễn Văn Đức')).toBe('Nguyen Van Duc');
    expect(stripDiacritics('ĐÀ NẴNG')).toBe('DA NANG');
  });
});

describe('normalizeText', () => {
  it('so khớp không phân biệt hoa thường, dấu, khoảng trắng', () => {
    expect(normalizeText('  Hình   VUÔNG ')).toBe('hinh vuong');
    expect(normalizeText('hình vuông')).toBe(normalizeText('Hinh Vuong'));
  });
});
