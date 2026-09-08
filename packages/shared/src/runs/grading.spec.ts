import { gradeAnswer, rankEntries } from './grading.js';
import type { QuestionSnapshot } from './types.js';

const single: QuestionSnapshot = {
  type: 'single_choice',
  stemMd: 'x',
  explanationMd: null,
  options: [
    { id: 'a', label: 'A', contentMd: '1' },
    { id: 'b', label: 'B', contentMd: '2' },
  ],
  correctOptionIds: ['b'],
  acceptedAnswers: [],
};
const multi: QuestionSnapshot = {
  ...single,
  type: 'multiple_choice',
  correctOptionIds: ['a', 'b'],
};
const short: QuestionSnapshot = {
  ...single,
  type: 'short_text',
  options: [],
  correctOptionIds: [],
  acceptedAnswers: ['Hình vuông', '60'],
};

describe('gradeAnswer', () => {
  it('một lựa chọn: đúng phương án → điểm trọn', () => {
    expect(gradeAnswer(single, { selectedOptionIds: ['b'] }, 2)).toEqual({
      isCorrect: true,
      pointsAwarded: 2,
    });
    expect(gradeAnswer(single, { selectedOptionIds: ['a'] }, 2)).toEqual({
      isCorrect: false,
      pointsAwarded: 0,
    });
    expect(gradeAnswer(single, { selectedOptionIds: ['a', 'b'] }, 2).isCorrect).toBe(false);
    expect(gradeAnswer(single, { selectedOptionIds: [] }, 2).isCorrect).toBe(false);
  });

  it('nhiều lựa chọn: đúng hết mới có điểm', () => {
    expect(gradeAnswer(multi, { selectedOptionIds: ['b', 'a'] }, 1).isCorrect).toBe(true);
    expect(gradeAnswer(multi, { selectedOptionIds: ['a'] }, 1).isCorrect).toBe(false);
    expect(gradeAnswer(multi, { selectedOptionIds: ['a', 'b', 'c'] }, 1).isCorrect).toBe(false);
  });

  it('trả lời ngắn: không phân biệt dấu, hoa thường, khoảng trắng', () => {
    expect(gradeAnswer(short, { textAnswer: '  hinh   VUONG ' }, 1).isCorrect).toBe(true);
    expect(gradeAnswer(short, { textAnswer: '60' }, 1).isCorrect).toBe(true);
    expect(gradeAnswer(short, { textAnswer: 'hình tròn' }, 1).isCorrect).toBe(false);
    expect(gradeAnswer(short, { textAnswer: '' }, 1).isCorrect).toBe(false);
  });
});

describe('rankEntries', () => {
  it('xếp theo điểm, rồi thời gian, đồng hạng khi bằng nhau', () => {
    const ranked = rankEntries([
      { name: 'A', score: 2, totalResponseMs: 5000, correctCount: 2 },
      { name: 'B', score: 3, totalResponseMs: 9000, correctCount: 3 },
      { name: 'C', score: 2, totalResponseMs: 4000, correctCount: 2 },
      { name: 'D', score: 2, totalResponseMs: 4000, correctCount: 2 },
    ]);
    expect(ranked.map((r) => [r.name, r.rank])).toEqual([
      ['B', 1],
      ['C', 2],
      ['D', 2],
      ['A', 4],
    ]);
  });
});
