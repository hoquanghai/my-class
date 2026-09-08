import { parseNameLines } from './parse-names.js';

describe('parseNameLines', () => {
  it('tách theo dòng, bỏ dòng trống, gộp khoảng trắng', () => {
    expect(parseNameLines('Nguyễn  Văn An\n\n  Trần Thị Bình \r\n')).toEqual([
      'Nguyễn Văn An',
      'Trần Thị Bình',
    ]);
  });

  it('bỏ số thứ tự đầu dòng dạng "1." "1)" "1-"', () => {
    expect(parseNameLines('1. An\n2) Bình\n3 - Châu\n4\tDũng')).toEqual([
      'An',
      'Bình',
      'Châu',
      'Dũng',
    ]);
  });

  it('không cắt tên bắt đầu bằng số khi không có dấu phân cách', () => {
    expect(parseNameLines('9A Nguyễn An')).toEqual(['9A Nguyễn An']);
  });

  it('giới hạn 200 ký tự mỗi tên', () => {
    expect(parseNameLines('a'.repeat(300))[0]).toHaveLength(200);
  });
});
