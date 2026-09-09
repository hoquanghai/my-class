import { parseQuestions } from './question-parser.js';

/** Cấu trúc y như đề Word thuvienhoclieu (đã thay công thức bằng LaTeX). */
const SAMPLE = `thuvienhoclieu.com
BÀI 5. ỨNG DỤNG ĐẠO HÀM ĐỂ GIẢI QUYẾT MỘT SỐ VẤN ĐỀ LIÊN QUAN ĐẾN THỰC TIỄN
PHẦN I. TRẮC NGHIỆM 4 LỰA CHỌN
A. Tốc độ thay đổi của một đại lượng
Câu 1. Một đại lượng được mô tả bởi hàm số $s(t) = t^2$. Tốc độ thay đổi trung bình của $s$ trên đoạn $[1; 3]$ bằng
A. $4$.
B. $2$.
C. $8$.
D. $1$.
B. Vận tốc và gia tốc
Câu 2. Một chất điểm chuyển động với $s(t) = t^3$. Vận tốc tức thời tại $t = 2$ bằng
A. $12$ m/s.
B. $6$ m/s.
C. $8$ m/s.
D. $4$ m/s.
Giáo viên: Nguyễn Văn A – Trung tâm Ánh Sáng
Trang 1
PHẦN III. CÂU TRẢ LỜI NGẮN
Câu 3. Tính $\\int_0^1 2x\\,dx$.
----- HẾT -----
ĐÁP ÁN
1A 2A`;

describe('parseQuestions: bỏ râu ria', () => {
  it('tiêu đề BÀI/PHẦN, tiêu đề mục "A. …", tên giáo viên/trung tâm, chân trang không thành câu hỏi', () => {
    const r = parseQuestions(SAMPLE);
    expect(r.questions.map((q) => q.number)).toEqual([1, 2, 3]);
    expect(r.questions[0]!.stemMd).toMatch(/^Một đại lượng/);
    expect(r.questions[0]!.options.map((o) => o.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(r.questions[0]!.options[0]!.isCorrect).toBe(true);
    // Tiêu đề mục "B. Vận tốc và gia tốc" không dính vào phương án D của câu 1
    expect(r.questions[0]!.options[3]!.contentMd).toBe('$1$.');
    expect(r.questions[1]!.options).toHaveLength(4);
    expect(r.questions[1]!.stemMd).not.toContain('Giáo viên');
    expect(r.questions[2]!.type).toBe('short_text');
    expect(r.questions[2]!.stemMd).toBe('Tính $\\int_0^1 2x\\,dx$.');
    // Bảng đáp án dạng số cho câu trả lời ngắn chưa được hỗ trợ (định dạng đề 2025, làm sau)
    expect(r.questions[2]!.issues).toContain('no_answer');
    expect(r.answerKeyFound).toBe(true);
    expect(r.skippedLines).toBeGreaterThanOrEqual(7);
  });

  it('"Bài N." viết thường là tiêu đề khi đề dùng "Câu"; là câu hỏi khi cả đề dùng "Bài"', () => {
    const mixed = parseQuestions(`Bài 5. Ứng dụng đạo hàm
Câu 1. Tính $f'(1)$ với $f(x) = x^2$.
A. 1
B. 2
C. 3
D. 4`);
    expect(mixed.questions.map((q) => q.number)).toEqual([1]);

    const onlyBai = parseQuestions(`Bài 1. Giải phương trình $x^2 = 1$.
Bài 2. Tính $\\lim_{x \\to 0} \\frac{\\sin x}{x}$.`);
    expect(onlyBai.questions.map((q) => q.number)).toEqual([1, 2]);
    expect(onlyBai.questions.every((q) => q.type === 'short_text')).toBe(true);
  });
});
