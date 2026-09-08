import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCodes,
  type JoinInfoDto,
  normalizeClassCode,
  type PickNameResultDto,
  type StudentIdentityDto,
  type StudentMeDto,
} from '@lophoc/shared';
import type { StudentPrincipal } from '../../common/decorators/student.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { sha256 } from '../auth/tokens.js';
import { ClassesService } from '../classes/classes.service.js';
import { StudentTokenService } from '../student-auth/student-token.service.js';

@Injectable()
export class JoinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: StudentTokenService,
    private readonly classes: ClassesService,
  ) {}

  async info(rawCode: string): Promise<JoinInfoDto> {
    const klass = await this.findClassByCode(rawCode);
    const students = await this.prisma.student.findMany({
      where: { classId: klass.id, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: { devices: { where: { revokedAt: null }, select: { id: true } } },
    });
    return {
      class: { id: klass.id, name: klass.name, rosterLocked: klass.rosterLocked },
      students: students.map((s) => ({ id: s.id, name: s.name, bound: s.devices.length > 0 })),
    };
  }

  /**
   * Học sinh chọn tên. Nếu thiết bị hiện tại đã gắn đúng học sinh này thì dùng lại;
   * nếu lớp khóa danh sách và tên đã có thiết bị khác → 409.
   */
  async pick(
    rawCode: string,
    studentId: string,
    current: StudentPrincipal | null,
    userAgent: string | undefined,
  ): Promise<PickNameResultDto> {
    const klass = await this.findClassByCode(rawCode);
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, classId: klass.id, deletedAt: null },
    });
    if (!student) throw new NotFoundException('Không tìm thấy tên trong lớp');

    let deviceId: string;
    if (current && current.studentId === student.id && current.classId === klass.id) {
      deviceId = current.deviceId;
    } else {
      if (klass.rosterLocked) {
        const bound = await this.prisma.studentDevice.count({
          where: { studentId: student.id, revokedAt: null },
        });
        if (bound > 0) {
          throw new ConflictException({
            code: ErrorCodes.STUDENT_BOUND,
            message: 'Tên này đã được dùng trên thiết bị khác. Hãy nhờ giáo viên gỡ thiết bị cũ.',
          });
        }
      }
      const device = await this.prisma.studentDevice.create({
        data: {
          studentId: student.id,
          classId: klass.id,
          tokenHash: sha256(`pending:${Date.now()}:${Math.random()}`),
          userAgent: userAgent?.slice(0, 200),
        },
      });
      deviceId = device.id;
    }

    const token = await this.tokens.issue({
      id: deviceId,
      studentId: student.id,
      classId: klass.id,
    });
    await this.prisma.studentDevice.update({
      where: { id: deviceId },
      data: { tokenHash: sha256(token), lastSeenAt: new Date() },
    });
    await this.joinActiveSession(klass.id, student.id, deviceId);

    return {
      token,
      student: {
        studentId: student.id,
        name: student.name,
        classId: klass.id,
        className: klass.name,
        deviceId,
      },
    };
  }

  async me(principal: StudentPrincipal): Promise<StudentMeDto> {
    const student = await this.prisma.student.findFirst({
      where: { id: principal.studentId, deletedAt: null },
      include: { class: true },
    });
    if (!student || student.class.deletedAt) {
      throw new NotFoundException('Học sinh không còn trong lớp');
    }
    await this.prisma.studentDevice.update({
      where: { id: principal.deviceId },
      data: { lastSeenAt: new Date() },
    });

    const session = await this.prisma.classSession.findFirst({
      where: { classId: student.classId, status: 'active' },
      orderBy: { startedAt: 'desc' },
    });
    let run: StudentMeDto['run'] = null;
    if (session) {
      await this.joinActiveSession(student.classId, student.id, principal.deviceId);
      const latest = await this.prisma.quizRun.findFirst({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true },
      });
      if (latest)
        run = { id: latest.id, status: latest.status as 'lobby' | 'in_progress' | 'finished' };
    }

    const identity: StudentIdentityDto = {
      studentId: student.id,
      name: student.name,
      classId: student.classId,
      className: student.class.name,
      deviceId: principal.deviceId,
    };
    return {
      student: identity,
      session: session ? { id: session.id, status: 'active' } : null,
      run,
    };
  }

  /** Giáo viên gỡ mọi thiết bị của một học sinh. */
  async unbind(teacherId: string, classId: string, studentId: string): Promise<void> {
    await this.classes.findOwned(teacherId, classId);
    const student = await this.prisma.student.findFirst({ where: { id: studentId, classId } });
    if (!student) throw new NotFoundException('Không tìm thấy học sinh');
    await this.prisma.studentDevice.updateMany({
      where: { studentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async findClassByCode(rawCode: string) {
    const code = normalizeClassCode(rawCode);
    const klass = await this.prisma.class.findFirst({ where: { code, deletedAt: null } });
    if (!klass) throw new NotFoundException('Mã lớp không đúng');
    return klass;
  }

  private async joinActiveSession(
    classId: string,
    studentId: string,
    deviceId: string,
  ): Promise<void> {
    const session = await this.prisma.classSession.findFirst({
      where: { classId, status: 'active' },
      orderBy: { startedAt: 'desc' },
      select: { id: true },
    });
    if (!session) return;
    await this.prisma.sessionParticipant.upsert({
      where: { sessionId_studentId: { sessionId: session.id, studentId } },
      create: { sessionId: session.id, studentId, deviceId },
      update: { deviceId, lastSeenAt: new Date() },
    });
  }
}
