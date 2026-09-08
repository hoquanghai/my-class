import type { ExtractedQuestion } from '@lophoc/shared';

export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

export type ExtractionPage =
  | { kind: 'image'; mime: ImageMime; data: Buffer }
  | { kind: 'pdf'; data: Buffer; filename?: string };

export interface ExtractionInput {
  pages: ExtractionPage[];
  hints?: { subject?: string | null; grade?: string | null };
}

export interface ExtractionResult {
  questions: ExtractedQuestion[];
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
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

/** Giao diện chung cho mọi nhà cung cấp AI (Claude, OpenAI, mock). */
export interface QuestionExtractor {
  readonly provider: string;
  readonly model: string;
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}

export type AiProvider = 'claude' | 'openai' | 'mock';

export interface ExtractorConfig {
  provider: AiProvider;
  apiKey?: string;
  model?: string;
  /** Mức nỗ lực (Claude): low | medium | high */
  effort?: 'low' | 'medium' | 'high';
}
