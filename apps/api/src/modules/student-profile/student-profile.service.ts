import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AttendanceSummary,
  RunMode,
  StudentProfileDto,
  StudentRunHistoryItemDto,
} from '@lophoc/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ClassesService, toStudentDto } from '../classes/classes.service.js';
import { SessionsService } from '../sessions/sessions.service.js';

/** Điểm theo phần trăm, null khi đề không có điểm (tránh chia cho 0). */
function percentOf(score: number, total: number): number | null {
  return total > 0 ? Math.round((score / total) * 100) : null;
}

/**
 * Hồ sơ một học sinh cho giáo viên: thông tin, lịch sử điểm danh (cùng cửa sổ ngày với
 * lịch sử điểm danh thường) và mọi lượt kiểm tra đã kết thúc mà em có trong bảng kết quả.
 */
@Injectable()
export class StudentProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classes: ClassesService,
    private readonly sessions: SessionsService,
  ) {}

  async profile(teacherId: string, classId: string, studentId: string): Promise<StudentProfileDto> {
    const klass = await this.classes.findOwned(teacherId, classId);
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, classId, deletedAt: null },
    });
    if (!student) throw new NotFoundException('Không tìm thấy học sinh');

    const [attendance, results] = await Promise.all([
      this.sessions.studentHistory(teacherId, classId, studentId),
      this.prisma.quizRunResult.findMany({
        where: { studentId, run: { status: 'finished' } },
        include: {
          run: {
            include: {
              quiz: { select: { title: true } },
              questions: { select: { points: true } },
              _count: { select: { results: true } },
            },
          },
        },
        orderBy: { run: { endedAt: 'desc' } },
      }),
    ]);

    const summary: AttendanceSummary = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: attendance.items.length,
    };
    for (const item of attendance.items) summary[item.status] += 1;

    const items: StudentRunHistoryItemDto[] = results.map((r) => {
      const totalPoints = r.run.questions.reduce((s, q) => s + q.points, 0);
      return {
        runId: r.runId,
        sessionId: r.run.sessionId,
        quizTitle: r.run.quiz.title,
        mode: r.run.mode as RunMode,
        endedAt: (r.run.endedAt ?? r.finishedAt ?? r.run.createdAt).toISOString(),
        score: r.score,
        totalPoints,
        percent: percentOf(r.score, totalPoints),
        correctCount: r.correctCount,
        answeredCount: r.answeredCount,
        questionCount: r.run.questions.length,
        rank: r.rank,
        participants: r.run._count.results,
        submittedAt: r.submittedAt?.toISOString() ?? null,
      };
    });
    const percents = items.map((i) => i.percent).filter((p): p is number => p !== null);

    return {
      student: toStudentDto(student),
      classId,
      className: klass.name,
      attendance: {
        items: attendance.items,
        summary,
        rate: attendance.rate,
        hiddenCount: attendance.hiddenCount,
      },
      quizzes: {
        items,
        count: items.length,
        averagePercent:
          percents.length > 0
            ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
            : null,
        bestPercent: percents.length > 0 ? Math.max(...percents) : null,
      },
    };
  }
}
