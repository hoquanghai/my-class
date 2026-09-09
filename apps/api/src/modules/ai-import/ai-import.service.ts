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
  type AiFileKind,
  aiFileKindByName,
  ErrorCodes,
  type ParseResult,
  textPageCount,
} from '@lophoc/shared';
import mammoth from 'mammoth';
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

/** Nhận diện theo nội dung (ảnh, PDF, zip của Word) rồi mới theo đuôi tên file (.tex/.txt/.md). */
function classifyAiFile(file: IncomingFile): AiFileKind | null {
  if (isPdf(file.buffer)) return 'pdf';
  if (sniffImageMime(file.buffer) !== null) return 'image';
  const byName = aiFileKindByName(file.originalname);
  const isZip = file.buffer.length > 2 && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b;
  if (byName === 'docx') return isZip ? 'docx' : null;
  if (byName === 'text') return file.buffer.subarray(0, 4096).includes(0) ? null : 'text';
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
      throw new BadRequestException(
        `Không hỗ trợ file ${unsupported.join(', ')}. Chọn ảnh (PNG/JPG/WebP/GIF), PDF, Word (.docx), LaTeX (.tex) hoặc văn bản (.txt/.md).`,
      );
    }
    const images = classified.filter((c) => c.kind === 'image');
    const docs = classified.filter((c) => c.kind !== 'image');
    if (docs.length > 1 || (docs.length === 1 && images.length > 0)) {
      throw new BadRequestException(
        `Chọn một tài liệu (PDF, Word, LaTeX hoặc văn bản) hoặc tối đa ${MAX_AI_IMAGES} ảnh`,
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
      const text =
        doc.kind === 'docx'
          ? await this.docxText(doc.file.buffer, warnings)
          : doc.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
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

  /**
   * Chữ trong file Word (mammoth). Công thức MathType là đối tượng nhúng nên không có trong chữ:
   * đếm số đối tượng để cảnh báo giáo viên lưu PDF rồi tải lại.
   */
  private async docxText(buffer: Buffer, warnings: string[]): Promise<string> {
    let text: string;
    try {
      text = (await mammoth.extractRawText({ buffer })).value;
    } catch {
      throw new BadRequestException('Không đọc được file Word. Hãy lưu lại dạng .docx hoặc PDF.');
    }
    const mathType = new Set(
      buffer.toString('latin1').match(/word\/embeddings\/oleObject\d+\.bin/g) ?? [],
    ).size;
    if (mathType > 0) {
      warnings.push(
        `File Word có ${mathType} công thức MathType; AI không đọc được công thức từ Word nên các câu có công thức sẽ thiếu. Để giữ công thức, hãy lưu file thành PDF rồi tải lại.`,
      );
    }
    return text;
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
