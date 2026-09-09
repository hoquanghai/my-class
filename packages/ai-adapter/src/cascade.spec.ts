import type { ExtractedQuestion } from '@lophoc/shared';
import { PDFDocument } from 'pdf-lib';
import { CascadeExtractor } from './cascade.js';
import {
  ExtractionError,
  type ExtractionInput,
  type ExtractionResult,
  type QuestionExtractor,
} from './types.js';

type Handler = (input: ExtractionInput) => ExtractedQuestion[];

interface Fake extends QuestionExtractor {
  calls: ExtractionInput[];
}

function fake(model: string, handler: Handler, tokens = { input: 100, output: 50 }): Fake {
  const calls: ExtractionInput[] = [];
  return {
    provider: `fake-${model}`,
    model,
    calls,
    async extract(input): Promise<ExtractionResult> {
      calls.push(input);
      return {
        questions: handler(input),
        provider: `fake-${model}`,
        model,
        inputTokens: tokens.input,
        outputTokens: tokens.output,
      };
    },
  };
}

function failing(model: string, code: ExtractionError['code'] = 'provider_error'): Fake {
  const calls: ExtractionInput[] = [];
  return {
    provider: `fake-${model}`,
    model,
    calls,
    async extract(input) {
      calls.push(input);
      throw new ExtractionError(`${model} lỗi`, code);
    },
  };
}

function good(
  page: number | null,
  n: number,
  extra: Partial<ExtractedQuestion> = {},
): ExtractedQuestion {
  return {
    number: n,
    page,
    type: 'single_choice',
    stem: `Câu ${n}: tính $f'(x)$ với $f(x) = x^2$.`,
    options: ['A', 'B', 'C', 'D'].map((label, i) => ({
      label,
      content: `$${i + 1}x$`,
      isCorrect: i === 1,
    })),
    answer: 'B',
    explanation: null,
    ...extra,
  };
}

/** Câu mất công thức như khi đọc file MathType: "hàm số ." và phương án chỉ có dấu chấm. */
function broken(page: number | null, n: number): ExtractedQuestion {
  return good(page, n, {
    stem: 'Một đại lượng được mô tả bởi hàm số . Tốc độ thay đổi trung bình bằng',
    options: ['A', 'B', 'C', 'D'].map((label) => ({ label, content: '.', isCorrect: null })),
  });
}

const images = (n: number): ExtractionInput => ({
  pages: Array.from({ length: n }, () => ({
    kind: 'image' as const,
    mime: 'image/png' as const,
    data: Buffer.alloc(1),
  })),
  hints: { subject: 'Toán', grade: '12' },
});

