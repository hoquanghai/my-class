import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupE2eData, cookieHeader, createTestApp, type Session, signup } from './helpers.js';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('Teacher profile (e2e)', () => {
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

  it('GET /teachers/me trả hồ sơ đầy đủ; PATCH cập nhật từng phần; dữ liệu sai → 400', async () => {
    const s = await signup(app, 'profile-fields');
    const me = await http().get('/api/teachers/me').set('Cookie', ck(s)).expect(200);
    expect(me.body.teacher).toMatchObject({
      levels: [],
      subjects: [],
      phone: null,
      school: null,
      hasPassword: true,
      providers: [],
    });

    const updated = await http()
      .patch('/api/teachers/me')
      .set('Cookie', ck(s))
      .send({
        phone: '0912 345 678',
        school: 'Trung tâm Ánh Sáng',
        levels: ['thpt'],
        subjects: ['toan', 'vat_ly'],
      })
      .expect(200);
    expect(updated.body.teacher).toMatchObject({
      name: 'GV Test',
      phone: '0912345678',
      school: 'Trung tâm Ánh Sáng',
      levels: ['thpt'],
      subjects: ['toan', 'vat_ly'],
    });

    // Chỉ đổi tên, các trường khác giữ nguyên; xóa số điện thoại bằng chuỗi rỗng
    const renamed = await http()
      .patch('/api/teachers/me')
      .set('Cookie', ck(s))
      .send({ name: 'Cô Lan', phone: '' })
      .expect(200);
    expect(renamed.body.teacher).toMatchObject({
      name: 'Cô Lan',
      phone: null,
      levels: ['thpt'],
      subjects: ['toan', 'vat_ly'],
    });

    await http().patch('/api/teachers/me').set('Cookie', ck(s)).send({ phone: '12ab' }).expect(400);
    await http()
      .patch('/api/teachers/me')
      .set('Cookie', ck(s))
      .send({ subjects: ['bong_da'] })
      .expect(400);
  });

  it('đổi mật khẩu: sai mật khẩu hiện tại → 400; đúng → đăng nhập bằng mật khẩu mới, phiên khác bị thu hồi', async () => {
    const s = await signup(app, 'profile-password', { password: 'matkhau123' });
    // Phiên thứ hai trên máy khác
    const other = await http()
      .post('/api/auth/login')
      .send({ email: s.email, password: 'matkhau123' })
      .expect(200);
    const otherJar = cookieHeader(
      Object.fromEntries(
        (other.headers['set-cookie'] as unknown as string[]).map((c) => {
          const [kv] = c.split(';');
          const i = kv!.indexOf('=');
          return [kv!.slice(0, i), kv!.slice(i + 1)];
        }),
      ),
    );

    await http()
      .post('/api/auth/password')
      .set('Cookie', ck(s))
      .send({ currentPassword: 'sai-roi-123', newPassword: 'matkhaumoi456' })
      .expect(400);
    await http()
      .post('/api/auth/password')
      .set('Cookie', ck(s))
      .send({ currentPassword: 'matkhau123', newPassword: 'matkhaumoi456' })
      .expect(200);

    await http()
      .post('/api/auth/login')
      .send({ email: s.email, password: 'matkhau123' })
      .expect(401);
    await http()
      .post('/api/auth/login')
      .send({ email: s.email, password: 'matkhaumoi456' })
      .expect(200);

    // Phiên hiện tại vẫn refresh được, phiên khác thì không
    await http().post('/api/auth/refresh').set('Cookie', ck(s)).expect(200);
    await http().post('/api/auth/refresh').set('Cookie', otherJar).expect(401);
  });

  it('avatar: tải PNG → avatarUrl; file không phải ảnh → 400; gỡ ảnh → null', async () => {
    const s = await signup(app, 'profile-avatar');
    const up = await http()
      .post('/api/teachers/me/avatar')
      .set('Cookie', ck(s))
      .attach('file', PNG_1X1, 'avatar.png')
      .expect(200);
    expect(typeof up.body.teacher.avatarUrl).toBe('string');
    expect(up.body.teacher.avatarUrl).toMatch(/\.png$/);

    await http()
      .post('/api/teachers/me/avatar')
      .set('Cookie', ck(s))
      .attach('file', Buffer.from('not an image'), 'x.txt')
      .expect(400);

    const removed = await http().delete('/api/teachers/me/avatar').set('Cookie', ck(s)).expect(200);
    expect(removed.body.teacher.avatarUrl).toBeNull();
  });
});
