import { dedupeNames } from './dedupe-names.js';

describe('dedupeNames', () => {
  it('giữ nguyên khi không trùng', () => {
    expect(dedupeNames([], ['An', 'Bình'])).toEqual(['An', 'Bình']);
  });

  it('thêm hậu tố (2), (3) cho tên trùng trong cùng đợt nhập', () => {
    expect(dedupeNames([], ['Nam', 'Nam', 'Nam'])).toEqual(['Nam', 'Nam (2)', 'Nam (3)']);
  });

  it('tính cả tên đã có trong lớp', () => {
    expect(dedupeNames(['Nam', 'Nam (2)'], ['Nam'])).toEqual(['Nam (3)']);
  });

  it('so sánh không phân biệt hoa thường và khoảng trắng thừa', () => {
    expect(dedupeNames(['Lê An'], ['lê  an'])).toEqual(['lê  an (2)']);
  });
});
