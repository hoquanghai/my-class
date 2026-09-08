import { parseQuestions } from './question-parser.js';

const correct = (q: { options: { label: string; isCorrect: boolean }[] }) =>
  q.options.filter((o) => o.isCorrect).map((o) => o.label);

describe('parseQuestions', () => {
  it('Câu n + phương án từng dòng + bảng đáp án "1B 2C"', () => {
    const r = parseQuestions(`
Câu 1. Nghiệm của phương trình $2x + 3 = 11$ là:
A. $x = 3$
B. $x = 4$
C. $x = 5$
D. $x = 7$
Câu 2: Căn bậc hai số học của 49 là
A. -7
B. 7
C. ±7
D. 49

ĐÁP ÁN
1B 2B
`);
    expect(r.questions).toHaveLength(2);
    expect(r.answerKeyFound).toBe(true);
    const [q1, q2] = r.questions;
    expect(q1!.number).toBe(1);
    expect(q1!.stemMd).toBe('Nghiệm của phương trình $2x + 3 = 11$ là:');
    expect(q1!.options.map((o) => o.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(q1!.options[1]!.contentMd).toBe('$x = 4$');
    expect(correct(q1!)).toEqual(['B']);
    expect(q1!.type).toBe('single_choice');
    expect(q1!.issues).toEqual([]);
    expect(correct(q2!)).toEqual(['B']);
  });

  it('"1)" + phương án cùng dòng + dấu * đánh dấu đáp án', () => {
    const r = parseQuestions(`1) Thủ đô của Việt Nam là? A. Huế *B. Hà Nội C. Đà Nẵng D. Cần Thơ
2) 2 + 2 = ? A. 3 B. 5 C. 4 D. 6
Đáp án: C`);
    expect(r.questions).toHaveLength(2);
    expect(r.questions[0]!.stemMd).toBe('Thủ đô của Việt Nam là?');
    expect(r.questions[0]!.options.map((o) => o.contentMd)).toEqual([
      'Huế',
      'Hà Nội',
      'Đà Nẵng',
      'Cần Thơ',
    ]);
    expect(correct(r.questions[0]!)).toEqual(['B']);
    expect(correct(r.questions[1]!)).toEqual(['C']);
  });

  it('"Bài n:" với "Đáp án: C" trong từng câu và lời giải', () => {
    const r = parseQuestions(`Bài 1: Diện tích hình chữ nhật 8 cm × 5 cm là
A) 13 cm²
B) 26 cm²
C) 40 cm²
D) 80 cm²
Đáp án: C
Lời giải: S = 8 × 5 = 40.
Bài 2: Số 0 là số nguyên dương.
A) Đúng
B) Sai
Đáp án: B`);
    expect(r.questions).toHaveLength(2);
    expect(correct(r.questions[0]!)).toEqual(['C']);
    expect(r.questions[0]!.explanationMd).toBe('S = 8 × 5 = 40.');
    expect(r.questions[1]!.type).toBe('true_false');
    expect(correct(r.questions[1]!)).toEqual(['B']);
  });

  it('bỏ dòng nhiễu đầu trang: Họ tên, Mã đề, trường, thời gian', () => {
    const r = parseQuestions(`SỞ GD&ĐT HÀ NỘI
TRƯỜNG THCS ABC
ĐỀ KIỂM TRA 15 PHÚT
Thời gian làm bài: 15 phút
Họ và tên: ......................... Lớp: 9A
Mã đề 101
Câu 1. Chọn đáp án đúng
A. một
B. hai
Trang 1/2
Câu 2. Chọn tiếp
A. ba
B. bốn`);
    expect(r.questions).toHaveLength(2);
    expect(r.skippedLines).toBeGreaterThanOrEqual(6);
    expect(r.questions[0]!.options).toHaveLength(2);
    expect(r.questions[0]!.issues).toEqual(['no_answer']);
  });

  it('đáp án kiểu "Câu 1: B" và "1-B" và nhiều đáp án "3-AC"', () => {
    const r = parseQuestions(`Câu 1. a
A. x
B. y
Câu 2. b
A. x
B. y
Câu 3. c
A. x
B. y
C. z
Đáp án
Câu 1: B
2 - A
3-AC`);
    expect(correct(r.questions[0]!)).toEqual(['B']);
    expect(correct(r.questions[1]!)).toEqual(['A']);
    expect(correct(r.questions[2]!)).toEqual(['A', 'C']);
    expect(r.questions[2]!.type).toBe('multiple_choice');
  });

  it('bảng đáp án hai dòng: số rồi chữ', () => {
    const r = parseQuestions(`Câu 1. a
A. x
B. y
Câu 2. b
A. x
B. y
ĐÁP ÁN
1 2
B A`);
    expect(correct(r.questions[0]!)).toEqual(['B']);
    expect(correct(r.questions[1]!)).toEqual(['A']);
  });

  it('đáp án in đậm từ Word (**A.** hoặc **cả phương án**)', () => {
    const r = parseQuestions([
      { text: 'Câu 1. Chọn' },
      { text: 'A. sai' },
      { text: '**B. đúng**' },
      { text: 'C. sai' },
      { text: 'Câu 2. Chọn nữa' },
      { text: '__A.__ đúng' },
      { text: 'B. sai' },
    ]);
    expect(correct(r.questions[0]!)).toEqual(['B']);
    expect(r.questions[0]!.options[1]!.contentMd).toBe('đúng');
    expect(correct(r.questions[1]!)).toEqual(['A']);
  });

  it('câu trả lời ngắn không có phương án', () => {
    const r = parseQuestions(`Câu 1. Tính 15 × 4.
Đáp án: 60
Câu 2. Hình có bốn cạnh bằng nhau và bốn góc vuông là hình gì?`);
    expect(r.questions[0]!.type).toBe('short_text');
    expect(r.questions[0]!.acceptedAnswers).toEqual(['60']);
    expect(r.questions[0]!.issues).toEqual(['no_options']);
    expect(r.questions[1]!.issues).toEqual(['no_options', 'no_answer']);
  });

  it('đề nhiều dòng và phương án nhiều dòng được nối', () => {
    const r = parseQuestions(`Câu 1. Cho hàm số
$y = 2x + 1$. Hệ số góc là
A. 2
(hệ số của x)
B. 1`);
    expect(r.questions[0]!.stemMd).toBe('Cho hàm số\n$y = 2x + 1$. Hệ số góc là');
    expect(r.questions[0]!.options[0]!.contentMd).toBe('2\n(hệ số của x)');
  });

  it('không tách nhầm chữ cái trong câu thành phương án', () => {
    const r = parseQuestions(`Câu 1. Điểm A. nằm trên đường thẳng d) và
A. đúng
B. sai`);
    expect(r.questions[0]!.stemMd).toContain('Điểm A. nằm trên');
    expect(r.questions[0]!.options.map((o) => o.label)).toEqual(['A', 'B']);
  });

  it('bảng đáp án ở đuôi không có tiêu đề vẫn được nhận', () => {
    const r = parseQuestions(`Câu 1. a
A. x
B. y
Câu 2. b
A. x
B. y
1A 2B`);
    expect(r.answerKeyFound).toBe(true);
    expect(correct(r.questions[0]!)).toEqual(['A']);
    expect(correct(r.questions[1]!)).toEqual(['B']);
    expect(r.questions[1]!.options[1]!.contentMd).toBe('y');
  });

  it('ảnh từ Word gắn vào đề hoặc phương án đang mở', () => {
    const r = parseQuestions([
      { text: 'Câu 1. Hình bên là hình gì?', images: ['img/q1.png'] },
      { text: '', images: ['img/q1b.png'] },
      { text: 'A. Tam giác' },
      { text: 'B. Hình vuông', images: ['img/optB.png'] },
    ]);
    expect(r.questions[0]!.imageKeys).toEqual(['img/q1.png', 'img/q1b.png']);
    expect(r.questions[0]!.options[1]!.imageKeys).toEqual(['img/optB.png']);
  });

  it('văn bản rỗng → không có câu', () => {
    expect(parseQuestions('').questions).toEqual([]);
  });
});
