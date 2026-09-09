import { formatDateVi, isValidIsoDate, parseDateInput } from './dates.js';

describe('parseDateInput', () => {
  it('đọc ngày/tháng/năm với các dấu phân cách', () => {
    expect(parseDateInput('15/08/2008')).toBe('2008-08-15');
    expect(parseDateInput('5-8-2008')).toBe('2008-08-05');
    expect(parseDateInput(' 15.08.2008 ')).toBe('2008-08-15');
  });

  it('đọc ISO, kể cả có giờ (giá trị Date từ Excel)', () => {
    expect(parseDateInput('2008-08-15')).toBe('2008-08-15');
    expect(parseDateInput('2008-8-5T00:00:00.000Z')).toBe('2008-08-05');
  });

  it('ngày không tồn tại hoặc sai định dạng → null', () => {
    expect(parseDateInput('31/02/2008')).toBeNull();
    expect(parseDateInput('15/13/2008')).toBeNull();
    expect(parseDateInput('15/08/08')).toBeNull();
    expect(parseDateInput('abc')).toBeNull();
    expect(parseDateInput('')).toBeNull();
  });
});

describe('isValidIsoDate / formatDateVi', () => {
  it('kiểm tra năm nhuận và khoảng năm', () => {
    expect(isValidIsoDate('2008-02-29')).toBe(true);
    expect(isValidIsoDate('2007-02-29')).toBe(false);
    expect(isValidIsoDate('1899-12-31')).toBe(false);
  });

  it('formatDateVi', () => {
    expect(formatDateVi('2008-08-15')).toBe('15/08/2008');
  });
});
