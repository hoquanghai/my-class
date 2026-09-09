import type { ExtractedQuestion } from '@lophoc/shared';
import { assessQuestions, latexBalanced, questionFlags } from './quality.js';

function q(over: Partial<ExtractedQuestion> = {}): ExtractedQuestion {
  return {
    number: 1,
    page: 1,
    type: 'single_choice',
    stem: 'Đạo hàm của $f(x) = x^2$ là',
    options: [
      { label: 'A', content: '$2x$', isCorrect: true },
      { label: 'B', content: '$x$', isCorrect: false },
      { label: 'C', content: '$2$', isCorrect: false },
      { label: 'D', content: '$x^2$', isCorrect: false },
    ],
    answer: 'A',
    explanation: null,
    ...over,
  };
}

describe('latexBalanced', () => {
  it('đếm $ và ngoặc nhọn', () => {
    expect(latexBalanced('$\\frac{1}{2}$ và $x^{2}$')).toBe(true);
    expect(latexBalanced('$x^2')).toBe(false);
    expect(latexBalanced('$\\frac{1}{2$')).toBe(false);
    expect(latexBalanced('giá 5\\$')).toBe(true);
  });
});

describe('questionFlags', () => {
  it('câu chuẩn không có cờ', () => {
    expect(questionFlags(q(), 4)).toEqual([]);
  });

  it('công thức rơi: khoảng trắng trước dấu chấm, phương án chỉ có dấu chấm, câu kết thúc lửng', () => {
    const flags = questionFlags(
      q({
        stem: 'Một đại lượng được mô tả bởi hàm số . Tốc độ thay đổi bằng',
        options: [
          { label: 'A', content: '.', isCorrect: null },
          { label: 'B', content: 'm/s.', isCorrect: null },
          { label: 'C', content: '$3$', isCorrect: null },
          { label: 'D', content: '$4$', isCorrect: null },
        ],
      }),
      4,
    );
    expect(flags).toContain('lost_formula');
    expect(flags).toContain('empty_option');
  });

  it('LaTeX lệch, thiếu phương án, số phương án lạ', () => {
    expect(questionFlags(q({ stem: 'Tính $x^2' }), 4)).toContain('unbalanced_latex');
    expect(questionFlags(q({ options: q().options.slice(0, 1) }), 4)).toContain('too_few_options');
    expect(questionFlags(q({ options: q().options.slice(0, 3) }), 4)).toContain('odd_option_count');
    // Đúng/Sai hai phương án và câu nhiều ý không bị coi là lạ
    expect(questionFlags(q({ options: q().options.slice(0, 2) }), 4)).toEqual([]);
    expect(
      questionFlags(q({ type: 'multiple_choice', options: q().options.slice(0, 3) }), 4),
    ).toEqual([]);
  });
});

describe('assessQuestions', () => {
  it('gom cờ theo trang, trang nhiều cờ xếp trước, ghi nhận câu không rõ trang', () => {
    const report = assessQuestions([
      q({ page: 1 }),
      q({ page: 2, stem: 'Tính $x^2' }),
      q({ page: 3, stem: 'Tính $x^2', options: [{ label: 'A', content: '.', isCorrect: null }] }),
      q({ page: null, stem: '' }),
    ]);
    expect(report.total).toBe(4);
    expect(report.flagged.map((f) => f.index)).toEqual([1, 2, 3]);
    expect(report.flaggedPages).toEqual([3, 2]);
    expect(report.unknownPageFlagged).toBe(true);
  });
});
