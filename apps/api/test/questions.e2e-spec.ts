import type { INestApplication } from '@nestjs/common';
import JSZip from 'jszip';
import request from 'supertest';
import { cleanupE2eData, cookieHeader, createTestApp, type Session, signup } from './helpers.js';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** Tạo file .docx tối giản với các đoạn văn (có thể in đậm) để test mammoth. */
async function buildDocx(paragraphs: { text: string; bold?: boolean }[]): Promise<Buffer> {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = paragraphs
    .map(
      (p) =>
        `<w:p><w:r>${p.bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${esc(p.text)}</w:t></w:r></w:p>`,
    )
    .join('');
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

const singleChoice = (stem: string, topic = 'Đại số') => ({
  type: 'single_choice',
  stemMd: stem,
  subject: 'Toán',
  grade: '9',
  topic,
  difficulty: 'nhan_biet',
  source: 'manual',
  options: [
    { label: 'A', contentMd: 'sai', isCorrect: false },
    { label: 'B', contentMd: 'đúng', isCorrect: true },
  ],
  acceptedAnswers: [],
});

describe('Questions (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const ck = (s: Session) => cookieHeader(s.jar);

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanupE2eData(app);
    await app.close();
  });

  it('tạo câu hỏi một lựa chọn; validation đáp án', async () => {
    const s = await signup(app, 'q-create');
    const res = await http()
      .post('/api/questions')
      .set('Cookie', ck(s))
      .send(singleChoice('Nghiệm của $2x+3=11$?'))
      .expect(201);
    expect(res.body.type).toBe('single_choice');
    expect(res.body.options.map((o: { label: string }) => o.label)).toEqual(['A', 'B']);
    expect(res.body.options[1].isCorrect).toBe(true);

    const noCorrect = { ...singleChoice('x'), options: singleChoice('x').options.map((o) => ({ ...o, isCorrect: false })) };
    const bad = await http().post('/api/questions').set('Cookie', ck(s)).send(noCorrect).expect(400);
    expect(bad.body.message).toContain('đáp án');

    await http()
      .post('/api/questions')
      .set('Cookie', ck(s))
      .send({ type: 'short_text', stemMd: 'Tính 15×4', source: 'manual', acceptedAnswers: [] })
      .expect(400);
    const short = await http()
      .post('/api/questions')
      .set('Cookie', ck(s))
      .send({ type: 'short_text', stemMd: 'Tính 15×4', source: 'manual', acceptedAnswers: ['60'] })
      .expect(201);
    expect(short.body.acceptedAnswers).toEqual(['60']);
    expect(short.body.options).toEqual([]);
  });

  it('bulk tạo, liệt kê phân trang, lọc, tìm, facets', async () => {
    const s = await signup(app, 'q-list');
    const bulk = await http()
      .post('/api/questions/bulk')
      .set('Cookie', ck(s))
      .send({
        source: 'paste',
        questions: [
          singleChoice('Căn bậc hai của 49', 'Căn bậc hai'),
          singleChoice('Hệ số góc của $y=-3x+2$', 'Hàm số'),
          { ...singleChoice('Tổng ba góc tam giác', 'Tam giác'), subject: 'Toán', grade: '7' },
        ],
      })
      .expect(201);
    expect(bulk.body.created).toBe(3);
    expect(bulk.body.ids).toHaveLength(3);

    const all = await http().get('/api/questions').set('Cookie', ck(s)).expect(200);
    expect(all.body.total).toBe(3);
    expect(all.body.items[0].source).toBe('paste');

    const page = await http().get('/api/questions?page=2&pageSize=2').set('Cookie', ck(s)).expect(200);
    expect(page.body.items).toHaveLength(1);

    const byGrade = await http().get('/api/questions?grade=7').set('Cookie', ck(s)).expect(200);
    expect(byGrade.body.total).toBe(1);

    const search = await http().get('/api/questions?q=hệ số góc').set('Cookie', ck(s)).expect(200);
    expect(search.body.total).toBe(1);

    const facets = await http().get('/api/questions/facets').set('Cookie', ck(s)).expect(200);
    expect(facets.body.subjects).toEqual(['Toán']);
    expect(facets.body.grades).toEqual(['7', '9']);
    expect(facets.body.topics).toEqual(['Căn bậc hai', 'Hàm số', 'Tam giác']);
  });

  it('sửa (thay phương án, đổi loại), xóa mềm, của người khác → 404', async () => {
    const s = await signup(app, 'q-update');
    const other = await signup(app, 'q-other');
    const created = (await http().post('/api/questions').set('Cookie', ck(s)).send(singleChoice('gốc')).expect(201)).body;

    const updated = await http()
      .patch(`/api/questions/${created.id}`)
      .set('Cookie', ck(s))
      .send({
        stemMd: 'đã sửa',
        type: 'multiple_choice',
        options: [
          { label: 'A', contentMd: '1', isCorrect: true },
          { label: 'B', contentMd: '2', isCorrect: true },
          { label: 'C', contentMd: '3', isCorrect: false },
        ],
      })
      .expect(200);
    expect(updated.body.stemMd).toBe('đã sửa');
    expect(updated.body.type).toBe('multiple_choice');
    expect(updated.body.options).toHaveLength(3);

    await http()
      .patch(`/api/questions/${created.id}`)
      .set('Cookie', ck(s))
      .send({ type: 'single_choice' })
      .expect(400); // 2 đáp án đúng nhưng đổi sang một lựa chọn

    await http().get(`/api/questions/${created.id}`).set('Cookie', ck(other)).expect(404);
    await http().delete(`/api/questions/${created.id}`).set('Cookie', ck(other)).expect(404);

    await http().delete(`/api/questions/${created.id}`).set('Cookie', ck(s)).expect(204);
    await http().get(`/api/questions/${created.id}`).set('Cookie', ck(s)).expect(404);
    const list = await http().get('/api/questions').set('Cookie', ck(s)).expect(200);
    expect(list.body.total).toBe(0);
  });

  it('import .docx: nhận câu, phương án, đáp án in đậm', async () => {
    const s = await signup(app, 'q-docx');
    const docx = await buildDocx([
      { text: 'ĐỀ KIỂM TRA 15 PHÚT' },
      { text: 'Câu 1. Thủ đô của Việt Nam là' },
      { text: 'A. Huế' },
      { text: 'B. Hà Nội', bold: true },
      { text: 'C. Đà Nẵng' },
      { text: 'Câu 2. 2 + 2 = ?' },
      { text: 'A. 3' },
      { text: 'B. 4' },
      { text: 'ĐÁP ÁN' },
      { text: '2B' },
    ]);
    const res = await http()
      .post('/api/questions/import/docx')
      .set('Cookie', ck(s))
      .attach('file', docx, 'de.docx')
      .expect(200);
    expect(res.body.questions).toHaveLength(2);
    expect(res.body.questions[0].options.map((o: { isCorrect: boolean }) => o.isCorrect)).toEqual([false, true, false]);
    expect(res.body.questions[0].options[1].contentMd).toBe('Hà Nội');
    expect(res.body.questions[1].options[1].isCorrect).toBe(true);
    expect(res.body.answerKeyFound).toBe(true);

    await http()
      .post('/api/questions/import/docx')
      .set('Cookie', ck(s))
      .attach('file', Buffer.from('not a docx'), 'de.docx')
      .expect(400);
  });

  it('upload ảnh: PNG hợp lệ → 201 có url; file lạ → 400', async () => {
    const s = await signup(app, 'q-media');
    const ok = await http()
      .post('/api/media/upload')
      .set('Cookie', ck(s))
      .attach('file', PNG_1X1, 'a.png')
      .expect(201);
    expect(ok.body.key).toMatch(/\.png$/);
    expect(ok.body.url).toContain(ok.body.key);
    const served = await http().get(`/api/media/mem/${ok.body.key}`).expect(200);
    expect(served.headers['content-type']).toBe('image/png');

    await http()
      .post('/api/media/upload')
      .set('Cookie', ck(s))
      .attach('file', Buffer.from('hello'), 'a.png')
      .expect(400);
  });
});