describe('CascadeExtractor', () => {
  it('kết quả model rẻ đạt chuẩn thì không gọi model mạnh', async () => {
    const primary = fake('flash', () => [good(1, 1), good(2, 2), good(3, 3)]);
    const escalation = fake('sonnet', () => []);
    const result = await new CascadeExtractor({ primary, escalation }).extract(images(3));
    expect(escalation.calls).toHaveLength(0);
    expect(result.questions).toHaveLength(3);
    expect(result.provider).toBe('cascade');
    expect(result.model).toBe('flash → sonnet');
    expect(result.escalatedPages).toEqual([]);
    expect(result.stages).toHaveLength(1);
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(50);
  });

  it('chỉ trang có câu lỗi được gửi lại cho model mạnh, câu của trang đó bị thay thế', async () => {
    const primary = fake('flash', () => [good(1, 1), broken(2, 2), broken(2, 3), good(3, 4)]);
    const escalation = fake('sonnet', (input) => {
      expect(input.pages).toHaveLength(1);
      expect(input.pageContext).toEqual({ first: 2, count: 1, total: 3 });
      expect(input.hints?.subject).toBe('Toán');
      return [good(1, 2), good(1, 3)]; // model thấy một trang nên báo page = 1
    });
    const result = await new CascadeExtractor({ primary, escalation }).extract(images(3));
    expect(escalation.calls).toHaveLength(1);
    expect(result.escalatedPages).toEqual([2]);
    expect(result.questions.map((q) => [q.page, q.number])).toEqual([
      [1, 1],
      [2, 2],
      [2, 3],
      [3, 4],
    ]);
    expect(result.questions[1]!.options[0]!.content).toBe('$1x$');
    expect(result.stages?.map((s) => s.pages)).toEqual([[1, 2, 3], [2]]);
    expect(result.inputTokens).toBe(200);
  });

  it('model rẻ lỗi API thì model mạnh làm cả tài liệu', async () => {
    const primary = failing('flash');
    const escalation = fake('sonnet', () => [good(1, 1), good(2, 2)]);
    const result = await new CascadeExtractor({ primary, escalation }).extract(images(2));
    expect(escalation.calls[0]!.pages).toHaveLength(2);
    expect(escalation.calls[0]!.pageContext).toBeUndefined();
    expect(result.escalatedPages).toEqual([1, 2]);
    expect(result.stages?.[0]).toMatchObject({ model: 'flash', error: 'flash lỗi' });
    expect(result.questions).toHaveLength(2);
  });

  it('thiếu API key (not_configured) thì ném lỗi ngay, không leo thang', async () => {
    const primary = failing('flash', 'not_configured');
    const escalation = fake('sonnet', () => []);
    await expect(
      new CascadeExtractor({ primary, escalation }).extract(images(1)),
    ).rejects.toMatchObject({ code: 'not_configured' });
    expect(escalation.calls).toHaveLength(0);
  });

  it('maxEscalationShare giới hạn số trang leo thang, ưu tiên trang nhiều cờ', async () => {
    const primary = fake('flash', () => [
      broken(1, 1),
      broken(2, 2),
      broken(2, 3),
      broken(2, 4),
      broken(3, 5),
      broken(3, 6),
    ]);
    const escalation = fake('sonnet', (input) => [good(1, input.pageContext!.first * 10)]);
    const result = await new CascadeExtractor({
      primary,
      escalation,
      maxEscalationShare: 0.3,
    }).extract(images(3));
    expect(result.escalatedPages).toEqual([2]);
    expect(result.questions.map((q) => q.number)).toEqual([1, 20, 5, 6]);
  });

  it('model mạnh lỗi ở một trang thì giữ kết quả model rẻ của trang đó', async () => {
    const primary = fake('flash', () => [good(1, 1), broken(2, 2)]);
    const escalation = failing('sonnet');
    const result = await new CascadeExtractor({ primary, escalation }).extract(images(2));
    expect(result.escalatedPages).toEqual([]);
    expect(result.questions).toHaveLength(2);
    expect(result.stages?.[1]).toMatchObject({ pages: [2], error: 'sonnet lỗi' });
  });

  it('câu lỗi không rõ trang: model mạnh làm lại cả tài liệu', async () => {
    const primary = fake('flash', () => [good(1, 1), broken(null, 2)]);
    const escalation = fake('sonnet', () => [good(1, 1), good(2, 2)]);
    const result = await new CascadeExtractor({ primary, escalation }).extract(images(2));
    expect(escalation.calls[0]!.pages).toHaveLength(2);
    expect(result.escalatedPages).toEqual([1, 2]);
    expect(result.questions[1]!.options[0]!.content).toBe('$1x$');
  });

  it('PDF nhiều trang: trang leo thang được tách thành PDF một trang', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    doc.addPage([200, 200]);
    doc.addPage([200, 200]);
    const pdf = Buffer.from(await doc.save());

    const primary = fake('flash', () => [good(1, 1), good(2, 2), broken(3, 3)]);
    const escalation = fake('sonnet', () => [good(1, 3)]);
    const result = await new CascadeExtractor({ primary, escalation }).extract({
      pages: [{ kind: 'pdf', data: pdf, filename: 'de.pdf' }],
    });
    expect(primary.calls[0]!.pages).toHaveLength(1); // cả tài liệu, không tách
    const sent = escalation.calls[0]!.pages[0]!;
    expect(sent.kind).toBe('pdf');
    const reloaded = await PDFDocument.load(sent.data);
    expect(reloaded.getPageCount()).toBe(1);
    expect(result.escalatedPages).toEqual([3]);
    expect(result.questions.map((q) => q.page)).toEqual([1, 2, 3]);
  });
});
