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
import { RunDeadlineService } from './run-deadline.service.js';
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
    private readonly deadline: RunDeadlineService,
  ) {
    this.deadline.onExpire((runId) => this.finishExpired(runId));
  }

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
      const deadlineAt = new Date(now.getTime() + (run.selfPacedMinutes ?? 10) * 60_000);
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
            : { status: 'in_progress', startedAt: now, deadlineAt },
      });
      // Tự làm: hết giờ thì server tự kết thúc lượt, giáo viên không cần bấm
      if (run.mode === 'self_paced') this.deadline.arm(runId, deadlineAt);
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
    await this.finishRun(run);
    return this.detail(teacherId, runId);
  }

  /**
   * Chốt lượt tự làm đã quá hạn (gọi từ RunDeadlineService). Đọc lại từ DB nên gọi trùng
   * (hẹn giờ + quét + nhiều instance) vẫn chỉ kết thúc một lần. Trả về true nếu vừa chốt.
   */
  async finishExpired(runId: string): Promise<boolean> {
    const run = await this.runState.load(runId);
    if (run.status !== 'in_progress' || run.mode !== 'self_paced' || !run.deadlineAt) return false;
    if (Date.now() < run.deadlineAt.getTime() + GRACE_MS) return false;
    return this.finishRun(run);
  }

  private async finishRun(run: RunWithAll): Promise<boolean> {
    if (run.status === 'finished') return false;
    const now = new Date();
    // updateMany có điều kiện: hai tiến trình cùng chốt thì chỉ một bên thắng
    const { count } = await this.prisma.quizRun.updateMany({
      where: { id: run.id, status: { not: 'finished' } },
      data: {
        status: 'finished',
        endedAt: now,
        ...(run.mode === 'paced' && !run.questionClosedAt && { questionClosedAt: now }),
      },
    });
    if (count === 0) return false;
    this.deadline.disarm(run.id);
    await this.persistResults(run.id);
    const fresh = await this.runState.load(run.id);
    await this.analytics.track(
      'quiz_completed',
      {
        runId: run.id,
        sessionId: run.sessionId,
        participants: fresh.session.participants.length,
        answered: new Set(fresh.answers.map((a) => a.studentId)).size,
        submitted: fresh.results.filter((r) => r.submittedAt !== null).length,
      },
      run.session.class.teacherId,
    );
    await this.broadcaster.emitNow(run.sessionId);
    return true;
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

    return {
      state,
      questions: visibleQuestions,
      myAnswers,
      revealed,
      myResult,
      submittedAt: this.submissionOf(run, principal.studentId)?.toISOString() ?? null,
    };
  }

  /**
   * Tự làm: học sinh nộp bài một lần duy nhất. Sau đó câu trả lời bị khóa; kết quả chỉ hiện khi
   * lượt kết thúc (hết giờ hoặc giáo viên bấm) để không lộ đáp án cho bạn còn đang làm.
   * Gọi lại khi đã nộp / lượt đã kết thúc thì không lỗi, chỉ trả góc nhìn hiện tại.
   */
  async submitRun(principal: StudentPrincipal, runId: string): Promise<StudentRunViewDto> {
    const run = await this.findForStudent(principal, runId);
    if (run.mode !== 'self_paced') throw new BadRequestException('Chỉ nộp bài ở chế độ tự làm');
    if (run.status === 'lobby') {
      throw new ConflictException({ code: ErrorCodes.RUN_NOT_OPEN, message: 'Lượt chưa bắt đầu' });
    }
    if (run.status === 'in_progress' && !this.submissionOf(run, principal.studentId)) {
      const mine = run.answers.filter((a) => a.studentId === principal.studentId);
      const now = new Date();
      await this.prisma.quizRunResult.upsert({
        where: { runId_studentId: { runId, studentId: principal.studentId } },
        create: {
          runId,
          studentId: principal.studentId,
          score: mine.reduce((s, a) => s + a.pointsAwarded, 0),
          correctCount: mine.filter((a) => a.isCorrect === true).length,
          answeredCount: mine.length,
          submittedAt: now,
        },
        update: { submittedAt: now },
      });
      await this.touchParticipant(run.sessionId, principal);
      this.broadcaster.schedule(run.sessionId);
    }
    return this.studentView(principal, runId);
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

    const existing = run.answers.find(
      (a) => a.runQuestionId === question.id && a.studentId === principal.studentId,
    );
    if (run.mode === 'paced') {
      // Từng câu: nộp rồi là chốt (kể cả client gửi lại sau khi câu đóng) → không lỗi, chỉ báo không nhận
      if (existing) return { accepted: false, answerId: existing.id };
    } else if (this.submissionOf(run, principal.studentId)) {
      throw new ConflictException({
        code: ErrorCodes.RUN_SUBMITTED,
        message: 'Bạn đã nộp bài, không sửa được câu trả lời',
      });
    }

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

    const textAnswer = snapshot.type === 'short_text' ? (input.textAnswer?.trim() ?? null) : null;
    // Tự làm: được đổi câu trả lời cho tới khi bấm nộp bài
    if (existing) {
      await this.prisma.answer.update({
        where: { id: existing.id },
        data: {
          selectedOptionIds: selected,
          textAnswer,
          isCorrect: grade.isCorrect,
          pointsAwarded: grade.pointsAwarded,
          overriddenByTeacher: false,
          responseMs: input.responseMs ?? existing.responseMs,
          submittedAt: new Date(),
        },
      });
      this.broadcaster.schedule(run.sessionId);
      return { accepted: true, answerId: existing.id };
    }

    try {
      const answer = await this.prisma.answer.create({
        data: {
          runId,
          runQuestionId: question.id,
          studentId: principal.studentId,
          selectedOptionIds: selected,
          textAnswer,
          isCorrect: grade.isCorrect,
          pointsAwarded: grade.pointsAwarded,
          responseMs: input.responseMs ?? null,
        },
      });
      await this.touchParticipant(run.sessionId, principal);
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

  /** Thời điểm học sinh đã nộp bài (tự làm), undefined nếu chưa. */
  private submissionOf(run: RunWithAll, studentId: string): Date | undefined {
    return run.results.find((r) => r.studentId === studentId)?.submittedAt ?? undefined;
  }

  private async touchParticipant(sessionId: string, principal: StudentPrincipal): Promise<void> {
    await this.prisma.sessionParticipant.upsert({
      where: { sessionId_studentId: { sessionId, studentId: principal.studentId } },
      create: { sessionId, studentId: principal.studentId, deviceId: principal.deviceId },
      update: { lastSeenAt: new Date() },
    });
  }

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

  /** Ghi bảng kết quả cuối; giữ nguyên `submittedAt` của những em đã bấm nộp trước khi lượt kết thúc. */
  private async persistResults(runId: string): Promise<void> {
    const run = await this.runState.load(runId);
    const board = computeLeaderboard(run);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.quizRunResult.deleteMany({
        where: { runId, studentId: { notIn: board.map((e) => e.studentId) } },
      }),
      ...board.map((e) => {
        const fields = {
          score: e.score,
          correctCount: e.correctCount,
          answeredCount: e.answeredCount,
          rank: e.rank,
          finishedAt: now,
        };
        return this.prisma.quizRunResult.upsert({
          where: { runId_studentId: { runId, studentId: e.studentId } },
          create: { runId, studentId: e.studentId, ...fields },
          update: fields,
        });
      }),
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
