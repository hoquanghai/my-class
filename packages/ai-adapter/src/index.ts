import { CascadeExtractor } from './cascade.js';
import { ClaudeExtractor } from './claude.js';
import { GeminiExtractor } from './gemini.js';
import { MockExtractor } from './mock.js';
import { OpenAIExtractor } from './openai.js';
import {
  ExtractionError,
  type ExtractorConfig,
  type QuestionExtractor,
  type SingleExtractorConfig,
} from './types.js';

export * from './types.js';
export { ClaudeExtractor, DEFAULT_CLAUDE_MODEL } from './claude.js';
export { OpenAIExtractor, DEFAULT_OPENAI_MODEL } from './openai.js';
export { GeminiExtractor, DEFAULT_GEMINI_MODEL, toGeminiJsonSchema } from './gemini.js';
export { MockExtractor } from './mock.js';
export { CascadeExtractor, type CascadeOptions } from './cascade.js';
export { assessQuestions, questionFlags, latexBalanced } from './quality.js';
export type { QualityFlag, QualityReport, QuestionQuality } from './quality.js';
export { explodePages, splitPdf } from './pdf.js';
export { MODEL_PRICES, estimateUsd } from './pricing.js';
export { SYSTEM_PROMPT, buildUserText } from './prompt.js';

function createSingle(config: SingleExtractorConfig): QuestionExtractor {
  switch (config.provider) {
    case 'mock':
      return new MockExtractor();
    case 'claude':
      if (!config.apiKey) throw new ExtractionError('Thiếu ANTHROPIC_API_KEY', 'not_configured');
      return new ClaudeExtractor({
        apiKey: config.apiKey,
        model: config.model,
        effort: config.effort,
      });
    case 'openai':
      if (!config.apiKey) throw new ExtractionError('Thiếu OPENAI_API_KEY', 'not_configured');
      return new OpenAIExtractor({ apiKey: config.apiKey, model: config.model });
    case 'gemini':
      if (!config.apiKey) throw new ExtractionError('Thiếu GEMINI_API_KEY', 'not_configured');
      return new GeminiExtractor({
        apiKey: config.apiKey,
        model: config.model,
        thinking: config.thinking,
      });
  }
}

/** Tạo extractor theo cấu hình env; ném ExtractionError('not_configured') nếu thiếu API key. */
export function createExtractor(config: ExtractorConfig): QuestionExtractor {
  if (config.provider === 'cascade') {
    return new CascadeExtractor({
      primary: createSingle(config.primary),
      escalation: createSingle(config.escalation),
      maxEscalationShare: config.maxEscalationShare,
    });
  }
  return createSingle(config);
}
