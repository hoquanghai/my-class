import type { ExtractedQuestion, ExtractionMeta } from '@lophoc/shared';

export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

export type ExtractionPage =
  | { kind: 'image'; mime: ImageMime; data: Buffer }
  | { kind: 'pdf'; data: Buffer; filename?: string }
  /** Văn bản thuần hoặc LaTeX (từ .tex/.txt/.md hoặc chữ trích từ Word). */
  | { kind: 'text'; text: string; filename?: string };

export interface ExtractionInput {
  pages: ExtractionPage[];
  hints?: { subject?: string | null; grade?: string | null };
  /**
   * Khi chỉ gửi một phần tài liệu (cascade gửi lại từng trang): vị trí của phần này
   * để model điền `page` theo số trang thật và biết mình chỉ thấy một phần đề.
   */
  pageContext?: { first: number; count: number; total: number };
}

export interface ExtractionResult extends ExtractionMeta {
  questions: ExtractedQuestion[];
}

export type ExtractionErrorCode =
  'not_configured' | 'refusal' | 'invalid_output' | 'provider_error';

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly code: ExtractionErrorCode,
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

/** Giao diện chung cho mọi nhà cung cấp AI (Claude, OpenAI, Gemini, mock, cascade). */
export interface QuestionExtractor {
  readonly provider: string;
  readonly model: string;
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}

export type SingleAiProvider = 'claude' | 'openai' | 'gemini' | 'mock';
export type AiProvider = SingleAiProvider | 'cascade';

/**
 * Mức suy nghĩ của Gemini 3.x; chép đề chỉ cần LOW, mức cao tốn token ra (tính cả token suy nghĩ).
 * Không có MINIMAL: gemini-3.7-flash trả 400 "Thinking level MINIMAL is not supported".
 */
export type GeminiThinking = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SingleExtractorConfig {
  provider: SingleAiProvider;
  apiKey?: string;
  model?: string;
  /** Mức nỗ lực (Claude): low | medium | high */
  effort?: 'low' | 'medium' | 'high';
  /** Mức suy nghĩ (Gemini 3.x) */
  thinking?: GeminiThinking;
}

/**
 * Cascade: model rẻ (`primary`) trích xuất cả tài liệu; bộ chấm chất lượng miễn phí tìm trang
 * lỗi; chỉ các trang đó được gửi lại cho model mạnh (`escalation`).
 */
export interface CascadeExtractorConfig {
  provider: 'cascade';
  primary: SingleExtractorConfig;
  escalation: SingleExtractorConfig;
  /** Tỷ lệ trang tối đa được leo thang, 0–1 (mặc định 1 = mọi trang bị cờ). */
  maxEscalationShare?: number;
}

export type ExtractorConfig = SingleExtractorConfig | CascadeExtractorConfig;
