import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { FeatureFlagsService } from '../src/modules/feature-flags/feature-flags.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanupE2eData, cookieHeader, createTestApp, type Session, signup } from './helpers.js';

const single = {
  type: 'single_choice',
  stemMd: 'Nghiệm của $2x+3=11$?',
  subject: 'toan',
  grade: '12',
  topic: 'Phương trình',
  difficulty: 'nhan_biet',
  source: 'manual',
  options: [
    { label: 'A', contentMd: '3', isCorrect: false },
    { label: 'B', contentMd: '4', isCorrect: true },
  ],
  acceptedAnswers: [],
};
const short = {
  type: 'short_text',
  stemMd: 'Tính 15×4',
  subject: 'toan',
  grade: '12',
  topic: 'Số học',
  source: 'manual',
  options: [],
  acceptedAnswers: ['60'],
};

describe('Community (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const ck = (s: Session) => cookieHeader(s.jar);
  let prisma: PrismaService;
  let flags: FeatureFlagsService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    flags = app.get(FeatureFlagsService);
  });

  afterAll(async () => {
    await prisma.featureFlag.deleteMany({ where: { key: { startsWith: 'community.' } } });
    await cleanupE2eData(app);
    await app.close();
  });

  async function setFlag(key: string, value: number) {
    await prisma.featureFlag.upsert({ where: { key }, create: { key, value }, update: { value } });
    flags.clearCache();
  }

  async function author(tag: string) {
    const s = await signup(app, tag);
    // e2e signup không qua bước xác minh email → đánh dấu để được đăng bài
    await prisma.teacher.updateMany({
      where: { email: { startsWith: `e2e-${tag}` } },
      data: { emailVerifiedAt: new Date() },
    });
    const ids = (
      await http()
        .post('/api/questions/bulk')
        .set('Cookie', ck(s))
        .send({ source: 'manual', questions: [single, short] })
        .expect(201)
    ).body.ids as string[];
    return { s, ids };
  }

  it('đăng, xem, thích, lấy về, góp ý, báo cáo, trạng thái, bản mới, xóa', async () => {
    const { s: a, ids } = await author('community-a');
    const { s: b } = await author('community-b');

    // thiếu xác nhận quyền chia sẻ → 400; đăng từ danh sách câu → 201
    await http()
      .post('/api/community/sets')
      .set('Cookie', ck(a))
      .send({ title: 'Bộ đề phương trình', subject: 'toan', grade: '12', questionIds: ids })
      .expect(400);
    const published = await http()
      .post('/api/community/sets')
      .set('Cookie', ck(a))
      .send({
        title: 'Bộ đề phương trình',
        description: 'Ôn tập chương 1',
        subject: 'toan',
        grade: '12',
        topic: 'Phương trình',
        status: 'published',
        questionIds: ids,
        agree: true,
      })
      .expect(201);
    const setId = published.body.id as string;
    expect(published.body).toMatchObject({
      status: 'published',
      questionCount: 2,
      version: 1,
      questionTypes: ['single_choice', 'short_text'],
      difficulties: ['nhan_biet'],
      viewer: { isAuthor: true, liked: false, cloned: false },
    });
    expect(published.body.questions[0].snapshot.options[1].isCorrect).toBe(true);
    expect(published.body.usage).toEqual({ runs: 0, answers: 0, correctPercent: null });

    // kho: B thấy bài; lọc theo môn/khối/loại câu; tìm theo tên
    const listed = await http()
      .get('/api/community/sets?subject=toan&grade=12&type=short_text&q=phương')
      .set('Cookie', ck(b))
      .expect(200);
    expect(listed.body.total).toBe(1);
    expect(listed.body.items[0]).toMatchObject({
      id: setId,
      author: { name: expect.any(String) },
      viewer: { isAuthor: false },
    });
    const none = await http()
      .get('/api/community/sets?subject=vat_ly')
      .set('Cookie', ck(b))
      .expect(200);
    expect(none.body.total).toBe(0);
    const facets = await http()
      .get('/api/community/facets?subject=toan')
      .set('Cookie', ck(b))
      .expect(200);
    expect(facets.body.topics).toEqual(['Phương trình']);

    // thích / bỏ thích
    const liked = await http()
      .post(`/api/community/sets/${setId}/like`)
      .set('Cookie', ck(b))
      .expect(200);
    expect(liked.body).toEqual({ liked: true, likeCount: 1 });
    const detailB = await http()
      .get(`/api/community/sets/${setId}`)
      .set('Cookie', ck(b))
      .expect(200);
    expect(detailB.body.viewer).toMatchObject({ liked: true, isAuthor: false });
    expect(detailB.body.reportCount).toBe(0);
    await http().delete(`/api/community/sets/${setId}/like`).set('Cookie', ck(b)).expect(200);

    // lấy về kèm tạo đề: câu mới thuộc B, nguồn community, đề có 2 câu
    const cloned = await http()
      .post(`/api/community/sets/${setId}/clone`)
      .set('Cookie', ck(b))
      .send({ createQuiz: true })
      .expect(201);
    expect(cloned.body.added).toBe(2);
    expect(cloned.body.quizId).toBeTruthy();
    const bankB = await http()
      .get('/api/questions?source=community')
      .set('Cookie', ck(b))
      .expect(200);
    expect(bankB.body.total).toBe(2);
    expect(bankB.body.items[0]).toMatchObject({
      source: 'community',
      subject: 'toan',
      grade: '12',
    });
    const quizB = await http()
      .get(`/api/quizzes/${cloned.body.quizId}`)
      .set('Cookie', ck(b))
      .expect(200);
    expect(quizB.body.questionCount).toBe(2);
    const afterClone = await http()
      .get(`/api/community/sets/${setId}`)
      .set('Cookie', ck(b))
      .expect(200);
    expect(afterClone.body).toMatchObject({ cloneCount: 1, viewer: { cloned: true } });

    // trần lấy về mỗi ngày
    await setFlag('community.max_clones_per_day', 1);
    const capped = await http()
      .post(`/api/community/sets/${setId}/clone`)
      .set('Cookie', ck(b))
      .send({})
      .expect(403);
    expect(capped.body.code).toBe('LIMIT_COMMUNITY_CLONES');

    // góp ý gắn câu số 2; tác giả đánh dấu đã sửa; B không được đánh dấu; B xóa bình luận của mình
    const comment = await http()
      .post(`/api/community/sets/${setId}/comments`)
      .set('Cookie', ck(b))
      .send({ body: 'Câu 2 nên chấp nhận cả "60 " có khoảng trắng', questionIndex: 2 })
      .expect(201);
    expect(comment.body).toMatchObject({
      questionIndex: 2,
      viewer: { isMine: true, canModerate: false },
    });
    await http()
      .post(`/api/community/sets/${setId}/comments`)
      .set('Cookie', ck(b))
      .send({ body: 'x', questionIndex: 9 })
      .expect(400);
    const listedComments = await http()
      .get(`/api/community/sets/${setId}/comments`)
      .set('Cookie', ck(a))
      .expect(200);
    expect(listedComments.body).toHaveLength(1);
    expect(listedComments.body[0].viewer).toEqual({ isMine: false, canModerate: true });
    await http()
      .post(`/api/community/comments/${comment.body.id}/resolve`)
      .set('Cookie', ck(b))
      .expect(404);
    const resolved = await http()
      .post(`/api/community/comments/${comment.body.id}/resolve`)
      .set('Cookie', ck(a))
      .expect(200);
    expect(resolved.body.resolvedAt).not.toBeNull();
    await http()
      .delete(`/api/community/comments/${comment.body.id}`)
      .set('Cookie', ck(b))
      .expect(204);
    const afterDelete = await http()
      .get(`/api/community/sets/${setId}`)
      .set('Cookie', ck(a))
      .expect(200);
    expect(afterDelete.body.commentCount).toBe(0);

    // đổi trạng thái: chỉ ai có link → không có trong kho nhưng mở được; lưu trữ → người khác 404
    await http()
      .patch(`/api/community/sets/${setId}`)
      .set('Cookie', ck(a))
      .send({ status: 'unlisted' })
      .expect(200);
    expect(
      (await http().get('/api/community/sets').set('Cookie', ck(b)).expect(200)).body.total,
    ).toBe(0);
    await http().get(`/api/community/sets/${setId}`).set('Cookie', ck(b)).expect(200);
    await http()
      .patch(`/api/community/sets/${setId}`)
      .set('Cookie', ck(a))
      .send({ status: 'archived', title: 'Bộ đề phương trình (cũ)' })
      .expect(200);
    await http().get(`/api/community/sets/${setId}`).set('Cookie', ck(b)).expect(404);
    await http().get(`/api/community/sets/${setId}`).set('Cookie', ck(a)).expect(200);
    await http()
      .patch(`/api/community/sets/${setId}`)
      .set('Cookie', ck(b))
      .send({ status: 'published' })
      .expect(404);

    // bản mới: chỉ còn 1 câu, version 2
    await http()
      .patch(`/api/community/sets/${setId}`)
      .set('Cookie', ck(a))
      .send({ status: 'published' })
      .expect(200);
    const v2 = await http()
      .post(`/api/community/sets/${setId}/republish`)
      .set('Cookie', ck(a))
      .send({ questionIds: [ids[1]] })
      .expect(200);
    expect(v2.body).toMatchObject({ version: 2, questionCount: 1, questionTypes: ['short_text'] });

    // báo cáo: tác giả không tự báo cáo; đủ ngưỡng (flag = 1) → tự ẩn, B không thấy nữa, A thấy hidden
    await http()
      .post(`/api/community/sets/${setId}/report`)
      .set('Cookie', ck(a))
      .send({ reason: 'spam' })
      .expect(400);
    await setFlag('community.report_auto_hide', 1);
    const reported = await http()
      .post(`/api/community/sets/${setId}/report`)
      .set('Cookie', ck(b))
      .send({ reason: 'wrong_answer', detail: 'Câu 1 đáp án B sai' })
      .expect(200);
    expect(reported.body).toEqual({ reason: 'wrong_answer', reportCount: 1, hidden: true });
    await http().get(`/api/community/sets/${setId}`).set('Cookie', ck(b)).expect(404);
    const hiddenForAuthor = await http()
      .get(`/api/community/sets/${setId}`)
      .set('Cookie', ck(a))
      .expect(200);
    expect(hiddenForAuthor.body).toMatchObject({ hidden: true, reportCount: 1 });
    expect(
      (await http().get('/api/community/mine').set('Cookie', ck(a)).expect(200)).body,
    ).toHaveLength(1);

    // đăng từ đề; xóa bài → câu B đã lấy về vẫn còn
    const quizA = (
      await http()
        .post('/api/quizzes')
        .set('Cookie', ck(a))
        .send({ title: 'Đề chia sẻ', defaultTimeLimitSec: 30 })
        .expect(201)
    ).body;
    await http()
      .post(`/api/quizzes/${quizA.id}/items`)
      .set('Cookie', ck(a))
      .send({ questionIds: ids })
      .expect(200);
    const fromQuiz = await http()
      .post('/api/community/sets')
      .set('Cookie', ck(a))
      .send({
        title: 'Từ đề kiểm tra',
        subject: 'toan',
        grade: '12',
        quizId: quizA.id,
        agree: true,
      })
      .expect(201);
    expect(fromQuiz.body).toMatchObject({ status: 'draft', questionCount: 2, publishedAt: null });
    await http().get(`/api/community/sets/${fromQuiz.body.id}`).set('Cookie', ck(b)).expect(404);

    await http().delete(`/api/community/sets/${setId}`).set('Cookie', ck(a)).expect(204);
    await http().get(`/api/community/sets/${setId}`).set('Cookie', ck(a)).expect(404);
    const bankAfter = await http()
      .get('/api/questions?source=community')
      .set('Cookie', ck(b))
      .expect(200);
    expect(bankAfter.body.total).toBe(2);
  });

  it('chưa xác minh email → không đăng được; giáo viên khác không thấy bản nháp', async () => {
    const s = await signup(app, 'community-unverified');
    const res = await http()
      .post('/api/community/sets')
      .set('Cookie', ck(s))
      .send({ title: 'Thử đăng', subject: 'toan', grade: '12', questionIds: ['x'], agree: true })
      .expect(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });
});
