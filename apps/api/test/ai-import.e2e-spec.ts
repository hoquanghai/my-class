import type { INestApplication } from '@nestjs/common';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import request from 'supertest';
import { cleanupE2eData, cookieHeader, createTestApp, type Session, signup } from './helpers.js';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function buildPdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([300, 400]);
  return Buffer.from(await doc.save());
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('AI import (e2e, provider mock, queue inline)', () => {
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

  async function waitForJob(s: Session, id: string) {
    for (let i = 0; i < 40; i++) {
      const res = await http()
        .get(`/api/questions/import/ai/jobs/${id}`)
        .set('Cookie', ck(s))
        .expect(200);
      if (res.body.status === 'done' || res.body.status === 'failed') return res.body;
      await sleep(100);
    }
    throw new Error('job không kết thúc');
  }

  function postImages(s: Session, count: number, extra: Record<string, string> = {}) {
    let req = http().post('/api/questions/import/ai').set('Cookie', ck(s));
    for (let i = 0; i < count; i++) req = req.attach('files', PNG_1X1, `p${i}.png`);
    for (const [k, v] of Object.entries(extra)) req = req.field(k, v);
    return req;
  }

  it('quota ban đầu: bật (mock), 20 trang, chưa dùng', async () => {
    const s = await signup(app, 'ai-quota');
    const res = await http().get('/api/questions/import/ai/quota').set('Cookie', ck(s)).expect(200);
    expect(res.body).toMatchObject({
      enabled: true,
      provider: 'mock',
      limit: 20,
      used: 0,
      remaining: 20,
    });
    expect(res.body.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('2 ảnh → job 202 → done với câu hỏi; quota trừ 2 trang', async () => {
    const s = await signup(app, 'ai-images');
    const created = await postImages(s, 2, { subject: 'Toán', grade: '9' }).expect(202);
    expect(created.body.pageCount).toBe(2);
    expect(created.body.status).toBe('pending');

    const job = await waitForJob(s, created.body.jobId);
    expect(job.status).toBe('done');
    expect(job.result.questions).toHaveLength(4);
    const first = job.result.questions[0];
    expect(first.type).toBe('single_choice');
    expect(first.options.map((o: { isCorrect: boolean }) => o.isCorrect)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    expect(first.issues).toEqual([]);
    expect(job.result.questions[1].type).toBe('short_text');

    const quota = await http()
      .get('/api/questions/import/ai/quota')
      .set('Cookie', ck(s))
      .expect(200);
    expect(quota.body.used).toBe(2);
    expect(quota.body.remaining).toBe(18);
  });

  it('PDF 3 trang → pageCount 3; PDF + ảnh → 400; file lạ → 400', async () => {
    const s = await signup(app, 'ai-pdf');
    const pdf = await buildPdf(3);
    const created = await http()
      .post('/api/questions/import/ai')
      .set('Cookie', ck(s))
      .attach('files', pdf, 'de.pdf')
      .expect(202);
    expect(created.body.pageCount).toBe(3);
    const job = await waitForJob(s, created.body.jobId);
    expect(job.status).toBe('done');
    expect(job.result.questions.length).toBeGreaterThan(0);

    await http()
      .post('/api/questions/import/ai')
      .set('Cookie', ck(s))
      .attach('files', pdf, 'de.pdf')
      .attach('files', PNG_1X1, 'a.png')
      .expect(400);
    await http()
      .post('/api/questions/import/ai')
      .set('Cookie', ck(s))
      .attach('files', Buffer.from([0, 1, 2, 3, 0, 0]), 'a.bin')
      .expect(400);
    await http().post('/api/questions/import/ai').set('Cookie', ck(s)).expect(400);
  });

  it('LaTeX .tex được nhận như văn bản; Word bị từ chối kèm hướng dẫn lưu PDF', async () => {
    const s = await signup(app, 'ai-text');
    const tex = Buffer.from(
      '\\begin{enumerate}\\item Tính $\\int_0^1 x\\,dx$. \\item Đạo hàm của $x^2$?\\end{enumerate}',
      'utf8',
    );
    const created = await http()
      .post('/api/questions/import/ai')
      .set('Cookie', ck(s))
      .attach('files', tex, 'de.tex')
      .expect(202);
    expect(created.body.pageCount).toBe(1);
    expect(created.body.warnings).toEqual([]);
    const job = await waitForJob(s, created.body.jobId);
    expect(job.status).toBe('done');
    expect(job.result.questions.length).toBeGreaterThan(0);
    expect(job.warnings).toEqual([]);

    const recent = await http()
      .get('/api/questions/import/ai/jobs')
      .set('Cookie', ck(s))
      .expect(200);
    expect(recent.body[0]).toMatchObject({
      id: created.body.jobId,
      status: 'done',
      filename: 'de.tex',
      questionCount: job.result.questions.length,
    });

    // Word không được nhận (công thức MathType bị mất): 400 kèm hướng dẫn lưu PDF
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Câu 1.</w:t></w:r></w:p></w:body></w:document>',
    );
    const rejected = await http()
      .post('/api/questions/import/ai')
      .set('Cookie', ck(s))
      .attach('files', await zip.generateAsync({ type: 'nodebuffer' }), 'de.docx')
      .expect(400);
    expect(rejected.body.message).toContain('Word');
    expect(rejected.body.message).toContain('PDF');

    // .tex + ảnh → 400
    await http()
      .post('/api/questions/import/ai')
      .set('Cookie', ck(s))
      .attach('files', tex, 'de.tex')
      .attach('files', PNG_1X1, 'a.png')
      .expect(400);
  });

  it('vượt hạn mức 20 trang/tháng → 403 LIMIT_AI_PAGES', async () => {
    const s = await signup(app, 'ai-limit');
    await postImages(s, 10).expect(202);
    await postImages(s, 10).expect(202);
    const over = await postImages(s, 1).expect(403);
    expect(over.body.code).toBe('LIMIT_AI_PAGES');
    await postImages(s, 11).expect(400);
  });

  it('job của giáo viên khác → 404', async () => {
    const s = await signup(app, 'ai-owner');
    const other = await signup(app, 'ai-other');
    const created = await postImages(s, 1).expect(202);
    await http()
      .get(`/api/questions/import/ai/jobs/${created.body.jobId}`)
      .set('Cookie', ck(other))
      .expect(404);
  });
});
