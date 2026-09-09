import { isAllCapsTitle, isNoiseLine, stripStemNoise } from './noise.js';

describe('isNoiseLine', () => {
  it('đầu trang hành chính, tên trường/trung tâm/giáo viên', () => {
    for (const line of [
      'SỞ GD&ĐT HÀ NỘI',
      'Trường THPT Nguyễn Huệ',
      'Trung tâm Ánh Sáng',
      'GV: Nguyễn Văn A',
      'Giáo viên: Trần Thị B',
      'Biên soạn: Thầy Nam',
      'Họ và tên: ……………',
      'Lớp 12A1',
      'Mã đề 101',
      'Thời gian làm bài: 45 phút',
      'Năm học 2026 – 2027',
      'ĐỀ KIỂM TRA GIỮA HỌC KÌ I',
      'Kỳ thi tốt nghiệp THPT',
    ]) {
      expect(isNoiseLine(line), line).toBe(true);
    }
  });

  it('tiêu đề phần/chương/bài viết hoa, chân trang, website, HẾT', () => {
    for (const line of [
      'PHẦN I. TRẮC NGHIỆM 4 LỰA CHỌN',
      'Phần II. Trắc nghiệm đúng - sai',
      'Chương 3: Nguyên hàm',
      'Chủ đề 2. Hàm số',
      'BÀI 5. ỨNG DỤNG ĐẠO HÀM ĐỂ GIẢI QUYẾT MỘT SỐ VẤN ĐỀ LIÊN QUAN ĐẾN THỰC TIỄN',
      'LỜI GIẢI CHI TIẾT',
      'thuvienhoclieu.com',
      'https://thuvienhoclieu.com/de-thi',
      'Trang 3',
      '3/12',
      '----- HẾT -----',
      'Zalo: 0912 345 678',
    ]) {
      expect(isNoiseLine(line), line).toBe(true);
    }
  });

  it('không nhầm câu hỏi, phương án và "Bài N" viết thường', () => {
    for (const line of [
      'Câu 1. Một đại lượng được mô tả bởi hàm số $s(t)=t^2$.',
      'A. TỐC ĐỘ',
      'Bài 1. Giải phương trình $x^2 - 1 = 0$.',
      'Tính đạo hàm của hàm số tại điểm đã cho',
      'TRONG CÁC MỆNH ĐỀ SAU, MỆNH ĐỀ NÀO ĐÚNG?',
      "Cho $f(x) = x^3$. Khi đó $f'(1)$ bằng",
    ]) {
      expect(isNoiseLine(line), line).toBe(false);
    }
  });

  it('isAllCapsTitle', () => {
    expect(isAllCapsTitle('ỨNG DỤNG ĐẠO HÀM')).toBe(true);
    expect(isAllCapsTitle('Ứng dụng đạo hàm')).toBe(false);
    expect(isAllCapsTitle('ABC')).toBe(false);
    expect(isAllCapsTitle('TÍNH $x^2$')).toBe(false);
  });
});

describe('stripStemNoise', () => {
  it('bỏ tiêu đề phần và nhãn Câu N ở đầu, chân trang ở cuối; giữ nội dung giữa', () => {
    expect(
      stripStemNoise(
        'PHẦN I. TRẮC NGHIỆM\nCâu 1. Đạo hàm của $x^2$ là\nvới $x > 0$.\nthuvienhoclieu.com\nTrang 2',
      ),
    ).toBe('Đạo hàm của $x^2$ là\nvới $x > 0$.');
    expect(stripStemNoise('Bài 3: Tính $\\int_0^1 x\\,dx$.')).toBe('Tính $\\int_0^1 x\\,dx$.');
    expect(stripStemNoise('PHẦN II. ĐÚNG – SAI')).toBe('');
  });
});
