import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupE2eData, cookieHeader, createTestApp, type Session, signup } from './helpers.js';

const q = (stem: string, topic: string, type = 'single_choice') => ({
  type,
  stemMd: stem,
  subject: 'toan',
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

describe('Quizzes (e2e)', () => {
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

  async function seedBank(s: Session): Promise<string[]> {
    const res = await http()
      .post('/api/questions/bulk')
      .set('Cookie', ck(s))
      .send({
        source: 'manual',
        questions: [
          q('Q1', 'Đại số'),
          q('Q2', 'Đại số'),
          q('Q3', 'Hình học'),
          q('Q4', 'Hình học'),
          q('Q5', 'Hình học'),
        ],
      })
      .expect(201);
    return res.body.ids as string[];
  }

  it('tạo đề, thêm câu (bỏ trùng), sửa thời gian/điểm, sắp xếp, xóa câu, tóm tắt', async () => {
    const s = await signup(app, 'quiz-crud');
    const ids = await seedBank(s);

    const created = await http()
      .post('/api/quizzes')
      .set('Cookie', ck(s))
      .send({ title: 'Kiểm tra đầu giờ 1', defaultTimeLimitSec: 20 })
      .expect(201);
    const quizId: string = created.body.id;
    expect(created.body.items).toEqual([]);
    expect(created.body.defaultTimeLimitSec).toBe(20);

    const added = await http()
      .post(`/api/quizzes/${quizId}/items`)
      .set('Cookie', ck(s))
      .send({ questionIds: [ids[0], ids[1], ids[0], 'khong-ton-tai'] })
      .expect(200);
    expect(added.body.items.map((i: { questionId: string }) => i.questionId)).toEqual([
      ids[0],
      ids[1],
    ]);
    expect(added.body.items[0].question.stemMd).toBe('Q1');
    expect(added.body.questionCount).toBe(2);
    expect(added.body.totalPoints).toBe(2);

    const item0: string = added.body.items[0].id;
    const item1: string = added.body.items[1].id;
    const updated = await http()
      .patch(`/api/quizzes/${quizId}/items/${item0}`)
      .set('Cookie', ck(s))
      .send({ timeLimitSec: 45, points: 3 })
      .expect(200);
    expect(updated.body.items[0]).toMatchObject({ timeLimitSec: 45, points: 3 });
    expect(updated.body.totalPoints).toBe(4);

    const reordered = await http()
      .post(`/api/quizzes/${quizId}/items/reorder`)
      .set('Cookie', ck(s))
      .send({ itemIds: [item1, item0] })
      .expect(200);
    expect(reordered.body.items.map((i: { id: string }) => i.id)).toEqual([item1, item0]);
    await http()
      .post(`/api/quizzes/${quizId}/items/reorder`)
      .set('Cookie', ck(s))
      .send({ itemIds: [item1] })
      .expect(400);

    await http().delete(`/api/quizzes/${quizId}/items/${item1}`).set('Cookie', ck(s)).expect(204);
    await http().delete(`/api/quizzes/${quizId}/items/${item1}`).set('Cookie', ck(s)).expect(404);

    const list = await http().get('/api/quizzes').set('Cookie', ck(s)).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id: quizId, questionCount: 1, totalPoints: 3 });

    await http()
      .patch(`/api/quizzes/${quizId}`)
      .set('Cookie', ck(s))
      .send({ title: 'Đổi tên', defaultTimeLimitSec: 3 })
      .expect(400);
    const renamed = await http()
      .patch(`/api/quizzes/${quizId}`)
      .set('Cookie', ck(s))
      .send({ title: 'Đổi tên' })
      .expect(200);
    expect(renamed.body.title).toBe('Đổi tên');

    await http().delete(`/api/quizzes/${quizId}`).set('Cookie', ck(s)).expect(204);
    await http().get(`/api/quizzes/${quizId}`).set('Cookie', ck(s)).expect(404);
    expect((await http().get('/api/quizzes').set('Cookie', ck(s)).expect(200)).body).toEqual([]);
  });

  it('random theo bộ lọc không trùng câu đã có; hết câu phù hợp → 400', async () => {
    const s = await signup(app, 'quiz-random');
    const ids = await seedBank(s);
    const quiz = (
      await http().post('/api/quizzes').set('Cookie', ck(s)).send({ title: 'Random' }).expect(201)
    ).body;

    const r1 = await http()
      .post(`/api/quizzes/${quiz.id}/items/random`)
      .set('Cookie', ck(s))
      .send({ count: 2, filter: { topic: 'Hình học' } })
      .expect(200);
    const picked = r1.body.items.map((i: { questionId: string }) => i.questionId);
    expect(picked).toHaveLength(2);
    expect(picked.every((id: string) => [ids[2], ids[3], ids[4]].includes(id))).toBe(true);

    const r2 = await http()
      .post(`/api/quizzes/${quiz.id}/items/random`)
      .set('Cookie', ck(s))
      .send({ count: 5, filter: { topic: 'Hình học' } })
      .expect(200);
    expect(r2.body.items).toHaveLength(3);
    expect(new Set(r2.body.items.map((i: { questionId: string }) => i.questionId)).size).toBe(3);

    await http()
      .post(`/api/quizzes/${quiz.id}/items/random`)
      .set('Cookie', ck(s))
      .send({ count: 1, filter: { topic: 'Hình học' } })
      .expect(400);
  });

  it('đề của giáo viên khác → 404; câu của giáo viên khác không thêm được', async () => {
    const a = await signup(app, 'quiz-a');
    const b = await signup(app, 'quiz-b');
    const idsB = await seedBank(b);
    const quiz = (
      await http().post('/api/quizzes').set('Cookie', ck(a)).send({ title: 'A' }).expect(201)
    ).body;
    await http().get(`/api/quizzes/${quiz.id}`).set('Cookie', ck(b)).expect(404);
    const added = await http()
      .post(`/api/quizzes/${quiz.id}/items`)
      .set('Cookie', ck(a))
      .send({ questionIds: [idsB[0]] })
      .expect(200);
    expect(added.body.items).toEqual([]);
  });
});
