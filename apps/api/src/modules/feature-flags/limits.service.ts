import { ForbiddenException, Injectable } from '@nestjs/common';
import { ErrorCodes, type LimitsDto } from '@lophoc/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FeatureFlagsService } from './feature-flags.service.js';

export const FREE_LIMIT_DEFAULTS: LimitsDto = {
  maxClasses: 2,
  maxStudentsPerClass: 50,
  aiPagesPerMonth: 20,
  historyDays: 30,
  exportEnabled: false,
};

/** Giới hạn gói miễn phí, đọc từ feature flag `free.*`. */
@Injectable()
export class LimitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async getLimits(): Promise<LimitsDto> {
    const d = FREE_LIMIT_DEFAULTS;
    return {
      maxClasses: await this.flags.get('free.max_classes', d.maxClasses),
      maxStudentsPerClass: await this.flags.get(
        'free.max_students_per_class',
        d.maxStudentsPerClass,
      ),
      aiPagesPerMonth: await this.flags.get('free.ai_pages_per_month', d.aiPagesPerMonth),
      historyDays: await this.flags.get('free.history_days', d.historyDays),
      exportEnabled: await this.flags.get('free.export_enabled', d.exportEnabled),
    };
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

  async assertRosterCapacity(classId: string, adding: number): Promise<void> {
    const max = await this.flags.get(
      'free.max_students_per_class',
      FREE_LIMIT_DEFAULTS.maxStudentsPerClass,
    );
    const count = await this.prisma.student.count({ where: { classId, deletedAt: null } });
    if (count + adding > max) {
      throw new ForbiddenException({
        code: ErrorCodes.LIMIT_STUDENTS,
        message: `Gói miễn phí tối đa ${max} học sinh mỗi lớp (hiện có ${count}, muốn thêm ${adding}).`,
      });
    }
  }
}
