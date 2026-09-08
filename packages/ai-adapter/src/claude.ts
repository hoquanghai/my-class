import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { extractionOutputSchema } from '@lophoc/shared';
import { buildUserText, SYSTEM_PROMPT } from './prompt.js';
import {
  ExtractionError,
  type ExtractionInput,
  type ExtractionResult,
  type QuestionExtractor,
} from './types.js';

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5';

/** Trích xuất câu hỏi bằng Claude: ảnh và PDF gửi trực tiếp, kết quả ép theo schema (structured outputs). */
export class ClaudeExtractor implements QuestionExtractor {
  readonly provider = 'claude';
  readonly model: string;
  private readonly client: Anthropic;
  private readonly effort: 'low' | 'medium' | 'high';

  constructor(opts: { apiKey: string; model?: string; effort?: 'low' | 'medium' | 'high' }) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model ?? DEFAULT_CLAUDE_MODEL;
    this.effort = opts.effort ?? 'medium';
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const content: Anthropic.ContentBlockParam[] = input.pages.map((page) =>
      page.kind === 'pdf'
        ? {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: page.data.toString('base64'),
            },
          }
        : {
            type: 'image',
            source: { type: 'base64', media_type: page.mime, data: page.data.toString('base64') },
          },
    );
    content.push({ type: 'text', text: buildUserText(input) });

    let response;
    try {
      response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
        output_config: { effort: this.effort, format: zodOutputFormat(extractionOutputSchema) },
      });
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        throw new ExtractionError(`Claude API lỗi ${err.status}: ${err.message}`, 'provider_error');
      }
      throw err;
    }

    if (response.stop_reason === 'refusal') {
      throw new ExtractionError('Claude từ chối xử lý tài liệu này', 'refusal');
    }
    if (!response.parsed_output) {
      throw new ExtractionError('Claude trả về dữ liệu không đúng cấu trúc', 'invalid_output');
    }
    return {
      questions: response.parsed_output.questions,
      provider: this.provider,
      model: this.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
