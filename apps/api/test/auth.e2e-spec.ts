import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MailerService } from '../src/modules/mailer/mailer.service.js';
import {
  cleanupE2eData,
  cookieHeader,
  createTestApp,
  readSetCookies,
  signup,
  tokenFromMail,
  uniqueEmail,
} from './helpers.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let mailer: MailerService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    mailer = app.get(MailerService);
  });

  afterAll(async () => {
    await cleanupE2eData(app);
    await app.close();
  });

  it('signup: 201, hai cookie, email chưa xác thực, có mail xác thực', async () => {
    mailer.outbox.length = 0;
    const s = await signup(app, 'signup');
    expect(s.jar.lh_at).toBeTruthy();
    expect(s.jar.lh_rt).toBeTruthy();
    expect(s.teacher.emailVerified).toBe(false);
    const mail = mailer.outbox.find((m) => m.to === s.email);
    expect(mail?.subject).toContain('Xác thực');
    expect(mail?.text).toContain('/verify-email?token=');
  });

  it('signup trùng email → 409 EMAIL_TAKEN', async () => {
    const s = await signup(app, 'dup');
    const res = await http()
      .post('/api/auth/signup')
      .send({ name: 'X', email: s.email, password: 'matkhau123', acceptTerms: true })
      .expect(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('signup thiếu đồng ý điều khoản hoặc mật khẩu ngắn → 400 với message', async () => {
    const res = await http()
      .post('/api/auth/signup')
      .send({ name: 'X', email: uniqueEmail('terms'), password: 'ngan', acceptTerms: false })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
    expect(typeof res.body.message).toBe('string');
  });

  it('me: 200 với cookie, 401 khi không cookie', async () => {
    const s = await signup(app, 'me');
    const res = await http().get('/api/auth/me').set('Cookie', cookieHeader(s.jar)).expect(200);
    expect(res.body.teacher.email).toBe(s.email);
    await http().get('/api/auth/me').expect(401);
  });

  it('verify-email với token từ mail; dùng lại → 400 INVALID_TOKEN', async () => {
    mailer.outbox.length = 0;
    const s = await signup(app, 'verify');
    const mail = mailer.outbox.find((m) => m.to === s.email);
    const token = tokenFromMail(mail?.text ?? '');
    await http().post('/api/auth/verify-email').send({ token }).expect(200);

    const me = await http().get('/api/auth/me').set('Cookie', cookieHeader(s.jar)).expect(200);
    expect(me.body.teacher.emailVerified).toBe(true);

    const again = await http().post('/api/auth/verify-email').send({ token }).expect(400);
    expect(again.body.code).toBe('INVALID_TOKEN');
  });

  it('login sai → 401, đúng (email viết hoa) → 200 + cookie', async () => {
    const s = await signup(app, 'login');
    await http()
      .post('/api/auth/login')
      .send({ email: s.email, password: 'sai-mat-khau' })
      .expect(401);
    const res = await http()
      .post('/api/auth/login')
      .send({ email: s.email.toUpperCase(), password: s.password })
      .expect(200);
    expect(readSetCookies(res).lh_at).toBeTruthy();
  });

  it('refresh xoay vòng: cặp mới hoạt động, token cũ bị thu hồi', async () => {
    const s = await signup(app, 'refresh');
    const oldRt = s.jar.lh_rt as string;
    const res = await http()
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader({ lh_rt: oldRt }))
      .expect(200);
    const fresh = readSetCookies(res);
    expect(fresh.lh_rt).toBeTruthy();
    expect(fresh.lh_rt).not.toBe(oldRt);
    await http().get('/api/auth/me').set('Cookie', cookieHeader(fresh)).expect(200);
    await http()
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader({ lh_rt: oldRt }))
      .expect(401);
  });

  it('forgot/reset password: đổi mật khẩu, thu hồi phiên cũ, email coi như đã xác thực', async () => {
    mailer.outbox.length = 0;
    const s = await signup(app, 'reset');
    await http().post('/api/auth/forgot-password').send({ email: s.email }).expect(204);
    await http()
      .post('/api/auth/forgot-password')
      .send({ email: uniqueEmail('nope') })
      .expect(204);

    const mail = mailer.outbox.find((m) => m.to === s.email && m.subject.includes('Đặt lại'));
    const token = tokenFromMail(mail?.text ?? '');
    await http()
      .post('/api/auth/reset-password')
      .send({ token, password: 'matkhaumoi456' })
      .expect(200);

    await http().post('/api/auth/login').send({ email: s.email, password: s.password }).expect(401);
    const login = await http()
      .post('/api/auth/login')
      .send({ email: s.email, password: 'matkhaumoi456' })
      .expect(200);
    expect(login.body.teacher.emailVerified).toBe(true);
    await http()
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader({ lh_rt: s.jar.lh_rt as string }))
      .expect(401);
  });

  it('logout thu hồi refresh và xóa cookie', async () => {
    const s = await signup(app, 'logout');
    const res = await http()
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader(s.jar))
      .expect(204);
    const cleared = readSetCookies(res);
    expect(cleared.lh_at).toBe('');
    expect(cleared.lh_rt).toBe('');
    await http()
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader({ lh_rt: s.jar.lh_rt as string }))
      .expect(401);
  });

  it('providers: google tắt khi thiếu env; /auth/google → 503', async () => {
    const res = await http().get('/api/auth/providers').expect(200);
    expect(res.body).toEqual({ google: false, facebook: false });
    await http().get('/api/auth/google').expect(503);
  });

  it('PATCH /teachers/me đổi tên', async () => {
    const s = await signup(app, 'profile');
    const res = await http()
      .patch('/api/teachers/me')
      .set('Cookie', cookieHeader(s.jar))
      .send({ name: 'Cô Lan' })
      .expect(200);
    expect(res.body.teacher.name).toBe('Cô Lan');
  });

  it('GET /limits trả giới hạn gói miễn phí', async () => {
    const s = await signup(app, 'limits');
    const res = await http().get('/api/limits').set('Cookie', cookieHeader(s.jar)).expect(200);
    expect(res.body).toMatchObject({
      maxClasses: 2,
      maxStudentsPerClass: 50,
      exportEnabled: false,
    });
  });
});
