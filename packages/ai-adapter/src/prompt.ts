import type { ExtractionInput } from './types.js';

export const SYSTEM_PROMPT = `Bạn là trợ lý số hóa đề kiểm tra cho giáo viên Việt Nam.
Nhiệm vụ: đọc ảnh chụp hoặc PDF đề thi và trích xuất TOÀN BỘ câu hỏi thành dữ liệu có cấu trúc.

Quy tắc:
- Giữ nguyên nội dung tiếng Việt, không dịch, không rút gọn, không thêm câu hỏi không có trong đề.
- Công thức toán, hóa, lý viết bằng LaTeX trong dấu $…$ (ví dụ $x^2 - 5x + 6 = 0$, $\\frac{1}{2}$, $H_2SO_4$). Không được bỏ sót công thức: nếu đề có biểu thức thì stem/phương án phải chứa biểu thức đó.
- Mỗi phương án giữ đúng nhãn trong đề (A, B, C, D…). Nếu đề đánh dấu đáp án đúng (khoanh tròn, in đậm, gạch chân, dấu *, hoặc có bảng đáp án cuối đề) thì đặt isCorrect = true cho phương án đó, các phương án khác false. Không rõ thì để null.
- Câu tự luận / trả lời ngắn: options rỗng; nếu đề có đáp án thì ghi vào answer.
- Câu đúng-sai nhiều ý (a, b, c, d): mỗi ý là một phương án, isCorrect = true nếu ý đó đúng; type = multiple_choice.
- type: single_choice (một đáp án), multiple_choice (nhiều đáp án), true_false (chỉ Đúng/Sai), short_text (không có phương án); không chắc thì null.
- page: số trang (đếm từ 1 trong tài liệu gửi kèm) chứa câu hỏi; câu kéo dài nhiều trang lấy trang bắt đầu.
- Bỏ qua phần đầu trang (tên trường, họ tên, mã đề, thời gian làm bài) và số trang.
- Nếu ảnh mờ không đọc được một câu, vẫn trích xuất phần đọc được và để trống phần còn lại.`;

export function buildUserText(input: ExtractionInput): string {
  const hints: string[] = [];
  if (input.hints?.subject) hints.push(`Môn: ${input.hints.subject}`);
  if (input.hints?.grade) hints.push(`Khối/lớp: ${input.hints.grade}`);
  const pageCount = input.pages.length;
  const ctx = input.pageContext;
  const scope = ctx
    ? ctx.count === 1
      ? `Đây là trang ${ctx.first} của tài liệu ${ctx.total} trang.`
      : `Đây là các trang ${ctx.first}–${ctx.first + ctx.count - 1} của tài liệu ${ctx.total} trang.`
    : '';
  return [
    `Trích xuất tất cả câu hỏi trong ${pageCount === 1 ? 'tài liệu' : `${pageCount} trang`} đính kèm theo đúng cấu trúc JSON yêu cầu.`,
    scope,
    ctx
      ? `Chỉ trích xuất câu hỏi có trên phần này và ghi page theo số trang thật (bắt đầu từ ${ctx.first}).`
      : '',
    hints.length ? hints.join('. ') + '.' : '',
  ]
    .filter(Boolean)
    .join('\n');
}
