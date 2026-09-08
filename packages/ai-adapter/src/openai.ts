import { extractionOutputSchema } from '@lophoc/shared';
import OpenAI from 'openai';
import { z } from 'zod';
import { buildUserText, SYSTEM_PROMPT } from './prompt.js';
import {
  ExtractionError,
  type ExtractionInput,
  type ExtractionResult,
  type QuestionExtractor,
} from './types.js';

export const DEFAULT_OPENAI_MODEL = 'gpt-5.6';

/** JSON Schema strict cho Structured Outputs của OpenAI: mọi object cấm thuộc tính lạ. */
function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (obj.type === 'object' && obj.properties && typeof obj.properties === 'object') {
      obj.additionalProperties = false;
      obj.required = Object.keys(obj.properties as Record<string, unknown>);
      for (const value of Object.values(obj.properties as Record<string, unknown>)) walk(value);
    }
    if (obj.items) walk(obj.items);
    for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
      const list = obj[key];
      if (Array.isArray(list)) list.forEach(walk);
    }
  };
  delete json.$schema;
  walk(json);
  return json;
}

/** Trích xuất câu hỏi bằng OpenAI Responses API với json_schema strict. */
export class OpenAIExtractor implements QuestionExtractor {
  readonly provider = 'openai';
  readonly model: string;
  private readonly client: OpenAI;

  constructor(opts: { apiKey: string; model?: string }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
    this.model = opts.model ?? DEFAULT_OPENAI_MODEL;
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const content: OpenAI.Responses.ResponseInputContent[] = input.pages.map((page) =>
      page.kind === 'pdf'
        ? {
            type: 'input_file',
            filename: page.filename ?? 'de.pdf',
            file_data: `data:application/pdf;base64,${page.data.toString('base64')}`,
          }
        : {
            type: 'input_image',
            image_url: `data:${page.mime};base64,${page.data.toString('base64')}`,
            detail: 'auto',
          },
    );
    content.push({ type: 'input_text', text: buildUserText(input) });

    let response;
    try {
      response = await this.client.responses.create({
        model: this.model,
        instructions: SYSTEM_PROMPT,
        input: [{ role: 'user', content }],
        text: {
          format: {
            type: 'json_schema',
            name: 'extracted_questions',
            strict: true,
            schema: toStrictJsonSchema(extractionOutputSchema),
          },
        },
      });
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        throw new ExtractionError(`OpenAI API lỗi ${err.status}: ${err.message}`, 'provider_error');
      }
      throw err;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.output_text);
    } catch {
      throw new ExtractionError('OpenAI trả về JSON không hợp lệ', 'invalid_output');
    }
    const result = extractionOutputSchema.safeParse(parsed);
    if (!result.success) {
      throw new ExtractionError('OpenAI trả về dữ liệu không đúng cấu trúc', 'invalid_output');
    }
    return {
      questions: result.data.questions,
      provider: this.provider,
      model: this.model,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    };
  }
}
