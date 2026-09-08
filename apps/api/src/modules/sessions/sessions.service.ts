import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AttendanceRecordDto,
  type AttendanceStatus,
  type AttendanceUpdateItem,
  isAttended,
  type SessionDetailDto,
  type SessionFeedbackInput,
  type SessionListDto,
  type SessionStatus,
  type StudentAttendanceHistoryDto,
  summarizeAttendance,
} from '@lophoc/shared';
import type { ClassSession } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { ClassesService } from '../classes/classes.service.js';
import { LimitsService } from '../feature-flags/limits.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classes: ClassesService,
    private readonly limits: LimitsService,
    private readonly analytics: AnalyticsService,
  ) {}

  /** Trả buổi đang mở nếu có, không thì tạo buổi mới với mọi học sinh mặc định "có mặt". */
  async start(
    teacherId: string,
    classId: string,
  ): Promise<{ detail: SessionDetailDto; created: boolean }> {
    await this.classes.findOwned(teacherId, classId);
    const active = await this.prisma.classSession.findFirst({
      where: { classId, status: 'active' },
      orderBy: { startedAt: 'desc' },
    });
    if (active) return { detail: await this.detail(teacherId, active.id), created: false };

    const students = await this.classes.listStudents(classId);
    const session = await this.prisma.classSession.create({
      data: {
        classId,
        teacherId,
        attendance: { create: students.map((s) => ({ studentId: s.id, status: 'present' })) },
      },
    });
    await this.analytics.track(
      'session_started',
      { classId, rosterSize: students.length },
      teacherId,
    );
    return { detail: await this.detail(teacherId, session.id), created: true };
  }

  async list(teacherId: string, classId: string): Promise<SessionListDto> {
    await this.classes.findOwned(teacherId, classId);
    const { since, historyDays } = await this.historyWindow();
    const [rows, hiddenCount] = await Promise.all([
      this.prisma.classSession.findMany({
        where: { classId, startedAt: { gte: since } },
        orderBy: { startedAt: 'desc' },
        include: { attendance: { select: { status: true } }, feedback: { select: { id: true } } },
      }),
      this.prisma.classSession.count({ where: { classId, startedAt: { lt: since } } }),
    ]);
    return {
      sessions: rows.map((r) => ({
        id: r.id,
        status: r.status as SessionStatus,
        startedAt: r.startedAt.toISOString(),
        endedAt: r.endedAt?.toISOString() ?? null,
        summary: summarizeAttendance(r.attendance as { status: AttendanceStatus }[]),
        hasFeedback: r.feedback !== null,
      })),
      hiddenCount,
      historyDays,
    };
  }

  async detail(teacherId: string, sessionId: string): Promise<SessionDetailDto> {
    const session = await this.findOwned(teacherId, sessionId);
    const existing = await this.prisma.attendanceRecord.findMany({ where: { sessionId } });
    const recordedIds = existing.map((r) => r.studentId);

    // Học sinh đang có trong lớp + học sinh đã rời lớp nhưng có bản ghi trong buổi này
    const students = await this.prisma.student.findMany({
      where: { classId: session.classId, OR: [{ deletedAt: null }, { id: { in: recordedIds } }] },
      orderBy: { sortOrder: 'asc' },
    });

    // Bổ sung "có mặt" cho học sinh được thêm vào lớp sau khi mở buổi
    const have = new Set(recordedIds);
    const missing = students.filter((s) => s.deletedAt === null && !have.has(s.id));
    if (missing.length > 0) {
      await this.prisma.attendanceRecord.createMany({
        data: missing.map((s) => ({ sessionId, studentId: s.id, status: 'present' })),
        skipDuplicates: true,
      });
    }
    const records = missing.length > 0 ? await this.prisma.attendanceRecord.findMany({ where: { sessionId } }) : existing;
    const byStudent = new Map(records.map((r) => [r.studentId, r]));

    const dtoRecords: AttendanceRecordDto[] = students.map((s) => {
      const r = byStudent.get(s.id);
      return {
        studentId: s.id,
        name: s.name,
        status: (r?.status ?? 'present') as AttendanceStatus,
        note: r?.note ?? null,
      };
    });

    const klass = await this.prisma.class.findUniqueOrThrow({ where: { id: session.classId } });
    const feedback = await this.prisma.sessionFeedback.findUnique({ where: { sessionId } });

    return {
      id: session.id,
      classId: session.classId,
      className: klass.name,
      classCode: klass.code,
      status: session.status as SessionStatus,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      note: session.note,
      records: dtoRecords,
      summary: summarizeAttendance(dtoRecords),
      hasFeedback: feedback !== null,
    };
  }

  async updateAttendance(
    teacherId: string,
    sessionId: string,
    updates: AttendanceUpdateItem[],
  ): Promise<SessionDetailDto> {
    const session = await this.findOwned(teacherId, sessionId);
    const classStudents = await this.prisma.student.findMany({
      where: { classId: session.classId },
      select: { id: true },
    });
    const validIds = new Set(classStudents.map((s) => s.id));
    for (const u of updates) {
      if (!validIds.has(u.studentId)) {
        throw new BadRequestException('Học sinh không thuộc lớp của buổi học này');
      }
    }

    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId, studentId: u.studentId } },
          create: { sessionId, studentId: u.studentId, status: u.status, note: u.note ?? null },
          update: {
            status: u.status,
            ...(u.note !== undefined && { note: u.note }),
            markedAt: new Date(),
          },
        }),
      ),
    );
    return this.detail(teacherId, sessionId);
  }

  async end(teacherId: string, sessionId: string): Promise<SessionDetailDto> {
    const session = await this.findOwned(teacherId, sessionId);
    if (session.status !== 'ended') {
      await this.prisma.classSession.update({
        where: { id: sessionId },
        data: { status: 'ended', endedAt: new Date() },
      });
    }
    return this.detail(teacherId, sessionId);
  }

  async feedback(teacherId: string, sessionId: string, input: SessionFeedbackInput): Promise<void> {
    await this.findOwned(teacherId, sessionId);
    await this.prisma.sessionFeedback.upsert({
      where: { sessionId },
      create: { sessionId, teacherId, rating: input.rating, comment: input.comment ?? null },
      update: { rating: input.rating, comment: input.comment ?? null },
    });
  }

  async studentHistory(
    teacherId: string,
    classId: string,
    studentId: string,
  ): Promise<StudentAttendanceHistoryDto> {
    await this.classes.findOwned(teacherId, classId);
    const student = await this.prisma.student.findFirst({ where: { id: studentId, classId } });
    if (!student) throw new NotFoundException('Không tìm thấy học sinh');

    const { since } = await this.historyWindow();
    const [records, hiddenCount] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { studentId, session: { startedAt: { gte: since } } },
        include: { session: { select: { id: true, startedAt: true } } },
        orderBy: { session: { startedAt: 'desc' } },
      }),
      this.prisma.attendanceRecord.count({
        where: { studentId, session: { startedAt: { lt: since } } },
      }),
    ]);
    const items = records.map((r) => ({
      sessionId: r.session.id,
      startedAt: r.session.startedAt.toISOString(),
      status: r.status as AttendanceStatus,
      note: r.note,
    }));
    return {
      student: { id: student.id, name: student.name },
      items,
      rate: { present: items.filter((i) => isAttended(i.status)).length, total: items.length },
      hiddenCount,
    };
  }

  private async findOwned(teacherId: string, sessionId: string): Promise<ClassSession> {
    const session = await this.prisma.classSession.findFirst({
      where: { id: sessionId, class: { teacherId, deletedAt: null } },
    });
    if (!session) throw new NotFoundException('Không tìm thấy buổi học');
    return session;
  }

  private async historyWindow(): Promise<{ since: Date; historyDays: number }> {
    const { historyDays } = await this.limits.getLimits();
    return { since: new Date(Date.now() - historyDays * DAY_MS), historyDays };
  }
}
