import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createExtractor, type QuestionExtractor } from '@lophoc/ai-adapter';
import type { Env } from '../../config/env.js';

/** Tạo extractor theo env, khởi tạo lười và dùng lại. */
@Injectable()
export class ExtractorFactory {
  private extractor: QuestionExtractor | null = null;
  readonly provider: Env['AI_PROVIDER'];
  private readonly apiKey: string | undefined;
  private readonly model: string | undefined;
  private readonly effort: Env['AI_EFFORT'];

  constructor(config: ConfigService<Env, true>) {
    this.provider = config.get('AI_PROVIDER', { infer: true });
    this.apiKey =
      this.provider === 'claude'
        ? config.get('ANTHROPIC_API_KEY', { infer: true })
        : this.provider === 'openai'
          ? config.get('OPENAI_API_KEY', { infer: true })
          : undefined;
    this.model = config.get('AI_MODEL', { infer: true }) || undefined;
    this.effort = config.get('AI_EFFORT', { infer: true });
  }

  isConfigured(): boolean {
    return this.provider === 'mock' || Boolean(this.apiKey);
  }

  get(): QuestionExtractor {
    if (!this.extractor) {
      this.extractor = createExtractor({
        provider: this.provider,
        apiKey: this.apiKey,
        model: this.model,
        effort: this.effort,
      });
    }
    return this.extractor;
  }
}
