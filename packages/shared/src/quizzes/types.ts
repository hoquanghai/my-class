import type { QuestionDto } from '../questions/types.js';

export interface QuizSummaryDto {
  id: string;
  title: string;
  description: string | null;
  defaultTimeLimitSec: number;
  questionCount: number;
  totalPoints: number;
  updatedAt: string;
}

export interface QuizItemDto {
  id: string;
  questionId: string;
  sortOrder: number;
  /** null → dùng defaultTimeLimitSec của đề */
  timeLimitSec: number | null;
  points: number;
  question: QuestionDto;
}

export interface QuizDetailDto extends QuizSummaryDto {
  items: QuizItemDto[];
}
