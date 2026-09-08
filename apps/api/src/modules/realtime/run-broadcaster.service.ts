import { Injectable, Logger } from '@nestjs/common';
import { type ServerToClientEvents, type SessionStateDto, sessionRoom } from '@lophoc/shared';
import type { Namespace } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RunStateService } from '../runs/run-state.service.js';

type RtNamespace = Namespace<Record<string, never>, ServerToClientEvents>;

const COALESCE_MS = 250;

/**
 * Phát trạng thái buổi/lượt tới phòng `session:{id}`. Nhiều thay đổi trong 250 ms được gom
 * thành một lần phát để 45 học sinh nộp cùng lúc không tạo bão sự kiện.
 */
@Injectable()
export class RunBroadcaster {
  private readonly logger = new Logger(RunBroadcaster.name);
  private namespace: RtNamespace | null = null;
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly runState: RunStateService,
  ) {}

  attach(namespace: RtNamespace): void {
    this.namespace = namespace;
  }

  /** Lên lịch phát trạng thái buổi (gom 250 ms). */
  schedule(sessionId: string): void {
    if (!this.namespace) return;
    if (this.timers.has(sessionId)) return;
    this.timers.set(
      sessionId,
      setTimeout(() => {
        this.timers.delete(sessionId);
        void this.emitNow(sessionId);
      }, COALESCE_MS),
    );
  }

  /** Phát ngay (dùng khi bắt đầu/kết thúc lượt để giảm trễ). */
  async emitNow(sessionId: string): Promise<void> {
    if (!this.namespace) return;
    try {
      const { sessionState, runState } = await this.buildStates(sessionId);
      const room = this.namespace.to(sessionRoom(sessionId));
      room.emit('session:state', sessionState);
      if (runState) room.emit('run:state', runState);
    } catch (err) {
      this.logger.warn(`Không phát được trạng thái buổi ${sessionId}: ${(err as Error).message}`);
    }
  }

  async buildStates(sessionId: string) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { participants: { select: { id: true } } },
    });
    if (!session) throw new Error('session not found');
    const runId = await this.runState.latestRunId(sessionId);
    const runState = runId ? await this.runState.publicState(runId) : null;
    const sessionState: SessionStateDto = {
      sessionId,
      status: session.status as 'active' | 'ended',
      activeRunId: runState && runState.status !== 'finished' ? runState.id : null,
      joinedCount: session.participants.length,
    };
    return { sessionState, runState };
  }

  onModuleDestroy(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }
}
