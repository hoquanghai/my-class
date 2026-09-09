import { GoogleGenAI, type Part, type ThinkingLevel } from '@google/genai';
import { extractionOutputSchema } from '@lophoc/shared';
import { z } from 'zod';
import { buildUserText, SYSTEM_PROMPT } from './prompt.js';
import {
  ExtractionError,
  type ExtractionInput,
  type ExtractionResult,
  type GeminiThinking,
  type QuestionExtractor,
} from './types.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.7-flash';

/**
 * JSON Schema cho `responseJsonSchema` của Gemini: bỏ `$schema` và giới hạn số nguyên
 * quá lớn mà zod sinh ra; giữ `anyOf`/`type: [.., "null"]` vì Gemini hỗ trợ.
 */
export function toGeminiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (obj.type === 'integer') {
      delete obj.minimum;
      delete obj.maximum;
    }
    for (const value of Object.values(obj)) walk(value);
  };
  delete json.$schema;
  walk(json);
  return json;
}

/** Trích xuất câu hỏi bằng Gemini: ảnh và PDF gửi inline, JSON ép theo schema, suy nghĩ mức thấp. */
export class GeminiExtractor implements QuestionExtractor {
  readonly provider = 'gemini';
  readonly model: string;
  private readonly client: GoogleGenAI;
  private readonly thinking: GeminiThinking;

  constructor(opts: { apiKey: string; model?: string; thinking?: GeminiThinking }) {
    this.client = new GoogleGenAI({ apiKey: opts.apiKey });
    this.model = opts.model ?? DEFAULT_GEMINI_MODEL;
    this.thinking = opts.thinking ?? 'LOW';
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const parts: Part[] = input.pages.map((page) => ({
      inlineData: {
        mimeType: page.kind === 'pdf' ? 'application/pdf' : page.mime,
        data: page.data.toString('base64'),
      },
    }));
    parts.push({ text: buildUserText(input) });

    let response;
    try {
      response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: toGeminiJsonSchema(extractionOutputSchema),
          thinkingConfig: { thinkingLevel: this.thinking as ThinkingLevel },
          maxOutputTokens: 32000,
          temperature: 0,
        },
      });
    } catch (err) {
      throw new ExtractionError(`Gemini API lỗi: ${(err as Error).message}`, 'provider_error');
    }

    const blocked = response.promptFeedback?.blockReason;
    if (blocked) {
      throw new ExtractionError(`Gemini từ chối xử lý tài liệu này (${blocked})`, 'refusal');
    }
    const text = response.text;
    if (!text) throw new ExtractionError('Gemini không trả về nội dung', 'invalid_output');
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ExtractionError('Gemini trả về JSON không hợp lệ', 'invalid_output');
    }
    const result = extractionOutputSchema.safeParse(parsed);
    if (!result.success) {
      throw new ExtractionError('Gemini trả về dữ liệu không đúng cấu trúc', 'invalid_output');
    }

    const usage = response.usageMetadata;
    const outputTokens =
      usage && (usage.candidatesTokenCount !== undefined || usage.thoughtsTokenCount !== undefined)
        ? (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0)
        : undefined;
    return {
      questions: result.data.questions,
      provider: this.provider,
      model: this.model,
      inputTokens: usage?.promptTokenCount,
      outputTokens,
    };
  }
}
