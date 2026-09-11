import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MailerService } from '../src/modules/mailer/mailer.service.js';
import { cleanupE2eData, cookieHeader, createTestApp, type Session, signup } from './helpers.js';

const REVIEW_LINK = /\/api\/billing\/review\/([a-z0-9]+)\?token=([A-Za-z0-9_-]+)/;

describe('Billing (e2e)', () => {
  let app: INestApplication;
  let mailer: MailerService;
  const http = () => request(app.getHttpServer());
  const ck = (s: Session) => cookieHeader(s.jar);

  beforeAll(async () => {
    app = await createTestApp();
    mailer = app.get(MailerService);
  });

  afterAll(async () => {
    await cleanupE2eData(app);
    await app.close();
  });

  it('gửi yêu cầu → email admin có link duyệt → kích hoạt → gói và hạn cập nhật; lịch sử', async () => {
    const s = await signup(app, 'billing');
    mailer.outbox.length = 0;

    const before = await http().get('/api/billing/me').set('Cookie', ck(s)).expect(200);
    expect(before.body).toMatchObject({ plan: 'free', planExpiresAt: null, pendingRequest: null });

    const created = await http()
      .post('/api/billing/requests')
      .set('Cookie', ck(s))
      .send({ plan: 'gold', cycle: 'yearly', note: 'Chuyển từ Vietcombank 10:15' })
      .expect(201);
    expect(created.body).toMatchObject({
      plan: 'gold',
      cycle: 'yearly',
      amount: 840_000,
      status: 'pending',
      note: 'Chuyển từ Vietcombank 10:15',
    });
    expect(created.body.memo).toBe(`LOPHOC GOLD 12T ${s.email}`);

    // không cho gửi yêu cầu thứ hai khi còn một yêu cầu chờ
    const dup = await http()
      .post('/api/billing/requests')
      .set('Cookie', ck(s))
      .send({ plan: 'platinum', cycle: 'monthly' })
      .expect(409);
    expect(dup.body.code).toBe('PAYMENT_PENDING');

    const pending = await http().get('/api/billing/me').set('Cookie', ck(s)).expect(200);
    expect(pending.body.pendingRequest.id).toBe(created.body.id);
    expect(pending.body.requests).toHaveLength(1);

    // email cho admin kèm link duyệt có token
    const adminMail = mailer.outbox.find((m) => m.subject.includes('Yêu cầu thanh toán'));
    expect(adminMail).toBeDefined();
    expect(adminMail!.text).toContain('840.000đ');
    const link = adminMail!.text.match(REVIEW_LINK);
    expect(link).not.toBeNull();
    const [, id, token] = link!;
    expect(id).toBe(created.body.id);

    // token sai → 403; đúng → trang duyệt có nút kích hoạt
    await http().get(`/api/billing/review/${id}?token=sai`).expect(403);
    const page = await http().get(`/api/billing/review/${id}?token=${token}`).expect(200);
    expect(page.headers['content-type']).toContain('text/html');
    expect(page.text).toContain('Kích hoạt gói');
    expect(page.text).toContain(s.email);

    mailer.outbox.length = 0;
    const done = await http()
      .post(`/api/billing/review/${id}/confirm`)
      .type('form')
      .send({ token, note: 'Đã nhận 840.000đ' })
      .expect(200);
    expect(done.text).toContain('Đã kích hoạt');

    const after = await http().get('/api/billing/me').set('Cookie', ck(s)).expect(200);
    expect(after.body.plan).toBe('gold');
    expect(after.body.pendingRequest).toBeNull();
    expect(after.body.requests[0]).toMatchObject({
      status: 'confirmed',
      reviewNote: 'Đã nhận 840.000đ',
    });
    const until = new Date(after.body.planExpiresAt as string);
    const now = new Date();
    const months =
      (until.getFullYear() - now.getFullYear()) * 12 + until.getMonth() - now.getMonth();
    expect(months).toBe(12);
    const me = await http().get('/api/auth/me').set('Cookie', ck(s)).expect(200);
    expect(me.body.teacher).toMatchObject({
      plan: 'gold',
      planExpiresAt: after.body.planExpiresAt,
    });
    const teacherMail = mailer.outbox.find((m) => m.to === s.email);
    expect(teacherMail?.subject).toContain('đã được kích hoạt');

    // duyệt lại lần nữa không đổi gì; yêu cầu mới bị từ chối → gói giữ nguyên
    await http().post(`/api/billing/review/${id}/confirm`).type('form').send({ token }).expect(200);
    const second = await http()
      .post('/api/billing/requests')
      .set('Cookie', ck(s))
      .send({ plan: 'platinum', cycle: 'monthly' })
      .expect(201);
    const secondMail = mailer.outbox.find((m) => m.text.includes(second.body.id));
    const token2 = secondMail!.text.match(/token=([A-Za-z0-9_-]+)/)![1];
    await http()
      .post(`/api/billing/review/${second.body.id}/reject`)
      .type('form')
      .send({ token: token2, note: 'Không thấy giao dịch' })
      .expect(200);
    const final = await http().get('/api/billing/me').set('Cookie', ck(s)).expect(200);
    expect(final.body.plan).toBe('gold');
    expect(final.body.requests.map((r: { status: string }) => r.status)).toEqual([
      'rejected',
      'confirmed',
    ]);
  });
});
