import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Trễ mạng cho phép sau hạn nộp trước khi chốt lượt (ms), khớp GRACE_MS khi nhận bài. */
export const DEADLINE_GRACE_MS = 3000;
/** Quét dự phòng: bắt các lượt hết hạn mà hẹn giờ trong RAM bị mất (đổi tiến trình, nhiều instance). */
const SWEEP_MS = 30_000;
/** setTimeout chỉ tin cậy tới ~24,8 ngày; hạn xa hơn sẽ do lần quét tiếp theo hẹn lại. */
const MAX_TIMER_MS = 2_147_000_000;

/**
 * Tự kết thúc lượt "tự làm" khi hết giờ, không cần giáo viên bấm. PostgreSQL vẫn là nguồn sự thật:
 * hẹn giờ chỉ là tối ưu độ trễ, còn `sweep()` (lúc khởi động và mỗi 30 s) bảo đảm không lượt nào
 * bị treo ở trạng thái đang diễn ra sau hạn nộp.
 */
@Injectable()
export class RunDeadlineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RunDeadlineService.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private sweeper: NodeJS.Timeout | null = null;
  /** Do RunsService đăng ký (tránh import vòng): chốt lượt nếu còn đang diễn ra và đã quá hạn. */
  private handler: ((runId: string) => Promise<boolean>) | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onExpire(handler: (runId: string) => Promise<boolean>): void {
    this.handler = handler;
  }

  onModuleInit(): void {
    void this.sweep();
    this.sweeper = setInterval(() => void this.sweep(), SWEEP_MS);
    this.sweeper.unref();
  }

  onModuleDestroy(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  /** Hẹn chốt lượt tại `deadlineAt` + trễ cho phép. Gọi lại với cùng runId sẽ thay hẹn cũ. */
  arm(runId: string, deadlineAt: Date): void {
    this.disarm(runId);
    const delay = Math.min(
      MAX_TIMER_MS,
      Math.max(0, deadlineAt.getTime() + DEADLINE_GRACE_MS - Date.now()),
    );
    const timer = setTimeout(() => {
      this.timers.delete(runId);
      void this.expire(runId);
    }, delay);
    timer.unref();
    this.timers.set(runId, timer);
  }

  disarm(runId: string): void {
    const t = this.timers.get(runId);
    if (t) clearTimeout(t);
    this.timers.delete(runId);
  }

  /** Chốt mọi lượt tự làm đã quá hạn; hẹn giờ cho lượt sắp tới hạn. Trả về số lượt vừa chốt. */
  async sweep(): Promise<number> {
    const now = Date.now();
    let expired = 0;
    try {
      const pending = await this.prisma.quizRun.findMany({
        where: { status: 'in_progress', mode: 'self_paced', deadlineAt: { not: null } },
        select: { id: true, deadlineAt: true },
      });
      for (const run of pending) {
        const at = run.deadlineAt!;
        if (at.getTime() + DEADLINE_GRACE_MS <= now) {
          this.disarm(run.id);
          if (await this.expire(run.id)) expired++;
        } else if (!this.timers.has(run.id)) {
          this.arm(run.id, at);
        }
      }
    } catch (err) {
      this.logger.warn(`Không quét được hạn nộp: ${(err as Error).message}`);
    }
    return expired;
  }

  /** Kết thúc lượt nếu vẫn đang diễn ra và đã quá hạn (kiểm tra lại từ DB, an toàn khi gọi trùng). */
  private async expire(runId: string): Promise<boolean> {
    if (!this.handler) return false;
    try {
      const done = await this.handler(runId);
      if (done) this.logger.log(`Lượt ${runId} hết giờ, đã tự kết thúc`);
      return done;
    } catch (err) {
      this.logger.warn(`Không tự kết thúc được lượt ${runId}: ${(err as Error).message}`);
      return false;
    }
  }
}
