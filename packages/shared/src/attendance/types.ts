import type { AttendanceStatus, SessionStatus } from './schemas.js';

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export interface AttendanceRecordDto {
  studentId: string;
  name: string;
  status: AttendanceStatus;
  note: string | null;
}

export interface SessionSummaryDto {
  id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  summary: AttendanceSummary;
  hasFeedback: boolean;
}

export interface SessionDetailDto {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  note: string | null;
  records: AttendanceRecordDto[];
  summary: AttendanceSummary;
  hasFeedback: boolean;
}

export interface SessionListDto {
  sessions: SessionSummaryDto[];
  hiddenCount: number;
  historyDays: number;
}

export interface StudentAttendanceHistoryDto {
  student: { id: string; name: string };
  items: { sessionId: string; startedAt: string; status: AttendanceStatus; note: string | null }[];
  rate: { present: number; total: number };
  hiddenCount: number;
}
