import type { ScheduleItem } from './schemas.js';

export interface StudentDto {
  id: string;
  name: string;
  studentCode: string | null;
  parentPhone: string | null;
  sortOrder: number;
}

export interface ClassSummaryDto {
  id: string;
  name: string;
  /** Mã môn trong `SUBJECTS`; lớp tạo trước khi có danh mục có thể còn chữ tự do hoặc null. */
  subject: string | null;
  /** Khối 6–12 dạng chuỗi; null với lớp cũ. */
  grade: string | null;
  code: string;
  rosterLocked: boolean;
  studentCount: number;
  createdAt: string;
}

export interface ClassDetailDto extends ClassSummaryDto {
  schedule: ScheduleItem[];
  requireStudentCode: boolean;
  students: StudentDto[];
}

export interface RosterImportResultDto {
  students: StudentDto[];
  added: number;
}

export interface LimitsDto {
  maxClasses: number;
  maxStudentsPerClass: number;
  aiPagesPerMonth: number;
  historyDays: number;
  exportEnabled: boolean;
}

/** Mã lỗi nghiệp vụ trả về trong `code` của body lỗi API. */
export const ErrorCodes = {
  LIMIT_CLASSES: 'LIMIT_CLASSES',
  LIMIT_STUDENTS: 'LIMIT_STUDENTS',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  ROSTER_LOCKED: 'ROSTER_LOCKED',
  LIMIT_AI_PAGES: 'LIMIT_AI_PAGES',
  AI_DISABLED: 'AI_DISABLED',
  RUN_ACTIVE: 'RUN_ACTIVE',
  RUN_NOT_OPEN: 'RUN_NOT_OPEN',
  STUDENT_BOUND: 'STUDENT_BOUND',
} as const;
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ApiErrorBody {
  statusCode: number;
  code?: ErrorCode | string;
  message: string;
}
