import type { ParseResult } from './parser/types.js';
import type { Difficulty, QuestionSource, QuestionType } from './schemas.js';

export interface QuestionOptionDto {
  id: string;
  label: string;
  contentMd: string;
  imageKey: string | null;
  isCorrect: boolean;
  sortOrder: number;
}

export interface QuestionDto {
  id: string;
  type: QuestionType;
  stemMd: string;
  explanationMd: string | null;
  imageKey: string | null;
  subject: string | null;
  grade: string | null;
  topic: string | null;
  difficulty: Difficulty | null;
  source: QuestionSource;
  acceptedAnswers: string[];
  options: QuestionOptionDto[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionListDto {
  items: QuestionDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QuestionFacetsDto {
  subjects: string[];
  grades: string[];
  topics: string[];
}

export interface BulkCreateResultDto {
  created: number;
  ids: string[];
}

export interface MediaUploadDto {
  key: string;
  url: string;
}

/** Hạn mức trích xuất AI theo tháng. */
export interface AiQuotaDto {
  enabled: boolean;
  provider: string;
  limit: number;
  used: number;
  remaining: number;
  /** YYYY-MM */
  month: string;
}

export type AiJobStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface AiJobCreatedDto {
  jobId: string;
  pageCount: number;
  status: AiJobStatus;
  /** Cảnh báo khi chuẩn bị file (ví dụ Word có công thức MathType không đọc được). */
  warnings: string[];
}

export interface AiJobDto {
  id: string;
  status: AiJobStatus;
  pageCount: number;
  result: ParseResult | null;
  error: string | null;
  warnings: string[];
  createdAt: string;
  finishedAt: string | null;
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  nhan_biet: 'Nhận biết',
  thong_hieu: 'Thông hiểu',
  van_dung: 'Vận dụng',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Một lựa chọn',
  multiple_choice: 'Nhiều lựa chọn',
  true_false: 'Đúng / Sai',
  short_text: 'Trả lời ngắn',
};
