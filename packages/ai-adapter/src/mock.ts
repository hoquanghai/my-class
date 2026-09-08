import type { ExtractedQuestion } from '@lophoc/shared';
import type { ExtractionInput, ExtractionResult, QuestionExtractor } from './types.js';

/** Nhà cung cấp giả lập: không gọi mạng, trả 2 câu mẫu cho mỗi trang. Dùng cho dev/test. */
export class MockExtractor implements QuestionExtractor {
  readonly provider = 'mock';
  readonly model = 'mock-v1';

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const questions: ExtractedQuestion[] = [];
    input.pages.forEach((page, i) => {
      const n = i + 1;
      const label = page.kind === 'pdf' ? `PDF` : `ảnh ${n}`;
      questions.push({
        number: questions.length + 1,
        type: 'single_choice',
        stem: `(Mẫu từ ${label}) Nghiệm của phương trình $2x + ${n} = ${n + 8}$ là:`,
        options: [
          { label: 'A', content: '$x = 3$', isCorrect: false },
          { label: 'B', content: '$x = 4$', isCorrect: true },
          { label: 'C', content: '$x = 5$', isCorrect: false },
          { label: 'D', content: '$x = 6$', isCorrect: false },
        ],
        answer: 'B',
        explanation: null,
      });
      questions.push({
        number: questions.length + 1,
        type: 'short_text',
        stem: `(Mẫu từ ${label}) Tính $${n} \\times 4$.`,
        options: [],
        answer: String(n * 4),
        explanation: null,
      });
    });
    return {
      questions,
      provider: this.provider,
      model: this.model,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}
