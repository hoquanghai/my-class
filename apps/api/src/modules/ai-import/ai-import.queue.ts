import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { Env } from '../../config/env.js';
import { AiImportProcessor } from './ai-import.processor.js';

export const AI_IMPORT_QUEUE = 'ai-import';

/**
 * Hàng đợi job AI. `QUEUE_DRIVER=bullmq`: Redis + Worker (chạy chung tiến trình khi WORKER_INLINE=true).
 * `QUEUE_DRIVER=inline`: chạy ngay trong tiến trình (test, hoặc dev không có Redis).
 */
@Injectable()
export class AiImportQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiImportQueue.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private connection: Redis | null = null;
  private readonly driver: Env['QUEUE_DRIVER'];
  private readonly workerInline: boolean;
  private readonly redisUrl: string;

  constructor(
    config: ConfigService<Env, true>,
    private readonly processor: AiImportProcessor,
  ) {
    this.driver = config.get('QUEUE_DRIVER', { infer: true });
    this.workerInline = config.get('WORKER_INLINE', { infer: true });
    this.redisUrl = config.get('REDIS_URL', { infer: true });
  }

  async onModuleInit(): Promise<void> {
    if (this.driver !== 'bullmq') return;
    this.connection = new Redis(this.redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue(AI_IMPORT_QUEUE, { connection: this.connection });
    if (this.workerInline) {
      this.worker = new Worker<{ jobId: string }>(
        AI_IMPORT_QUEUE,
        async (job) => this.processor.process(job.data.jobId),
        { connection: this.connection, concurrency: 2 },
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Job ${job?.data.jobId ?? '?'} thất bại: ${err.message}`),
      );
      this.logger.log('Worker ai-import chạy inline');
    }
  }

  async enqueue(jobId: string): Promise<void> {
    if (!this.queue) {
      setImmediate(() => void this.processor.process(jobId));
      return;
    }
    await this.queue.add(
      'extract',
      { jobId },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 200,
        removeOnFail: 200,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }
}
