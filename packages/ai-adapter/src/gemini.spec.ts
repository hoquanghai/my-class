import { extractionOutputSchema } from '@lophoc/shared';
import { PDFDocument } from 'pdf-lib';
import { toGeminiJsonSchema } from './gemini.js';
import { explodePages } from './pdf.js';

describe('toGeminiJsonSchema', () => {
  it('bỏ $schema và giới hạn số nguyên, giữ required/anyOf', () => {
    const json = toGeminiJsonSchema(extractionOutputSchema) as {
      $schema?: string;
      properties: {
        questions: { items: { properties: Record<string, unknown>; required: string[] } };
      };
    };
    expect(json.$schema).toBeUndefined();
    const item = json.properties.questions.items;
    expect(item.required).toEqual(
      expect.arrayContaining([
        'number',
        'page',
        'type',
        'stem',
        'options',
        'answer',
        'explanation',
      ]),
    );
    expect(JSON.stringify(item.properties.number)).not.toContain('minimum');
    expect(JSON.stringify(item.properties.type)).toContain('anyOf');
  });
});

describe('explodePages', () => {
  it('ảnh giữ nguyên, PDF tách từng trang theo thứ tự', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    doc.addPage([100, 100]);
    const pdf = Buffer.from(await doc.save());
    const units = await explodePages([
      { kind: 'image', mime: 'image/png', data: Buffer.alloc(1) },
      { kind: 'pdf', data: pdf, filename: 'de.pdf' },
    ]);
    expect(units.map((u) => u.kind)).toEqual(['image', 'pdf', 'pdf']);
    expect(units[1]).toMatchObject({ filename: 'de.pdf#1' });
    const second = await PDFDocument.load(units[2]!.data);
    expect(second.getPageCount()).toBe(1);
  });
});
