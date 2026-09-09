import type { ExtractedQuestion, ExtractionStage } from '@lophoc/shared';
import { explodePages } from './pdf.js';
import { estimateUsd } from './pricing.js';
import { assessQuestions, type QualityReport } from './quality.js';
import {
  ExtractionError,
  type ExtractionInput,
  type ExtractionPage,
  type ExtractionResult,
  type QuestionExtractor,
} from './types.js';

export interface CascadeOptions {
  primary: QuestionExtractor;
  escalation: QuestionExtractor;
  /** Tỷ lệ trang tối đa được leo thang, 0–1 (mặc định 1). */
  maxEscalationShare?: number;
  /** Bộ chấm chất lượng, thay được trong test. */
  assess?: (questions: ExtractedQuestion[]) => QualityReport;
}

function stageOf(result: ExtractionResult, pages: number[]): ExtractionStage {
  return {
    provider: result.provider,
    model: result.model,
    pages,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedUsd: estimateUsd(result.model, result.inputTokens, result.outputTokens),
  };
}

function sum(values: (number | undefined)[]): number | undefined {
  const known = values.filter((v): v is number => v !== undefined);
  return known.length ? known.reduce((a, b) => a + b, 0) : undefined;
}

/**
 * Model rẻ trích xuất cả tài liệu một lần (giữ ngữ cảnh, bảng đáp án cuối đề); bộ chấm
 * chất lượng tìm trang có câu lỗi; chỉ các trang đó được gửi lại từng trang cho model mạnh,
 * kết quả thay thế câu của trang tương ứng. Model rẻ lỗi hẳn thì model mạnh làm cả tài liệu.
 */
export class CascadeExtractor implements QuestionExtractor {
  readonly provider = 'cascade';
  readonly model: string;
  private readonly primary: QuestionExtractor;
  private readonly escalation: QuestionExtractor;
  private readonly maxShare: number;
  private readonly assess: (questions: ExtractedQuestion[]) => QualityReport;

  constructor(opts: CascadeOptions) {
    this.primary = opts.primary;
    this.escalation = opts.escalation;
    this.maxShare = Math.min(1, Math.max(0, opts.maxEscalationShare ?? 1));
    this.assess = opts.assess ?? assessQuestions;
    this.model = `${opts.primary.model} → ${opts.escalation.model}`;
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const units = await explodePages(input.pages);
    const total = units.length;
    const allPages = units.map((_, i) => i + 1);
    const stages: ExtractionStage[] = [];

    let primary: ExtractionResult;
    try {
      primary = await this.primary.extract(input);
    } catch (err) {
      if (!(err instanceof ExtractionError) || err.code === 'not_configured') throw err;
      stages.push({
        provider: this.primary.provider,
        model: this.primary.model,
        pages: allPages,
        error: err.message,
      });
      const full = await this.escalation.extract(input);
      stages.push(stageOf(full, allPages));
      return this.finish(full.questions, stages, allPages);
    }
    stages.push(stageOf(primary, allPages));

    const targets = this.pickPages(this.assess(primary.questions), total);
    if (targets.length === 0) return this.finish(primary.questions, stages, []);

    // Toàn bộ trang bị cờ mà model không gắn được trang: model mạnh làm lại cả tài liệu.
    if (targets.length === total) {
      try {
        const full = await this.escalation.extract(input);
        stages.push(stageOf(full, allPages));
        return this.finish(full.questions, stages, allPages);
      } catch (err) {
        if (!(err instanceof ExtractionError)) throw err;
        stages.push({
          provider: this.escalation.provider,
          model: this.escalation.model,
          pages: allPages,
          error: err.message,
        });
        return this.finish(primary.questions, stages, []);
      }
    }

    const replaced = new Map<number, ExtractedQuestion[]>();
    const escalated: number[] = [];
    for (const page of targets) {
      const unit = units[page - 1] as ExtractionPage;
      try {
        const partial = await this.escalation.extract({
          pages: [unit],
          hints: input.hints,
          pageContext: { first: page, count: 1, total },
        });
        stages.push(stageOf(partial, [page]));
        replaced.set(
          page,
          partial.questions.map((q) => ({ ...q, page })),
        );
        escalated.push(page);
      } catch (err) {
        if (!(err instanceof ExtractionError)) throw err;
        stages.push({
          provider: this.escalation.provider,
          model: this.escalation.model,
          pages: [page],
          error: err.message,
        });
      }
    }

    const merged: ExtractedQuestion[] = [];
    const inserted = new Set<number>();
    for (const q of primary.questions) {
      if (q.page !== null && replaced.has(q.page)) {
        if (!inserted.has(q.page)) {
          merged.push(...(replaced.get(q.page) as ExtractedQuestion[]));
          inserted.add(q.page);
        }
        continue;
      }
      merged.push(q);
    }
    // Trang leo thang mà model rẻ không có câu nào: chèn theo thứ tự trang.
    for (const page of escalated) {
      if (!inserted.has(page)) {
        const at = merged.findIndex((q) => q.page !== null && q.page > page);
        const items = replaced.get(page) as ExtractedQuestion[];
        if (at === -1) merged.push(...items);
        else merged.splice(at, 0, ...items);
      }
    }
    return this.finish(
      merged,
      stages,
      escalated.sort((a, b) => a - b),
    );
  }

  /** Chọn trang leo thang: trang có nhiều cờ nhất trước, không quá `maxShare` số trang. */
  private pickPages(report: QualityReport, total: number): number[] {
    if (report.flagged.length === 0) return [];
    const cap = Math.ceil(total * this.maxShare);
    if (cap === 0) return [];
    if (report.unknownPageFlagged && report.flaggedPages.length === 0) {
      return cap >= total ? Array.from({ length: total }, (_, i) => i + 1) : [];
    }
    return report.flaggedPages.slice(0, cap);
  }

  private finish(
    questions: ExtractedQuestion[],
    stages: ExtractionStage[],
    escalatedPages: number[],
  ): ExtractionResult {
    return {
      questions,
      provider: this.provider,
      model: this.model,
      inputTokens: sum(stages.map((s) => s.inputTokens)),
      outputTokens: sum(stages.map((s) => s.outputTokens)),
      estimatedUsd: sum(stages.map((s) => s.estimatedUsd)),
      stages,
      escalatedPages,
    };
  }
}
