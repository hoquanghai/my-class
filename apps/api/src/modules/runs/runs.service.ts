import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ErrorCodes,
  gradeAnswer,
  type LaunchRunInput,
  type QuestionSnapshot,
  type RunAnswerDto,
  type RunDetailDto,
  type RunListItemDto,
  type RunPublicStateDto,
  type StudentAnswerView,
  type StudentRunViewDto,
  type SubmitAnswerInput,
  type SubmitAnswerResultDto,
} from '@lophoc/shared';
import type { StudentPrincipal } from '../../common/decorators/student.decorator.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { QuizzesService } from '../quizzes/quizzes.service.js';
import { RunBroadcaster } from '../realtime/run-broadcaster.service.js';
import {
  buildQuestionResult,
  computeLeaderboard,
  RunStateService,
  type RunWithAll,
  snapshotOf,
  toPublicQuestion,
} from './run-state.service.js';

/** Trễ mạng cho phép sau khi hết giờ (ms). */
const GRACE_MS = 3000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

@Injectable()
export class RunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quizzes: QuizzesService,
    private readonly runState: RunStateService,
    private readonly broadcaster: RunBroadcaster,
    private readonly analytics: AnalyticsService,
  ) {}

  // ---------- Giáo viên ----------

  async launch(teacherId: string, sessionId: string, input: LaunchRunInput): Promise<RunDetailDto> {
    const session = await this.prisma.classSession.findFirst({
      where: { id: sessionId, class: { teacherId, deletedAt: null } },
    });
    if (!session) throw new NotFoundException('Không tìm thấy buổi học');
    if (session.status !== 'active') throw new BadRequestException('Buổi học đã kết thúc');

    const active = await this.prisma.quizRun.findFirst({
      where: { sessionId, status: { not: 'finished' } },
      select: { id: true },
    });
    if (active) {
      throw new ConflictException({
        code: ErrorCodes.RUN_ACTIVE,
        message: 'Đang có một lượt kiểm tra chưa kết thúc trong buổi này',
      });
    }

    const quiz = await this.quizzes.findOwned(teacherId, input.quizId);
    if (quiz.questions.length === 0) throw new BadRequestException('Đề chưa có câu hỏi');

    const ordered = input.shuffleQuestions ? shuffle(quiz.questions) : quiz.questions;
    const run = await this.prisma.quizRun.create({
      data: {
        sessionId,
        quizId: quiz.id,
        mode: input.mode,
        shuffleQuestions: input.shuffleQuestions,
        shuffleOptions: input.shuffleOptions,
        selfPacedMinutes: input.mode === 'self_paced' ? (input.selfPacedMinutes ?? null) : null,
        questions: {
          create: ordered.map((item, index) => {
            const q = item.question;
            const opts = [...q.options].sort((a, b) => a.sortOrder - b.sortOrder);
            const arranged = input.shuffleOptions && q.type !== 'true_false' ? shuffle(opts) : opts;
            const snapshot: QuestionSnapshot = {
              type: q.type as QuestionSnapshot['type'],
              stemMd: q.stemMd,
              explanationMd: q.explanationMd,
              options: arranged.map((o, i) => ({
                id: o.id,
                label: String.fromCharCode(65 + i),
                contentMd: o.contentMd,
              })),
              correctOptionIds: arranged.filter((o) => o.isCorrect).map((o) => o.id),
              acceptedAnswers: Array.isArray(q.acceptedAnswers)
                ? (q.acceptedAnswers as string[])
                : [],
            };
            return {
              questionId: q.id,
              sortOrder: index,
              timeLimitSec: item.timeLimitSec ?? quiz.defaultTimeLimitSec,
              points: item.points,
              snapshot: snapshot as unknown as Prisma.InputJsonValue,
            };
          }),
        },
      },
    });

    await this.analytics.track(
      'quiz_launched',
      { sessionId, quizId: quiz.id, mode: input.mode, questions: ordered.length },
      teacherId,
    );
    await this.broadcaster.emitNow(sessionId);
    return this.detail(teacherId, run.id);
  }

  async start(teacherId: string, runId: string): Promise<RunDetailDto> {
    const run = await this.findOwned(teacherId, runId);
    if (run.status === 'lobby') {
      const now = new Date();
      await this.prisma.quizRun.update({
        where: { id: runId },
        data:
          run.mode === 'paced'
            ? {
                status: 'in_progress',
                startedAt: now,
                currentIndex: 0,
                questionOpenedAt: now,
                questionClosedAt: null,
              }
            : {
                status: 'in_progress',
                startedAt: now,
                deadlineAt: new Date(now.getTime() + (run.selfPacedMinutes ?? 10) * 60_000),
              },
      });
      await this.analytics.track(
        'students_joined',
        { sessionId: run.sessionId, runId, count: run.session.participants.length },
        teacherId,
      );
      await this.broadcaster.emitNow(run.sessionId);
    }
    return this.detail(teacherId, runId);
  }

  async close(teacherId: string, runId: string): Promise<RunDetailDto> {
    const run = await this.findOwned(teacherId, runId);
    if (run.mode === 'paced' && run.status === 'in_progress' && !run.questionClosedAt) {
      await this.prisma.quizRun.update({
        where: { id: runId },
        data: { questionClosedAt: new Date() },
      });
      await this.broadcaster.emitNow(run.sessionId);
    }
    return this.detail(teacherId, runId);
  }

  async next(teacherId: string, runId: string): Promise<RunDetailDto> {
    const run = await this.findOwned(teacherId, runId);
    if (run.mode !== 'paced' || run.status !== 'in_progress') {
      throw new BadRequestException('Chỉ chuyển câu khi lượt Paced đang diễn ra');
    }
    const nextIndex = (run.currentIndex ?? -1) + 1;
    if (nextIndex >= run.questions.length) return this.finish(teacherId, runId);
    const now = new Date();
    await this.prisma.quizRun.update({
      where: { id: runId },
      data: { currentIndex: nextIndex, questionOpenedAt: now, questionClosedAt: null },
    });
    await this.broadcaster.emitNow(run.sessionId);
    return this.detail(teacherId, runId);
  }

  async finish(teacherId: string, runId: string): Promise<RunDetailDto> {
    const run = await this.findOwned(teacherId, runId);
    if (run.status !== 'finished') {
      const now = new Date();
      await this.prisma.quizRun.update({
        where: { id: runId },
        data: {
          status: 'finished',
          endedAt: now,
          ...(run.mode === 'paced' && !run.questionClosedAt && { questionClosedAt: now }),
        },
      });
      await this.persistResults(runId);
      const fresh = await this.runState.load(runId);
      await this.analytics.track(
        'quiz_completed',
        {
          runId,
          sessionId: run.sessionId,
          participants: fresh.session.participants.length,
          answered: new Set(fresh.answers.map((a) => a.studentId)).size,
        },
        teacherId,
      );
      await this.broadcaster.emitNow(run.sessionId);
    }
    return this.detail(teacherId, runId);
  }

  async override(
    teacherId: string,
    runId: string,
    answerId: string,
    isCorrect: boolean,
  ): Promise<RunDetailDto> {
    const run = await this.findOwned(teacherId, runId);
    const answer = run.answers.find((a) => a.id === answerId);
    if (!answer) throw new NotFoundException('Không tìm thấy bài nộp');
    const question = run.questions.find((q) => q.id === answer.runQuestionId);
    await this.prisma.answer.update({
      where: { id: answerId },
      data: {
        isCorrect,
        pointsAwarded: isCorrect ? (question?.points ?? 0) : 0,
        overriddenByTeacher: true,
      },
    });
    if (run.status === 'finished') await this.persistResults(runId);
    this.broadcaster.schedule(run.sessionId);
    return this.detail(teacherId, runId);
  }

  async detail(teacherId: string, runId: string): Promise<RunDetailDto> {
    const run = await this.findOwned(teacherId, runId);
    const answers: RunAnswerDto[] = run.answers.map((a) => ({
      id: a.id,
      runQuestionId: a.runQuestionId,
      studentId: a.studentId,
      selectedOptionIds: (a.selectedOptionIds as string[] | null) ?? [],
      textAnswer: a.textAnswer,
      isCorrect: a.isCorrect,
      pointsAwarded: a.pointsAwarded,
      overriddenByTeacher: a.overriddenByTeacher,
      responseMs: a.responseMs,
      submittedAt: a.submittedAt.toISOString(),
    }));
    const closedIndexes = this.closedIndexes(run);
    return {
      state: this.runState.toPublicState(run),
      quizId: run.quizId,
      shuffleQuestions: run.shuffleQuestions,
      shuffleOptions: run.shuffleOptions,
      startedAt: run.startedAt?.toISOString() ?? null,
      endedAt: run.endedAt?.toISOString() ?? null,
      questions: run.questions.map((q) => ({
        id: q.id,
        index: q.sortOrder,
        questionId: q.questionId,
        timeLimitSec: q.timeLimitSec,
        points: q.points,
        snapshot: snapshotOf(q),
      })),
      answers,
      results: run.questions
        .filter((q) => closedIndexes.has(q.sortOrder))
        .map((q) => buildQuestionResult(q, run.answers)),
    };
  }

  async list(teacherId: string, sessionId: string): Promise<RunListItemDto[]> {
    const session = await this.prisma.classSession.findFirst({
      where: { id: sessionId, class: { teacherId, deletedAt: null } },
      select: { id: true },
    });
    if (!session) throw new NotFoundException('Không tìm thấy buổi học');
    const runs = await this.prisma.quizRun.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        quiz: { select: { title: true } },
        _count: { select: { questions: true } },
        answers: { select: { studentId: true } },
      },
    });
    return runs.map((r) => ({
      id: r.id,
      quizTitle: r.quiz.title,
      mode: r.mode as RunListItemDto['mode'],
      status: r.status as RunListItemDto['status'],
      questionCount: r._count.questions,
      participantCount: new Set(r.answers.map((a) => a.studentId)).size,
      createdAt: r.createdAt.toISOString(),
      endedAt: r.endedAt?.toISOString() ?? null,
    }));
  }

  publicState(runId: string): Promise<RunPublicStateDto> {
    return this.runState.publicState(runId);
  }

  // ---------- Học sinh ----------

  async studentView(principal: StudentPrincipal, runId: string): Promise<StudentRunViewDto> {
    const run = await this.findForStudent(principal, runId);
    const state = this.runState.toPublicState(run);
    const closed = this.closedIndexes(run);
    const finished = run.status === 'finished';

    const visibleQuestions =
      run.mode === 'self_paced' && run.status !== 'lobby'
        ? run.questions.map(toPublicQuestion)
        : state.currentQuestion
          ? [state.currentQuestion]
          : [];

    const myAnswers: StudentAnswerView[] = run.answers
      .filter((a) => a.studentId === principal.studentId)
      .map((a) => {
        const q = run.questions.find((x) => x.id === a.runQuestionId);
        const revealed = finished || (q !== undefined && closed.has(q.sortOrder));
        return {
          runQuestionId: a.runQuestionId,
          selectedOptionIds: (a.selectedOptionIds as string[] | null) ?? [],
          textAnswer: a.textAnswer,
          isCorrect: revealed ? a.isCorrect : null,
          pointsAwarded: revealed ? a.pointsAwarded : null,
        };
      });

    const revealed = run.questions
      .filter((q) => finished || closed.has(q.sortOrder))
      .map((q) => {
        const s = snapshotOf(q);
        return {
          runQuestionId: q.id,
          correctOptionIds: s.correctOptionIds,
          acceptedAnswers: s.acceptedAnswers,
          explanationMd: s.explanationMd,
        };
      });

    const myResult = finished
      ? (computeLeaderboard(run).find((e) => e.studentId === principal.studentId) ?? null)
      : null;

    return { state, questions: visibleQuestions, myAnswers, revealed, myResult };
  }

  async submit(
    principal: StudentPrincipal,
    runId: string,
    input: SubmitAnswerInput,
  ): Promise<SubmitAnswerResultDto> {
    const run = await this.findForStudent(principal, runId);
    if (run.status !== 'in_progress') {
      throw new ConflictException({
        code: ErrorCodes.RUN_NOT_OPEN,
        message: 'Lượt kiểm tra chưa mở hoặc đã kết thúc',
      });
    }
    const question = run.questions.find((q) => q.id === input.runQuestionId);
    if (!question) throw new BadRequestException('Câu hỏi không thuộc lượt này');

    // Đã nộp rồi (kể cả sau khi câu đóng, do client gửi lại) → không lỗi, chỉ báo không nhận
    const existing = run.answers.find(
      (a) => a.runQuestionId === question.id && a.studentId === principal.studentId,
    );
    if (existing) return { accepted: false, answerId: existing.id };

    const now = Date.now();
    let open: boolean;
    if (run.mode === 'paced') {
      const openedAt = run.questionOpenedAt?.getTime() ?? 0;
      open =
        run.currentIndex === question.sortOrder &&
        run.questionClosedAt === null &&
        now <= openedAt + question.timeLimitSec * 1000 + GRACE_MS;
    } else {
      open = run.deadlineAt !== null && now <= run.deadlineAt.getTime() + GRACE_MS;
    }
    if (!open) {
      throw new ConflictException({ code: ErrorCodes.RUN_NOT_OPEN, message: 'Câu hỏi đã đóng' });
    }

    const snapshot = snapshotOf(question);
    const validOptionIds = new Set(snapshot.options.map((o) => o.id));
    const selected = (input.selectedOptionIds ?? []).filter((id) => validOptionIds.has(id));
    const grade = gradeAnswer(
      snapshot,
      { selectedOptionIds: selected, textAnswer: input.textAnswer },
      question.points,
    );

    try {
      const answer = await this.prisma.answer.create({
        data: {
          runId,
          runQuestionId: question.id,
          studentId: principal.studentId,
          selectedOptionIds: selected,
          textAnswer: snapshot.type === 'short_text' ? (input.textAnswer?.trim() ?? null) : null,
          isCorrect: grade.isCorrect,
          pointsAwarded: grade.pointsAwarded,
          responseMs: input.responseMs ?? null,
        },
      });
      await this.prisma.sessionParticipant.upsert({
        where: {
          sessionId_studentId: { sessionId: run.sessionId, studentId: principal.studentId },
        },
        create: {
          sessionId: run.sessionId,
          studentId: principal.studentId,
          deviceId: principal.deviceId,
        },
        update: { lastSeenAt: new Date() },
      });
      this.broadcaster.schedule(run.sessionId);
      return { accepted: true, answerId: answer.id };
    } catch (err) {
      // Nộp trùng do retry song song: trả bản đã có
      if ((err as { code?: string }).code === 'P2002') {
        const dup = await this.prisma.answer.findUnique({
          where: {
            runQuestionId_studentId: { runQuestionId: question.id, studentId: principal.studentId },
          },
        });
        if (dup) return { accepted: false, answerId: dup.id };
      }
      throw err;
    }
  }

  // ---------- nội bộ ----------

  private closedIndexes(run: RunWithAll): Set<number> {
    const closed = new Set<number>();
    if (run.status === 'finished') {
      run.questions.forEach((q) => closed.add(q.sortOrder));
      return closed;
    }
    if (run.mode === 'paced' && run.currentIndex !== null) {
      for (let i = 0; i < run.currentIndex; i++) closed.add(i);
      if (run.questionClosedAt) closed.add(run.currentIndex);
    }
    return closed;
  }

  private async persistResults(runId: string): Promise<void> {
    const run = await this.runState.load(runId);
    const board = computeLeaderboard(run);
    await this.prisma.$transaction([
      this.prisma.quizRunResult.deleteMany({ where: { runId } }),
      ...board.map((e) =>
        this.prisma.quizRunResult.create({
          data: {
            runId,
            studentId: e.studentId,
            score: e.score,
            correctCount: e.correctCount,
            answeredCount: e.answeredCount,
            rank: e.rank,
            finishedAt: new Date(),
          },
        }),
      ),
    ]);
  }

  private async findOwned(teacherId: string, runId: string): Promise<RunWithAll> {
    const run = await this.runState.load(runId);
    if (run.session.class.teacherId !== teacherId || run.session.class.deletedAt) {
      throw new NotFoundException('Không tìm thấy lượt kiểm tra');
    }
    return run;
  }

  private async findForStudent(principal: StudentPrincipal, runId: string): Promise<RunWithAll> {
    const run = await this.runState.load(runId);
    if (run.session.classId !== principal.classId)
      throw new NotFoundException('Không tìm thấy lượt kiểm tra');
    return run;
  }
}
