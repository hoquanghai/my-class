import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type ClassDetailDto,
  type ClassSummaryDto,
  type CreateClassInput,
  generateClassCode,
  type ScheduleItem,
  type StudentDto,
  type UpdateClassInput,
} from '@lophoc/shared';
import type { Class, Prisma, Student } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { LimitsService } from '../feature-flags/limits.service.js';

export function toStudentDto(s: Student): StudentDto {
  return {
    id: s.id,
    name: s.name,
    studentCode: s.studentCode,
    parentPhone: s.parentPhone,
    sortOrder: s.sortOrder,
  };
}

function toSummary(k: Class, studentCount: number): ClassSummaryDto {
  return {
    id: k.id,
    name: k.name,
    subject: k.subject,
    grade: k.grade,
    code: k.code,
    rosterLocked: k.rosterLocked,
    studentCount,
    createdAt: k.createdAt.toISOString(),
  };
}

function toDetail(k: Class, students: Student[]): ClassDetailDto {
  return {
    ...toSummary(k, students.length),
    schedule: (k.schedule as ScheduleItem[] | null) ?? [],
    requireStudentCode: k.requireStudentCode,
    students: students.map(toStudentDto),
  };
}

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limits: LimitsService,
    private readonly analytics: AnalyticsService,
  ) {}

  async list(teacherId: string): Promise<ClassSummaryDto[]> {
    const rows = await this.prisma.class.findMany({
      where: { teacherId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { students: { where: { deletedAt: null } } } } },
    });
    return rows.map((r) => toSummary(r, r._count.students));
  }

  async create(teacherId: string, input: CreateClassInput): Promise<ClassDetailDto> {
    await this.limits.assertCanCreateClass(teacherId);
    const klass = await this.prisma.class.create({
      data: {
        teacherId,
        name: input.name,
        subject: input.subject ?? null,
        grade: input.grade ?? null,
        schedule: (input.schedule ?? []) as unknown as Prisma.InputJsonValue,
        code: await this.uniqueCode(),
      },
    });
    await this.analytics.track('class_created', { classId: klass.id }, teacherId);
    return toDetail(klass, []);
  }

  /** Lớp thuộc giáo viên và chưa xóa mềm; không thì 404 (không lộ tồn tại). */
  async findOwned(teacherId: string, classId: string): Promise<Class> {
    const klass = await this.prisma.class.findFirst({
      where: { id: classId, teacherId, deletedAt: null },
    });
    if (!klass) throw new NotFoundException('Không tìm thấy lớp');
    return klass;
  }

  async listStudents(classId: string): Promise<Student[]> {
    return this.prisma.student.findMany({
      where: { classId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getDetail(teacherId: string, classId: string): Promise<ClassDetailDto> {
    const klass = await this.findOwned(teacherId, classId);
    return toDetail(klass, await this.listStudents(classId));
  }

  async update(teacherId: string, classId: string, input: UpdateClassInput): Promise<ClassDetailDto> {
    await this.findOwned(teacherId, classId);
    const klass = await this.prisma.class.update({
      where: { id: classId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.subject !== undefined && { subject: input.subject }),
        ...(input.grade !== undefined && { grade: input.grade }),
        ...(input.schedule !== undefined && {
          schedule: input.schedule as unknown as Prisma.InputJsonValue,
        }),
        ...(input.rosterLocked !== undefined && { rosterLocked: input.rosterLocked }),
      },
    });
    return toDetail(klass, await this.listStudents(classId));
  }

  async softDelete(teacherId: string, classId: string): Promise<void> {
    await this.findOwned(teacherId, classId);
    await this.prisma.class.update({ where: { id: classId }, data: { deletedAt: new Date() } });
  }

  /** Xóa cứng, cascade học sinh/buổi học/kết quả. Cho phép cả lớp đã xóa mềm. */
  async hardDelete(teacherId: string, classId: string): Promise<void> {
    const klass = await this.prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!klass) throw new NotFoundException('Không tìm thấy lớp');
    await this.prisma.class.delete({ where: { id: classId } });
  }

  async regenerateCode(teacherId: string, classId: string): Promise<string> {
    await this.findOwned(teacherId, classId);
    const code = await this.uniqueCode();
    await this.prisma.class.update({ where: { id: classId }, data: { code } });
    return code;
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateClassCode();
      const exists = await this.prisma.class.findUnique({ where: { code }, select: { id: true } });
      if (!exists) return code;
    }
    throw new Error('Không sinh được mã lớp duy nhất');
  }
}
