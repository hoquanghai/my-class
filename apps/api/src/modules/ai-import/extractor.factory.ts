import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createExtractor,
  type ExtractorConfig,
  type QuestionExtractor,
  type SingleAiProvider,
  type SingleExtractorConfig,
} from '@lophoc/ai-adapter';
import type { Env } from '../../config/env.js';

/** Tạo extractor theo env (đơn hoặc cascade), khởi tạo lười và dùng lại. */
@Injectable()
export class ExtractorFactory {
  private extractor: QuestionExtractor | null = null;
  readonly provider: Env['AI_PROVIDER'];
  private readonly config: ExtractorConfig;
  private readonly configured: boolean;

  constructor(config: ConfigService<Env, true>) {
    const env = <K extends keyof Env>(key: K): Env[K] => config.get(key, { infer: true });
    this.provider = env('AI_PROVIDER');
    const keys: Record<SingleAiProvider, string | undefined> = {
      claude: env('ANTHROPIC_API_KEY'),
      openai: env('OPENAI_API_KEY'),
      gemini: env('GEMINI_API_KEY'),
      mock: undefined,
    };
    const single = (provider: SingleAiProvider, model?: string): SingleExtractorConfig => ({
      provider,
      apiKey: keys[provider],
      model: model || undefined,
      effort: env('AI_EFFORT'),
      thinking: env('AI_GEMINI_THINKING'),
    });
    const ready = (c: SingleExtractorConfig) => c.provider === 'mock' || Boolean(c.apiKey);

    if (this.provider === 'cascade') {
      const primary = single(env('AI_PRIMARY_PROVIDER'), env('AI_MODEL'));
      const escalation = single(env('AI_ESCALATION_PROVIDER'), env('AI_ESCALATION_MODEL'));
      this.config = {
        provider: 'cascade',
        primary,
        escalation,
        maxEscalationShare: env('AI_ESCALATION_MAX_SHARE'),
      };
      this.configured = ready(primary) && ready(escalation);
    } else {
      this.config = single(this.provider, env('AI_MODEL'));
      this.configured = ready(this.config);
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  get(): QuestionExtractor {
    if (!this.extractor) this.extractor = createExtractor(this.config);
    return this.extractor;
  }
}
