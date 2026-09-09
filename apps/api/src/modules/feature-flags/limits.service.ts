import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ErrorCodes,
  type FreeLimitsDto,
  type LimitsDto,
  type StudentLimitDetails,
} from '@lophoc/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FeatureFlagsService } from './feature-flags.service.js';

export const FREE_LIMIT_DEFAULTS: FreeLimitsDto = {
  maxClasses: 2,
  maxStudentsPerClass: 50,
  maxStudentsPerTeacher: 30,
  aiPagesPerMonth: 20,
  historyDays: 30,
  exportEnabled: false,
};

/** Chỗ còn trống để thêm học sinh vào một lớp, xét cả giới hạn theo lớp lẫn theo giáo viên. */
export interface RosterCapacity {
  perClass: number;
  perTeacher: number;
  classCount: number;
  teacherCount: number;
  remaining: number;
}

/** Giới hạn gói miễn phí, đọc từ feature flag `free.*`. */
@Injectable()
export class LimitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async getLimits(): Promise<FreeLimitsDto> {
    const d = FREE_LIMIT_DEFAULTS;
    return {
      maxClasses: await this.flags.get('free.max_classes', d.maxClasses),
      maxStudentsPerClass: await this.flags.get(
        'free.max_students_per_class',
        d.maxStudentsPerClass,
      ),
      maxStudentsPerTeacher: await this.flags.get(
        'free.max_students_per_teacher',
        d.maxStudentsPerTeacher,
      ),
      aiPagesPerMonth: await this.flags.get('free.ai_pages_per_month', d.aiPagesPerMonth),
      historyDays: await this.flags.get('free.history_days', d.historyDays),
      exportEnabled: await this.flags.get('free.export_enabled', d.exportEnabled),
    };
  }

  /** Giới hạn kèm mức đang dùng của giáo viên: số lớp và tổng học sinh trong các lớp chưa xóa. */
  async getLimitsFor(teacherId: string): Promise<LimitsDto> {
    const [limits, classes, students] = await Promise.all([
      this.getLimits(),
      this.prisma.class.count({ where: { teacherId, deletedAt: null } }),
      this.countTeacherStudents(teacherId),
    ]);
    return { ...limits, usage: { classes, students } };
  }

  async assertCanCreateClass(teacherId: string): Promise<void> {
    const max = await this.flags.get('free.max_classes', FREE_LIMIT_DEFAULTS.maxClasses);
    const count = await this.prisma.class.count({ where: { teacherId, deletedAt: null } });
    if (count >= max) {
      throw new ForbiddenException({
        code: ErrorCodes.LIMIT_CLASSES,
        message: `Gói miễn phí tối đa ${max} lớp. Xóa lớp cũ hoặc chờ gói Trung tâm.`,
      });
    }
  }

  /** Chỗ còn trống = min(giới hạn theo lớp − học sinh trong lớp, giới hạn theo giáo viên − tổng học sinh). */
  async rosterCapacity(teacherId: string, classId: string): Promise<RosterCapacity> {
    const [limits, classCount, teacherCount] = await Promise.all([
      this.getLimits(),
      this.prisma.student.count({ where: { classId, deletedAt: null } }),
      this.countTeacherStudents(teacherId),
    ]);
    const remaining = Math.max(
      0,
      Math.min(
        limits.maxStudentsPerClass - classCount,
        limits.maxStudentsPerTeacher - teacherCount,
      ),
    );
    return {
      perClass: limits.maxStudentsPerClass,
      perTeacher: limits.maxStudentsPerTeacher,
      classCount,
      teacherCount,
      remaining,
    };
  }

  /**
   * 403 LIMIT_STUDENTS kèm `details` để web đưa ra hai lựa chọn:
   * sang trang nâng cấp, hoặc chỉ nhập số học sinh còn chỗ (`?fit=1`).
   */
  studentLimitError(cap: RosterCapacity, requested: number): ForbiddenException {
    const teacherScoped = cap.perTeacher - cap.teacherCount <= cap.perClass - cap.classCount;
    const details: StudentLimitDetails = teacherScoped
      ? {
          scope: 'teacher',
          limit: cap.perTeacher,
          current: cap.teacherCount,
          requested,
          remaining: cap.remaining,
        }
      : {
          scope: 'class',
          limit: cap.perClass,
          current: cap.classCount,
          requested,
          remaining: cap.remaining,
        };
    const where = teacherScoped ? 'cho mỗi giáo viên (tính tất cả các lớp)' : 'mỗi lớp';
    return new ForbiddenException({
      code: ErrorCodes.LIMIT_STUDENTS,
      message: `Gói miễn phí tối đa ${details.limit} học sinh ${where}: đang có ${details.current}, muốn thêm ${requested}, còn ${details.remaining} chỗ.`,
      details,
    });
  }

  /** Ném LIMIT_STUDENTS nếu không đủ chỗ cho `adding` học sinh. */
  async assertRosterCapacity(teacherId: string, classId: string, adding: number): Promise<void> {
    const cap = await this.rosterCapacity(teacherId, classId);
    if (adding > cap.remaining) throw this.studentLimitError(cap, adding);
  }

  private countTeacherStudents(teacherId: string): Promise<number> {
    return this.prisma.student.count({
      where: { deletedAt: null, class: { teacherId, deletedAt: null } },
    });
  }
}
