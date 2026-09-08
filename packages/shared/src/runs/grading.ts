import { normalizeText } from '../text/normalize.js';
import type { QuestionSnapshot } from './types.js';

export interface GradeInput {
  selectedOptionIds?: string[] | null;
  textAnswer?: string | null;
}

export interface GradeResult {
  isCorrect: boolean;
  pointsAwarded: number;
}

/**
 * Chấm một câu trả lời theo bản chụp câu hỏi.
 * - Một lựa chọn / đúng-sai: chọn đúng một phương án và đó là đáp án.
 * - Nhiều lựa chọn: tập phương án chọn trùng khớp tập đáp án (đúng hết mới có điểm).
 * - Trả lời ngắn: chuẩn hóa (bỏ dấu, thường hóa, gộp khoảng trắng) khớp một đáp án chấp nhận.
 * Điểm: trọn `points` khi đúng, 0 khi sai.
 */
export function gradeAnswer(
  snapshot: QuestionSnapshot,
  answer: GradeInput,
  points: number,
): GradeResult {
  let isCorrect = false;
  if (snapshot.type === 'short_text') {
    const given = normalizeText(answer.textAnswer ?? '');
    isCorrect =
      given.length > 0 && snapshot.acceptedAnswers.some((a) => normalizeText(a) === given);
  } else {
    const selected = new Set(answer.selectedOptionIds ?? []);
    const correct = new Set(snapshot.correctOptionIds);
    if (snapshot.type === 'multiple_choice') {
      isCorrect = selected.size === correct.size && [...selected].every((id) => correct.has(id));
    } else {
      isCorrect = selected.size === 1 && correct.has([...selected][0] as string);
    }
  }
  return { isCorrect, pointsAwarded: isCorrect ? points : 0 };
}

/** Xếp hạng: điểm giảm dần, cùng điểm thì tổng thời gian phản hồi tăng dần, rồi số câu đúng. */
export function rankEntries<
  T extends { score: number; totalResponseMs: number; correctCount: number },
>(entries: T[]): (T & { rank: number })[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.score - a.score || a.totalResponseMs - b.totalResponseMs || b.correctCount - a.correctCount,
  );
  let rank = 0;
  let prev: T | null = null;
  return sorted.map((e, i) => {
    if (!prev || prev.score !== e.score || prev.totalResponseMs !== e.totalResponseMs) rank = i + 1;
    prev = e;
    return { ...e, rank };
  });
}
