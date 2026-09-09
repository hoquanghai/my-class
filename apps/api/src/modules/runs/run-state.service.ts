import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type LeaderboardEntry,
  type PublicQuestion,
  type QuestionResult,
  type QuestionSnapshot,
  rankEntries,
  type RunMode,
  type RunParticipant,
  type RunPublicStateDto,
  type RunStatus,
} from '@lophoc/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export const runInclude = {
  session: { include: { class: true, participants: { include: { student: true } } } },
  quiz: { select: { id: true, title: true } },
  questions: { orderBy: { sortOrder: 'asc' as const } },
  answers: { include: { student: true } },
  results: true,
} satisfies Prisma.QuizRunInclude;

export type RunWithAll = Prisma.QuizRunGetPayload<{ include: typeof runInclude }>;
type RunQuestionRow = RunWithAll['questions'][number];
type AnswerRow = RunWithAll['answers'][number];

export const snapshotOf = (q: RunQuestionRow): QuestionSnapshot =>
  q.snapshot as unknown as QuestionSnapshot;

export function toPublicQuestion(q: RunQuestionRow): PublicQuestion {
  const s = snapshotOf(q);
  return {
    runQuestionId: q.id,
    index: q.sortOrder,
    type: s.type,
    stemMd: s.stemMd,
    options: s.options,
    timeLimitSec: q.timeLimitSec,
    points: q.points,
  };
}

export function buildQuestionResult(q: RunQuestionRow, answers: AnswerRow[]): QuestionResult {
  const s = snapshotOf(q);
  const mine = answers.filter((a) => a.runQuestionId === q.id);
  return {
    runQuestionId: q.id,
    index: q.sortOrder,
    answeredCount: mine.length,
    distribution: s.options.map((o) => ({
      optionId: o.id,
      label: o.label,
      count: mine.filter((a) => ((a.selectedOptionIds as string[] | null) ?? []).includes(o.id))
        .length,
    })),
    correctOptionIds: s.correctOptionIds,
    acceptedAnswers: s.acceptedAnswers,
    correctStudentNames: mine.filter((a) => a.isCorrect === true).map((a) => a.student.name),
    explanationMd: s.explanationMd,
  };
}

/** Xếp hạng từ bài nộp: mọi học sinh đã tham gia buổi hoặc đã nộp bài. */
export function computeLeaderboard(run: RunWithAll): LeaderboardEntry[] {
  const students = new Map<string, string>();
  for (const p of run.session.participants) {
    if (p.student.deletedAt === null) students.set(p.studentId, p.student.name);
  }
  for (const a of run.answers) students.set(a.studentId, a.student.name);

  const entries = [...students.entries()].map(([studentId, name]) => {
    const mine = run.answers.filter((a) => a.studentId === studentId);
    return {
      studentId,
      name,
      score: mine.reduce((s, a) => s + a.pointsAwarded, 0),
      correctCount: mine.filter((a) => a.isCorrect === true).length,
      answeredCount: mine.length,
      totalResponseMs: mine.reduce((s, a) => s + (a.responseMs ?? 0), 0),
    };
  });
  return rankEntries(entries);
}

@Injectable()
export class RunStateService {
  constructor(private readonly prisma: PrismaService) {}

  async load(runId: string): Promise<RunWithAll> {
    const run = await this.prisma.quizRun.findUnique({ where: { id: runId }, include: runInclude });
    if (!run) throw new NotFoundException('Không tìm thấy lượt kiểm tra');
    return run;
  }

  /** Lượt mới nhất của buổi (mọi trạng thái), null nếu chưa có. */
  async latestRunId(sessionId: string): Promise<string | null> {
    const run = await this.prisma.quizRun.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return run?.id ?? null;
  }

  toPublicState(run: RunWithAll): RunPublicStateDto {
    const status = run.status as RunStatus;
    const mode = run.mode as RunMode;
    const currentQ =
      mode === 'paced' && status === 'in_progress' && run.currentIndex !== null
        ? (run.questions.find((q) => q.sortOrder === run.currentIndex) ?? null)
        : null;
    const submitted = new Set(
      run.results.filter((r) => r.submittedAt !== null).map((r) => r.studentId),
    );
    const participants: RunParticipant[] = run.session.participants
      .filter((p) => p.student.deletedAt === null)
      .map((p) => ({
        studentId: p.studentId,
        name: p.student.name,
        answeredCount: run.answers.filter((a) => a.studentId === p.studentId).length,
        submitted: submitted.has(p.studentId),
      }));

    return {
      id: run.id,
      sessionId: run.sessionId,
      classId: run.session.classId,
      className: run.session.class.name,
      classCode: run.session.class.code,
      quizTitle: run.quiz.title,
      mode,
      status,
      questionCount: run.questions.length,
      totalPoints: run.questions.reduce((s, q) => s + q.points, 0),
      currentIndex: run.currentIndex,
      questionOpenedAt: run.questionOpenedAt?.toISOString() ?? null,
      questionClosedAt: run.questionClosedAt?.toISOString() ?? null,
      deadlineAt: run.deadlineAt?.toISOString() ?? null,
      serverTime: new Date().toISOString(),
      participants,
      submittedCount: submitted.size,
      currentQuestion: currentQ ? toPublicQuestion(currentQ) : null,
      currentAnswerCount: currentQ
        ? run.answers.filter((a) => a.runQuestionId === currentQ.id).length
        : 0,
      currentResult:
        currentQ && run.questionClosedAt ? buildQuestionResult(currentQ, run.answers) : null,
      leaderboard: status === 'finished' ? computeLeaderboard(run) : null,
    };
  }

  async publicState(runId: string): Promise<RunPublicStateDto> {
    return this.toPublicState(await this.load(runId));
  }
}
