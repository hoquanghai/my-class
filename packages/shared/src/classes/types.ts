import type { Gender, ScheduleItem } from './schemas.js';
import type { AttendanceStatus } from '../attendance/schemas.js';
import type { AttendanceSummary } from '../attendance/types.js';
import type { RunMode } from '../runs/schemas.js';

export interface StudentDto {
  id: string;
  name: string;
  studentCode: string | null;
  /** YYYY-MM-DD */
  dateOfBirth: string | null;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  school: string | null;
  parentName: string | null;
  parentPhone: string | null;
  note: string | null;
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
  /** Số dòng bị bỏ vì hết chỗ khi nhập với `?fit=1`. */
  skipped: number;
}

/** Giới hạn gói miễn phí (feature flag `free.*`). */
export interface FreeLimitsDto {
  maxClasses: number;
  maxStudentsPerClass: number;
  /** Tổng học sinh trong mọi lớp chưa xóa của một giáo viên. */
  maxStudentsPerTeacher: number;
  aiPagesPerMonth: number;
  historyDays: number;
  exportEnabled: boolean;
}

/** `GET /limits`: giới hạn kèm mức đang dùng của giáo viên hiện tại. */
export interface LimitsDto extends FreeLimitsDto {
  usage: { classes: number; students: number };
}

/** `details` của lỗi 403 LIMIT_STUDENTS. */
export interface StudentLimitDetails {
  scope: 'teacher' | 'class';
  limit: number;
  current: number;
  requested: number;
  /** Số học sinh còn có thể thêm; web dùng để đề nghị "chỉ nhập N đầu". */
  remaining: number;
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
  /** Học sinh đã nộp bài (tự làm): không nhận thêm câu trả lời. */
  RUN_SUBMITTED: 'RUN_SUBMITTED',
  STUDENT_BOUND: 'STUDENT_BOUND',
} as const;
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ApiErrorBody {
  statusCode: number;
  code?: ErrorCode | string;
  message: string;
  /** Số liệu đi kèm một số lỗi nghiệp vụ (ví dụ LIMIT_STUDENTS). */
  details?: Record<string, unknown>;
}

/** Một lượt kiểm tra đã kết thúc mà học sinh có mặt trong bảng kết quả (tham gia buổi hoặc có bài nộp). */
export interface StudentRunHistoryItemDto {
  runId: string;
  sessionId: string;
  quizTitle: string;
  mode: RunMode;
  endedAt: string;
  score: number;
  totalPoints: number;
  /** score/totalPoints làm tròn (%), null khi đề không có điểm */
  percent: number | null;
  correctCount: number;
  answeredCount: number;
  questionCount: number;
  rank: number | null;
  /** Số học sinh trong bảng kết quả của lượt */
  participants: number;
  /** Tự làm: lúc bấm nộp bài; null nếu được chốt khi hết giờ / giáo viên kết thúc */
  submittedAt: string | null;
}

/** Hồ sơ học sinh cho giáo viên: thông tin, điểm danh, lịch sử bài kiểm tra. */
export interface StudentProfileDto {
  student: StudentDto;
  classId: string;
  className: string;
  attendance: {
    items: {
      sessionId: string;
      startedAt: string;
      status: AttendanceStatus;
      note: string | null;
    }[];
    summary: AttendanceSummary;
    rate: { present: number; total: number };
    /** Buổi cũ hơn cửa sổ lịch sử của gói (bị ẩn) */
    hiddenCount: number;
  };
  quizzes: {
    items: StudentRunHistoryItemDto[];
    count: number;
    averagePercent: number | null;
    bestPercent: number | null;
  };
}
