import { extractedToParsed } from './extracted.js';

describe('extractedToParsed', () => {
  it('đánh dấu đáp án từ chữ cái khi AI không gắn isCorrect', () => {
    const [q] = extractedToParsed([
      {
        number: 1,
        type: null,
        stem: 'Thủ đô Việt Nam?',
        options: [
          { label: 'a', content: 'Huế', isCorrect: null },
          { label: 'b', content: 'Hà Nội', isCorrect: null },
        ],
        answer: 'B',
        explanation: null,
      },
    ]);
    expect(q!.type).toBe('single_choice');
    expect(q!.options.map((o) => [o.label, o.isCorrect])).toEqual([
      ['A', false],
      ['B', true],
    ]);
    expect(q!.issues).toEqual([]);
  });

  it('suy ra đúng/sai, nhiều lựa chọn, trả lời ngắn và issues', () => {
    const [tf, multi, short, none] = extractedToParsed([
      {
        number: null,
        type: null,
        stem: 'Số 0 dương.',
        options: [
          { label: 'A', content: 'Đúng', isCorrect: false },
          { label: 'B', content: 'Sai', isCorrect: true },
        ],
        answer: null,
        explanation: 'Vì 0 không dương',
      },
      {
        number: null,
        type: null,
        stem: 'Chọn nghiệm',
        options: [
          { label: 'A', content: '1', isCorrect: true },
          { label: 'B', content: '2', isCorrect: true },
          { label: 'C', content: '3', isCorrect: false },
        ],
        answer: null,
        explanation: null,
      },
      {
        number: null,
        type: 'short_text',
        stem: 'Tính 2+2',
        options: [],
        answer: '4',
        explanation: null,
      },
      {
        number: null,
        type: null,
        stem: '',
        options: [{ label: 'A', content: 'x', isCorrect: null }],
        answer: null,
        explanation: null,
      },
    ]);
    expect(tf!.type).toBe('true_false');
    expect(tf!.explanationMd).toBe('Vì 0 không dương');
    expect(multi!.type).toBe('multiple_choice');
    expect(short!.type).toBe('short_text');
    expect(short!.acceptedAnswers).toEqual(['4']);
    expect(none!.issues).toEqual(['empty_stem', 'too_few_options', 'no_answer']);
  });
});
