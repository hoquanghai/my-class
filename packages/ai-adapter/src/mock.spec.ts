import { extractionOutputSchema } from '@lophoc/shared';
import { createExtractor, ExtractionError, MockExtractor } from './index.js';

describe('ai-adapter', () => {
  it('mock trả 2 câu mỗi trang, đúng schema', async () => {
    const result = await new MockExtractor().extract({
      pages: [
        { kind: 'image', mime: 'image/png', data: Buffer.alloc(0) },
        { kind: 'pdf', data: Buffer.alloc(0) },
      ],
    });
    expect(result.questions).toHaveLength(4);
    expect(extractionOutputSchema.safeParse({ questions: result.questions }).success).toBe(true);
    expect(result.questions[0]!.options[1]!.isCorrect).toBe(true);
  });

  it('createExtractor: thiếu key → not_configured; mock không cần key', () => {
    expect(() => createExtractor({ provider: 'claude' })).toThrow(ExtractionError);
    expect(createExtractor({ provider: 'mock' }).provider).toBe('mock');
    expect(createExtractor({ provider: 'claude', apiKey: 'sk-test' }).model).toBe(
      'claude-sonnet-5',
    );
    expect(createExtractor({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-x' }).model).toBe(
      'gpt-x',
    );
    expect(() => createExtractor({ provider: 'gemini' })).toThrow(ExtractionError);
    expect(createExtractor({ provider: 'gemini', apiKey: 'g-test' }).model).toBe(
      'gemini-3.7-flash',
    );
  });

  it('createExtractor cascade: ghép model rẻ và model mạnh', () => {
    const cascade = createExtractor({
      provider: 'cascade',
      primary: { provider: 'gemini', apiKey: 'g-test' },
      escalation: { provider: 'claude', apiKey: 'sk-test' },
    });
    expect(cascade.provider).toBe('cascade');
    expect(cascade.model).toBe('gemini-3.7-flash → claude-sonnet-5');
    expect(() =>
      createExtractor({
        provider: 'cascade',
        primary: { provider: 'mock' },
        escalation: { provider: 'claude' },
      }),
    ).toThrow(ExtractionError);
  });
});
