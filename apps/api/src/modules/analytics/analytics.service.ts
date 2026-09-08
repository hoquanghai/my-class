import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type AnalyticsEventName =
  | 'signup'
  | 'class_created'
  | 'roster_size'
  | 'session_started'
  | 'quiz_launched'
  | 'students_joined'
  | 'quiz_completed'
  | 'projector_opened'
  | 'question_import'
  | 'export_clicked';

/** Ghi sự kiện đo lường vào bảng AnalyticsEvent. Không bao giờ ném lỗi ra ngoài. */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async track(
    name: AnalyticsEventName,
    props: Record<string, unknown> = {},
    teacherId: string | null = null,
  ): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: { name, props: props as Prisma.InputJsonObject, teacherId },
      });
    } catch (err) {
      this.logger.warn(`Không ghi được sự kiện ${name}: ${(err as Error).message}`);
    }
  }
}
