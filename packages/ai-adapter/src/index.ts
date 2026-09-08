import { ClaudeExtractor } from './claude.js';
import { MockExtractor } from './mock.js';
import { OpenAIExtractor } from './openai.js';
import { ExtractionError, type ExtractorConfig, type QuestionExtractor } from './types.js';

export * from './types.js';
export { ClaudeExtractor, DEFAULT_CLAUDE_MODEL } from './claude.js';
export { OpenAIExtractor, DEFAULT_OPENAI_MODEL } from './openai.js';
export { MockExtractor } from './mock.js';
export { SYSTEM_PROMPT, buildUserText } from './prompt.js';

/** Tạo extractor theo cấu hình env; ném ExtractionError('not_configured') nếu thiếu API key. */
export function createExtractor(config: ExtractorConfig): QuestionExtractor {
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
  }
}
