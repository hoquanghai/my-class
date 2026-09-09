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
  type AiJobSummaryDto,
  type AiQuotaDto,
  type AiFileKind,
  aiFileKindByName,
  ErrorCodes,
  isWordFileName,
  type ParseResult,
  textPageCount,
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

/** Nhận diện theo nội dung (ảnh, PDF) rồi mới theo đuôi tên file (.tex/.txt/.md phải là văn bản thuần). */
function classifyAiFile(file: IncomingFile): AiFileKind | null {
  if (isPdf(file.buffer)) return 'pdf';
  if (sniffImageMime(file.buffer) !== null) return 'image';
  if (aiFileKindByName(file.originalname) === 'text') {
    return file.buffer.subarray(0, 4096).includes(0) ? null : 'text';
  }
  return null;
}

interface PreparedFile {
  buffer: Buffer;
  mime: string;
  ext: string;
  kind: AiJobInput['files'][number]['kind'];
  filename: string;
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
    if (files.length === 0) throw new BadRequestException('Chưa chọn file đề');

    const classified = files.map((file) => ({ file, kind: classifyAiFile(file) }));
    const unsupported = classified.filter((c) => c.kind === null).map((c) => c.file.originalname);
    if (unsupported.length > 0) {
      // Word: công thức MathType/Equation không nằm trong chữ, AI sẽ tự bịa → không nhận, chỉ dẫn lưu PDF
      const word = unsupported.some(isWordFileName)
        ? ' File Word không được nhận vì công thức sẽ bị mất: mở file trong Word, chọn Lưu dạng PDF rồi tải PDF lên.'
        : '';
      throw new BadRequestException(
        `Không hỗ trợ file ${unsupported.join(', ')}. Chọn ảnh (PNG/JPG/WebP/GIF), PDF, LaTeX (.tex) hoặc văn bản (.txt/.md).${word}`,
      );
    }
    const images = classified.filter((c) => c.kind === 'image');
    const docs = classified.filter((c) => c.kind !== 'image');
    if (docs.length > 1 || (docs.length === 1 && images.length > 0)) {
      throw new BadRequestException(
        `Chọn một tài liệu (PDF, LaTeX hoặc văn bản) hoặc tối đa ${MAX_AI_IMAGES} ảnh`,
      );
    }
    if (images.length > MAX_AI_IMAGES) {
      throw new BadRequestException(`Tối đa ${MAX_AI_IMAGES} ảnh mỗi lần`);
    }

    const warnings: string[] = [];
    const prepared: PreparedFile[] = images.map(({ file }) => {
      const mime = sniffImageMime(file.buffer) as string;
      return {
        buffer: file.buffer,
        mime,
        ext: IMAGE_MIME_EXT[mime] as string,
        kind: 'image',
        filename: file.originalname,
      };
    });
    let pageCount = images.length;
    const doc = docs[0];
    if (doc?.kind === 'pdf') {
      pageCount = await this.countPdfPages(doc.file.buffer);
      if (pageCount > MAX_AI_PDF_PAGES) {
        throw new BadRequestException(
          `PDF tối đa ${MAX_AI_PDF_PAGES} trang (file có ${pageCount} trang)`,
        );
      }
      prepared.push({
        buffer: doc.file.buffer,
        mime: 'application/pdf',
        ext: 'pdf',
        kind: 'pdf',
        filename: doc.file.originalname,
      });
    } else if (doc) {
      const text = doc.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
      if (text.trim().length === 0) {
        throw new BadRequestException(`File ${doc.file.originalname} không có chữ để đọc`);
      }
      pageCount = textPageCount(text.length);
      if (pageCount > MAX_AI_PDF_PAGES) {
        throw new BadRequestException(
          `Văn bản quá dài (khoảng ${pageCount} trang), tối đa ${MAX_AI_PDF_PAGES} trang mỗi lần`,
        );
      }
      prepared.push({
        buffer: Buffer.from(text, 'utf8'),
        mime: 'text/plain',
        ext: 'txt',
        kind: 'text',
        filename: doc.file.originalname,
      });
    }

    if (quota.used + pageCount > quota.limit) {
      throw new ForbiddenException({
        code: ErrorCodes.LIMIT_AI_PAGES,
        message: `Hạn mức AI tháng này còn ${quota.remaining}/${quota.limit} trang, không đủ cho ${pageCount} trang.`,
      });
    }

    const stored: AiJobInput['files'] = [];
    for (const p of prepared) {
      const key = this.storage.buildKey(teacherId, p.ext);
      await this.storage.put(key, p.buffer, p.mime);
      await this.prisma.mediaFile.create({
        data: { teacherId, key, mime: p.mime, sizeBytes: p.buffer.length },
      });
      stored.push({ key, kind: p.kind, mime: p.mime, filename: p.filename });
    }

    const input: AiJobInput = {
      files: stored,
      hints: { subject: hints.subject?.trim() || null, grade: hints.grade?.trim() || null },
      warnings,
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
    return { jobId: job.id, pageCount, status: 'pending', warnings };
  }

  /** Các lần chạy AI gần đây của giáo viên; kết quả đã lưu nên mở lại được, không tốn hạn mức. */
  async listJobs(teacherId: string, limit = 10): Promise<AiJobSummaryDto[]> {
    const jobs = await this.prisma.importJob.findMany({
      where: { teacherId, source: 'image_ai' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return jobs.map((job) => {
      const input = job.inputKeys as unknown as AiJobInput;
      const result = job.status === 'done' ? (job.result as unknown as ParseResult) : null;
      return {
        id: job.id,
        status: job.status as AiJobStatus,
        pageCount: job.pageCount,
        filename: input.files?.[0]?.filename ?? null,
        questionCount: result?.questions.length ?? 0,
        estimatedUsd: result?.meta?.estimatedUsd ?? null,
        createdAt: job.createdAt.toISOString(),
      };
    });
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
      warnings: (job.inputKeys as unknown as AiJobInput).warnings ?? [],
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
