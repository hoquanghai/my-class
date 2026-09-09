import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  dedupeNames,
  normalizeText,
  parseNameLines,
  type RosterImportResultDto,
  type StudentDto,
  type UpdateStudentInput,
} from '@lophoc/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { LimitsService } from '../feature-flags/limits.service.js';
import { ClassesService, toStudentDto } from './classes.service.js';
import { parseRosterWorkbook, type RosterRow } from './excel-roster.parser.js';
import { buildRosterTemplate } from './roster-template.js';

/** "2008-08-15" → Date nửa đêm UTC cho cột `@db.Date`; rỗng → null. */
export function toDbDate(iso: string | null | undefined): Date | null {
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
}

/** Các trường tùy chọn của học sinh từ một dòng nhập; thiếu thì null. */
function rowFields(row?: RosterRow) {
  return {
    studentCode: row?.studentCode ?? null,
    dateOfBirth: toDbDate(row?.dateOfBirth),
    gender: row?.gender ?? null,
    phone: row?.phone ?? null,
    email: row?.email ?? null,
    school: row?.school ?? null,
    parentName: row?.parentName ?? null,
    parentPhone: row?.parentPhone ?? null,
    note: row?.note ?? null,
  };
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classes: ClassesService,
    private readonly limits: LimitsService,
    private readonly analytics: AnalyticsService,
  ) {}

  async importNames(
    teacherId: string,
    classId: string,
    names: string[],
  ): Promise<RosterImportResultDto> {
    await this.classes.findOwned(teacherId, classId);
    const cleaned = names.flatMap((n) => parseNameLines(n));
    if (cleaned.length === 0) throw new BadRequestException('Chưa có tên hợp lệ');
    return this.insert(
      teacherId,
      classId,
      cleaned.map((name) => ({ name })),
    );
  }

  async importExcel(
    teacherId: string,
    classId: string,
    buffer: Buffer,
  ): Promise<RosterImportResultDto> {
    await this.classes.findOwned(teacherId, classId);
    let rows: RosterRow[];
    try {
      rows = await parseRosterWorkbook(buffer);
    } catch {
      throw new BadRequestException(
        'Không đọc được file Excel. Hãy lưu lại dạng .xlsx và thử lại.',
      );
    }
    if (rows.length === 0) {
      throw new BadRequestException('Không tìm thấy tên học sinh trong file Excel');
    }
    return this.insert(teacherId, classId, rows);
  }

  private async insert(
    teacherId: string,
    classId: string,
    rows: RosterRow[],
  ): Promise<RosterImportResultDto> {
    await this.limits.assertRosterCapacity(classId, rows.length);
    const existing = await this.prisma.student.findMany({
      where: { classId, deletedAt: null },
      select: { name: true, sortOrder: true },
    });
    const names = dedupeNames(
      existing.map((s) => s.name),
      rows.map((r) => r.name),
    );
    let nextOrder = existing.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1;
    await this.prisma.student.createMany({
      data: names.map((name, i) => ({
        classId,
        name,
        sortOrder: nextOrder++,
        ...rowFields(rows[i]),
      })),
    });
    const students = await this.list(classId);
    await this.analytics.track('roster_size', { classId, size: students.length }, teacherId);
    return { students, added: names.length };
  }

  /** File Excel mẫu cho lớp: tên file kèm mã lớp, sheet hướng dẫn ghi tên lớp. */
  async template(
    teacherId: string,
    classId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const klass = await this.classes.findOwned(teacherId, classId);
    return {
      buffer: await buildRosterTemplate(klass.name),
      filename: `lophoc-mau-danh-sach-${klass.code}.xlsx`,
    };
  }

  async list(classId: string): Promise<StudentDto[]> {
    return (await this.classes.listStudents(classId)).map(toStudentDto);
  }

  async update(
    teacherId: string,
    classId: string,
    studentId: string,
    input: UpdateStudentInput,
  ): Promise<StudentDto> {
    await this.classes.findOwned(teacherId, classId);
    const student = await this.findStudent(classId, studentId);

    let name = student.name;
    if (input.name !== undefined && normalizeText(input.name) !== normalizeText(student.name)) {
      const others = await this.prisma.student.findMany({
        where: { classId, deletedAt: null, id: { not: studentId } },
        select: { name: true },
      });
      name = dedupeNames(
        others.map((o) => o.name),
        [input.name],
      )[0] as string;
    } else if (input.name !== undefined) {
      name = input.name;
    }

    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        name,
        ...(input.studentCode !== undefined && { studentCode: input.studentCode }),
        ...(input.dateOfBirth !== undefined && { dateOfBirth: toDbDate(input.dateOfBirth) }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.school !== undefined && { school: input.school }),
        ...(input.parentName !== undefined && { parentName: input.parentName }),
        ...(input.parentPhone !== undefined && { parentPhone: input.parentPhone }),
        ...(input.note !== undefined && { note: input.note }),
      },
    });
    return toStudentDto(updated);
  }

  async remove(teacherId: string, classId: string, studentId: string): Promise<void> {
    await this.classes.findOwned(teacherId, classId);
    await this.findStudent(classId, studentId);
    await this.prisma.student.update({ where: { id: studentId }, data: { deletedAt: new Date() } });
  }

  async reorder(teacherId: string, classId: string, ids: string[]): Promise<StudentDto[]> {
    await this.classes.findOwned(teacherId, classId);
    const current = await this.prisma.student.findMany({
      where: { classId, deletedAt: null },
      select: { id: true },
    });
    const currentIds = new Set(current.map((c) => c.id));
    const sameSet =
      ids.length === currentIds.size &&
      new Set(ids).size === ids.length &&
      ids.every((id) => currentIds.has(id));
    if (!sameSet) throw new BadRequestException('Danh sách id không khớp với lớp');

    await this.prisma.$transaction(
      ids.map((id, i) => this.prisma.student.update({ where: { id }, data: { sortOrder: i } })),
    );
    return this.list(classId);
  }

  private async findStudent(classId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, classId, deletedAt: null },
    });
    if (!student) throw new NotFoundException('Không tìm thấy học sinh');
    return student;
  }
}
