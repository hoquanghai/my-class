import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type AiJobCreatedDto,
  type AiJobDto,
  type AiJobStatus,
  type AiQuotaDto,
  ErrorCodes,
  type ParseResult,
} from '@lophoc/shared';
import { PDFDocument } from 'pdf-lib';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';
import { LimitsService } from '../feature-flags/limits.service.js';
import {
  IMAGE_MIME_EXT,
  isPdf,
  sniffImageMime,
  StorageService,
} from '../storage/storage.service.js';
import type { AiJobInput } from './ai-import.processor.js';
import { AiImportQueue } from './ai-import.queue.js';
import { ExtractorFactory } from './extractor.factory.js';

export const MAX_AI_IMAGES = 10;
export const MAX_AI_PDF_PAGES = 20;

export interface IncomingFile {
  buffer: Buffer;
  originalname: string;
  size: number;
}

export interface AiHints {
  subject?: string | null;
  grade?: string | null;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

@Injectable()
export class AiImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly flags: FeatureFlagsService,
    private readonly limits: LimitsService,
    private readonly extractors: ExtractorFactory,
    private readonly queue: AiImportQueue,
  ) {}

  async quota(teacherId: string): Promise<AiQuotaDto> {
    const flagEnabled = await this.flags.get('ai_extraction.enabled', true);
    const enabled = flagEnabled && this.extractors.isConfigured();
    const { aiPagesPerMonth } = await this.limits.getLimits();
    const used = await this.usedThisMonth(teacherId);
    return {
      enabled,
      provider: this.extractors.provider,
      limit: aiPagesPerMonth,
      used,
      remaining: Math.max(0, aiPagesPerMonth - used),
      month: monthKey(new Date()),
    };
  }

  async createJob(
    teacherId: string,
    files: IncomingFile[],
    hints: AiHints,
  ): Promise<AiJobCreatedDto> {
    const quota = await this.quota(teacherId);
    if (!quota.enabled) {
      throw new ServiceUnavailableException({
        code: ErrorCodes.AI_DISABLED,
        message: 'Trích xuất bằng AI chưa được bật trên hệ thống này',
      });
    }
    if (files.length === 0) throw new BadRequestException('Chưa chọn ảnh hoặc PDF');

    const pdfs = files.filter((f) => isPdf(f.buffer));
    const images = files.filter((f) => sniffImageMime(f.buffer) !== null);
    if (pdfs.length + images.length !== files.length) {
      throw new BadRequestException('Chỉ hỗ trợ ảnh (PNG/JPG/WebP/GIF) hoặc file PDF');
    }
    if (pdfs.length > 1 || (pdfs.length === 1 && images.length > 0)) {
      throw new BadRequestException(`Chọn một file PDF hoặc tối đa ${MAX_AI_IMAGES} ảnh`);
    }
    if (images.length > MAX_AI_IMAGES) {
      throw new BadRequestException(`Tối đa ${MAX_AI_IMAGES} ảnh mỗi lần`);
    }

    let pageCount = images.length;
    if (pdfs.length === 1) {
      pageCount = await this.countPdfPages(pdfs[0]!.buffer);
      if (pageCount > MAX_AI_PDF_PAGES) {
        throw new BadRequestException(
          `PDF tối đa ${MAX_AI_PDF_PAGES} trang (file có ${pageCount} trang)`,
        );
      }
    }

    if (quota.used + pageCount > quota.limit) {
      throw new ForbiddenException({
        code: ErrorCodes.LIMIT_AI_PAGES,
        message: `Hạn mức AI tháng này còn ${quota.remaining}/${quota.limit} trang, không đủ cho ${pageCount} trang.`,
      });
    }

    const stored: AiJobInput['files'] = [];
    for (const f of files) {
      const pdf = isPdf(f.buffer);
      const mime = pdf ? 'application/pdf' : (sniffImageMime(f.buffer) as string);
      const key = this.storage.buildKey(teacherId, pdf ? 'pdf' : (IMAGE_MIME_EXT[mime] as string));
      await this.storage.put(key, f.buffer, mime);
      await this.prisma.mediaFile.create({
        data: { teacherId, key, mime, sizeBytes: f.size },
      });
      stored.push({ key, kind: pdf ? 'pdf' : 'image', mime, filename: f.originalname });
    }

    const input: AiJobInput = {
      files: stored,
      hints: { subject: hints.subject?.trim() || null, grade: hints.grade?.trim() || null },
    };
    const job = await this.prisma.importJob.create({
      data: {
        teacherId,
        source: 'image_ai',
        status: 'pending',
        pageCount,
        inputKeys: input as unknown as Prisma.InputJsonValue,
      },
    });
    await this.queue.enqueue(job.id);
    return { jobId: job.id, pageCount, status: 'pending' };
  }

  async getJob(teacherId: string, id: string): Promise<AiJobDto> {
    const job = await this.prisma.importJob.findFirst({
      where: { id, teacherId, source: 'image_ai' },
    });
    if (!job) throw new NotFoundException('Không tìm thấy job');
    return {
      id: job.id,
      status: job.status as AiJobStatus,
      pageCount: job.pageCount,
      result: job.status === 'done' ? (job.result as unknown as ParseResult) : null,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      finishedAt: job.finishedAt?.toISOString() ?? null,
    };
  }

  private async usedThisMonth(teacherId: string): Promise<number> {
    const agg = await this.prisma.importJob.aggregate({
      _sum: { pageCount: true },
      where: {
        teacherId,
        source: 'image_ai',
        status: { not: 'failed' },
        createdAt: { gte: monthStart(new Date()) },
      },
    });
    return agg._sum.pageCount ?? 0;
  }

  private async countPdfPages(buffer: Buffer): Promise<number> {
    try {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      return doc.getPageCount();
    } catch {
      throw new BadRequestException('Không đọc được file PDF');
    }
  }
}
