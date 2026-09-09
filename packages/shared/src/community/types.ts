import type { Difficulty, QuestionType } from '../questions/schemas.js';
import type { ReportReason, SharedSetStatus } from './schemas.js';

export interface SharedSetAuthorDto {
  id: string;
  name: string;
  school: string | null;
  avatarUrl: string | null;
}

/** Bản chụp một câu khi đăng: sửa ngân hàng sau đó không đổi bài đã đăng. Có đáp án (chỉ giáo viên xem). */
export interface SharedQuestionSnapshot {
  type: QuestionType;
  stemMd: string;
  explanationMd: string | null;
  imageKey: string | null;
  difficulty: Difficulty | null;
  topic: string | null;
  options: { label: string; contentMd: string; isCorrect: boolean; imageKey: string | null }[];
  acceptedAnswers: string[];
}

export interface SharedSetViewerDto {
  isAuthor: boolean;
  liked: boolean;
  /** Đã từng lấy bộ này về ngân hàng của mình */
  cloned: boolean;
  reported: boolean;
}

export interface SharedSetSummaryDto {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  grade: string;
  topic: string | null;
  /** Nguồn tự khai (sách, đề trường…) */
  source: string | null;
  status: SharedSetStatus;
  /** Bị ẩn do bị báo cáo nhiều / quản trị ẩn; chỉ tác giả còn thấy */
  hidden: boolean;
  featured: boolean;
  version: number;
  questionCount: number;
  questionTypes: QuestionType[];
  difficulties: Difficulty[];
  likeCount: number;
  cloneCount: number;
  commentCount: number;
  author: SharedSetAuthorDto;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  viewer: SharedSetViewerDto;
}

export interface SharedSetQuestionDto {
  /** 1-based, dùng để góp ý "câu số N" */
  index: number;
  originQuestionId: string | null;
  snapshot: SharedQuestionSnapshot;
}

/** Bộ đề đã được dùng thế nào trong lớp học thật (gộp cả tác giả và người lấy về). */
export interface SharedSetUsageDto {
  runs: number;
  answers: number;
  correctPercent: number | null;
}

export interface SharedSetDetailDto extends SharedSetSummaryDto {
  questions: SharedSetQuestionDto[];
  usage: SharedSetUsageDto;
  /** Chỉ tác giả thấy số đúng; người khác nhận 0 */
  reportCount: number;
}

export interface SharedSetListDto {
  items: SharedSetSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SharedSetCommentDto {
  id: string;
  setId: string;
  author: SharedSetAuthorDto;
  body: string;
  questionIndex: number | null;
  /** Tác giả bộ đề đánh dấu đã sửa theo góp ý */
  resolvedAt: string | null;
  createdAt: string;
  viewer: { isMine: boolean; canModerate: boolean };
}

export interface CloneSetResultDto {
  added: number;
  questionIds: string[];
  quizId: string | null;
}

export interface LikeSetResultDto {
  liked: boolean;
  likeCount: number;
}

export interface ReportSetResultDto {
  reason: ReportReason;
  reportCount: number;
  hidden: boolean;
}

export interface CommunityFacetsDto {
  topics: string[];
}
