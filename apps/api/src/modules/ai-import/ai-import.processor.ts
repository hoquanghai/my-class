import { Injectable, Logger } from '@nestjs/common';
import {
  estimateUsd,
  ExtractionError,
  type ExtractionPage,
  type ImageMime,
} from '@lophoc/ai-adapter';
import { cleanExtractedQuestions, extractedToParsed, type ParseResult } from '@lophoc/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { ExtractorFactory } from './extractor.factory.js';

export interface AiJobInput {
  files: { key: string; kind: 'image' | 'pdf' | 'text'; mime: string; filename: string }[];
  hints: { subject: string | null; grade: string | null };
  /** Cảnh báo lúc chuẩn bị file, trả lại cho web cùng kết quả. */
  warnings?: string[];
}

/** Xử lý một ImportJob nguồn AI: tải file, gọi extractor, lưu kết quả dạng ParseResult. */
@Injectable()
export class AiImportProcessor {
  private readonly logger = new Logger(AiImportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly extractors: ExtractorFactory,
  ) {}

  async process(jobId: string): Promise<void> {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job || job.status === 'done') return;
    await this.prisma.importJob.update({ where: { id: jobId }, data: { status: 'processing' } });

    try {
      const input = job.inputKeys as unknown as AiJobInput;
      const pages: ExtractionPage[] = [];
      for (const file of input.files) {
        const stored = await this.storage.get(file.key);
        if (!stored) throw new Error(`Không tìm thấy file ${file.key}`);
        if (file.kind === 'text') {
          pages.push({ kind: 'text', text: stored.body.toString('utf8'), filename: file.filename });
        } else if (file.kind === 'pdf') {
          pages.push({ kind: 'pdf', data: stored.body, filename: file.filename });
        } else {
          pages.push({ kind: 'image', mime: file.mime as ImageMime, data: stored.body });
        }
      }

      const result = await this.extractors.get().extract({ pages, hints: input.hints });
      const { questions, ...meta } = result;
      meta.estimatedUsd ??= estimateUsd(meta.model, meta.inputTokens, meta.outputTokens);
      const cleaned = cleanExtractedQuestions(questions);
      const parsed: ParseResult = {
        questions: extractedToParsed(cleaned.questions),
        answerKeyFound: false,
        skippedLines: cleaned.dropped,
        meta,
      };
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'done',
          result: parsed as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });
      this.logger.log(
        `Job ${jobId}: ${parsed.questions.length} câu từ ${pages.length} trang (${meta.provider}/${meta.model}, in ${meta.inputTokens ?? '?'} / out ${meta.outputTokens ?? '?'} tokens, ≈$${meta.estimatedUsd ?? '?'}, leo thang trang: ${meta.escalatedPages?.length ? meta.escalatedPages.join(',') : 'không'})`,
      );
    } catch (err) {
      const message =
        err instanceof ExtractionError ? err.message : 'Trích xuất thất bại, vui lòng thử lại sau';
      if (!(err instanceof ExtractionError))
        this.logger.error(`Job ${jobId} lỗi`, (err as Error).stack);
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'failed', error: message, finishedAt: new Date() },
      });
    }
  }
}
