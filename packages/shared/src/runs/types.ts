import type { QuestionType } from '../questions/schemas.js';
import type { RunMode, RunStatus } from './schemas.js';

/** Bản chụp câu hỏi tại thời điểm phát đề (thứ tự phương án đã xáo nếu bật). */
export interface QuestionSnapshot {
  type: QuestionType;
  stemMd: string;
  explanationMd: string | null;
  options: { id: string; label: string; contentMd: string }[];
  correctOptionIds: string[];
  acceptedAnswers: string[];
}

/** Câu hỏi đưa cho học sinh / máy chiếu: không có đáp án. */
export interface PublicQuestion {
  runQuestionId: string;
  index: number;
  type: QuestionType;
  stemMd: string;
  options: { id: string; label: string; contentMd: string }[];
  timeLimitSec: number;
  points: number;
}

export interface OptionCount {
  optionId: string;
  label: string;
  count: number;
}

/** Kết quả một câu sau khi đóng: phân bố, đáp án đúng, ai trả lời đúng. */
export interface QuestionResult {
  runQuestionId: string;
  index: number;
  answeredCount: number;
  distribution: OptionCount[];
  correctOptionIds: string[];
  acceptedAnswers: string[];
  correctStudentNames: string[];
  explanationMd: string | null;
}

export interface LeaderboardEntry {
  studentId: string;
  name: string;
  score: number;
  correctCount: number;
  answeredCount: number;
  rank: number;
  totalResponseMs: number;
}

export interface RunParticipant {
  studentId: string;
  name: string;
  answeredCount: number;
  /** Tự làm: đã bấm nộp bài (hoặc được nộp tự động khi hết giờ). */
  submitted: boolean;
}

/** Trạng thái công khai của lượt (phát qua Socket.IO, dùng cho máy chiếu, giáo viên, học sinh). */
export interface RunPublicStateDto {
  id: string;
  sessionId: string;
  classId: string;
  className: string;
  classCode: string;
  quizTitle: string;
  mode: RunMode;
  status: RunStatus;
  questionCount: number;
  totalPoints: number;
  currentIndex: number | null;
  questionOpenedAt: string | null;
  questionClosedAt: string | null;
  deadlineAt: string | null;
  /** Thời điểm server tạo trạng thái, để client bù lệch đồng hồ */
  serverTime: string;
  participants: RunParticipant[];
  /** Tự làm: số học sinh đã nộp bài */
  submittedCount: number;
  currentQuestion: PublicQuestion | null;
  currentAnswerCount: number;
  /** Kết quả câu vừa đóng (paced) */
  currentResult: QuestionResult | null;
  /** Bảng xếp hạng khi kết thúc */
  leaderboard: LeaderboardEntry[] | null;
}

/** Chi tiết cho giáo viên: thêm snapshot có đáp án và toàn bộ bài nộp. */
export interface RunQuestionDto {
  id: string;
  index: number;
  questionId: string;
  timeLimitSec: number;
  points: number;
  snapshot: QuestionSnapshot;
}

export interface RunAnswerDto {
  id: string;
  runQuestionId: string;
  studentId: string;
  selectedOptionIds: string[];
  textAnswer: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number;
  overriddenByTeacher: boolean;
  responseMs: number | null;
  submittedAt: string;
}

export interface RunDetailDto {
  state: RunPublicStateDto;
  quizId: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  startedAt: string | null;
  endedAt: string | null;
  questions: RunQuestionDto[];
  answers: RunAnswerDto[];
  results: QuestionResult[];
}

export interface RunListItemDto {
  id: string;
  quizTitle: string;
  mode: RunMode;
  status: RunStatus;
  questionCount: number;
  participantCount: number;
  createdAt: string;
  endedAt: string | null;
}

/** Góc nhìn của học sinh: câu hiện tại (paced) hoặc tất cả câu (self-paced), bài đã nộp, kết quả cuối. */
export interface StudentAnswerView {
  runQuestionId: string;
  selectedOptionIds: string[];
  textAnswer: string | null;
  /** chỉ có khi câu đã đóng hoặc lượt kết thúc */
  isCorrect: boolean | null;
  pointsAwarded: number | null;
}

export interface StudentRunViewDto {
  state: RunPublicStateDto;
  questions: PublicQuestion[];
  myAnswers: StudentAnswerView[];
  /** Đáp án đúng của các câu đã đóng / lượt kết thúc */
  revealed: {
    runQuestionId: string;
    correctOptionIds: string[];
    acceptedAnswers: string[];
    explanationMd: string | null;
  }[];
  myResult: LeaderboardEntry | null;
  /** Tự làm: thời điểm học sinh nộp bài; null khi chưa nộp. Sau khi nộp không sửa được câu trả lời. */
  submittedAt: string | null;
}

export interface SubmitAnswerResultDto {
  accepted: boolean;
  answerId: string;
}
