import type { INestApplication } from '@nestjs/common';
import { isValidClassCode } from '@lophoc/shared';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  binaryParser,
  cleanupE2eData,
  cookieHeader,
  createTestApp,
  type Session,
  signup,
} from './helpers.js';

describe('Classes (e2e)', () => {
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

  async function createClass(s: Session, body: Record<string, unknown>) {
    const res = await http().post('/api/classes').set('Cookie', ck(s)).send(body).expect(201);
    return res.body as { id: string; code: string; students: unknown[]; schedule: unknown[] };
  }

  it('tạo 2 lớp OK, lớp thứ 3 bị chặn LIMIT_CLASSES; xóa mềm thì tạo lại được', async () => {
    const s = await signup(app, 'classes');
    const c1 = await createClass(s, { name: 'Toán 9A', subject: 'toan', grade: '9' });
    expect(isValidClassCode(c1.code)).toBe(true);
    expect(c1.students).toEqual([]);
    expect(c1.schedule).toEqual([]);

    await createClass(s, { name: 'Văn 8B', subject: 'ngu_van', grade: '8' });
    const third = await http()
      .post('/api/classes')
      .set('Cookie', ck(s))
      .send({ name: 'Lý 7', subject: 'vat_ly', grade: '7' })
      .expect(403);
    expect(third.body.code).toBe('LIMIT_CLASSES');

    await http().delete(`/api/classes/${c1.id}`).set('Cookie', ck(s)).expect(204);
    const list = await http().get('/api/classes').set('Cookie', ck(s)).expect(200);
    expect(list.body.map((c: { name: string }) => c.name)).toEqual(['Văn 8B']);
    await http().get(`/api/classes/${c1.id}`).set('Cookie', ck(s)).expect(404);

    await createClass(s, { name: 'Lý 7', subject: 'vat_ly', grade: '7' });
  });

  it('tên lớp trống → 400', async () => {
    const s = await signup(app, 'classes-invalid');
    await http()
      .post('/api/classes')
      .set('Cookie', ck(s))
      .send({ name: '   ', subject: 'toan', grade: '12' })
      .expect(400);
  });

  it('thiếu môn/khối hoặc giá trị ngoài danh mục → 400', async () => {
    const s = await signup(app, 'classes-catalog');
    const post = (body: Record<string, unknown>) =>
      http().post('/api/classes').set('Cookie', ck(s)).send(body);
    await post({ name: 'Thiếu môn', grade: '12' }).expect(400);
    await post({ name: 'Thiếu khối', subject: 'toan' }).expect(400);
    await post({ name: 'Môn lạ', subject: 'Toán', grade: '12' }).expect(400);
    await post({ name: 'Khối lạ', subject: 'toan', grade: '13' }).expect(400);
    const ok = await post({ name: 'Đủ', subject: 'gdkt_pl', grade: '10' }).expect(201);
    expect(ok.body.subject).toBe('gdkt_pl');
    expect(ok.body.grade).toBe('10');
    // sửa lớp: môn/khối vẫn phải thuộc danh mục
    await http()
      .patch(`/api/classes/${ok.body.id}`)
      .set('Cookie', ck(s))
      .send({ subject: 'Văn' })
      .expect(400);
    const upd = await http()
      .patch(`/api/classes/${ok.body.id}`)
      .set('Cookie', ck(s))
      .send({ subject: 'ngu_van', grade: '11' })
      .expect(200);
    expect([upd.body.subject, upd.body.grade]).toEqual(['ngu_van', '11']);
  });

  it('lớp của giáo viên khác → 404 ở mọi thao tác', async () => {
    const owner = await signup(app, 'owner');
    const other = await signup(app, 'other');
    const c = await createClass(owner, { name: 'Lớp riêng', subject: 'toan', grade: '12' });
    await http().get(`/api/classes/${c.id}`).set('Cookie', ck(other)).expect(404);
    await http()
      .patch(`/api/classes/${c.id}`)
      .set('Cookie', ck(other))
      .send({ name: 'Hack' })
      .expect(404);
    await http().delete(`/api/classes/${c.id}`).set('Cookie', ck(other)).expect(404);
    await http()
      .post(`/api/classes/${c.id}/students/import`)
      .set('Cookie', ck(other))
      .send({ names: ['X'] })
      .expect(404);
  });

  it('cập nhật tên, lịch, khóa danh sách; danh sách lớp có studentCount', async () => {
    const s = await signup(app, 'classes-update');
    const c = await createClass(s, { name: 'Toán 9A', subject: 'toan', grade: '12' });
    const res = await http()
      .patch(`/api/classes/${c.id}`)
      .set('Cookie', ck(s))
      .send({
        name: 'Toán 9A nâng cao',
        schedule: [{ weekday: 2, start: '18:00', end: '19:30' }],
        rosterLocked: true,
      })
      .expect(200);
    expect(res.body.name).toBe('Toán 9A nâng cao');
    expect(res.body.rosterLocked).toBe(true);
    expect(res.body.schedule).toHaveLength(1);

    await http()
      .patch(`/api/classes/${c.id}`)
      .set('Cookie', ck(s))
      .send({ schedule: [{ weekday: 9, start: '18:00', end: '19:30' }] })
      .expect(400);

    await http()
      .post(`/api/classes/${c.id}/students/import`)
      .set('Cookie', ck(s))
      .send({ names: ['An', 'Bình'] })
      .expect(200);
    const list = await http().get('/api/classes').set('Cookie', ck(s)).expect(200);
    expect(list.body[0].studentCount).toBe(2);
  });

  it('regenerate-code đổi mã hợp lệ; qr.png trả PNG', async () => {
    const s = await signup(app, 'classes-code');
    const c = await createClass(s, { name: 'Lớp QR', subject: 'toan', grade: '12' });
    const r = await http()
      .post(`/api/classes/${c.id}/regenerate-code`)
      .set('Cookie', ck(s))
      .expect(200);
    expect(r.body.code).not.toBe(c.code);
    expect(isValidClassCode(r.body.code)).toBe(true);

    const qr = await http()
      .get(`/api/classes/${c.id}/qr.png`)
      .set('Cookie', ck(s))
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    expect(qr.headers['content-type']).toBe('image/png');
    const png = qr.body as Buffer;
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  it('xóa vĩnh viễn cascade học sinh', async () => {
    const s = await signup(app, 'classes-hard');
    const c = await createClass(s, { name: 'Lớp xóa', subject: 'toan', grade: '12' });
    await http()
      .post(`/api/classes/${c.id}/students/import`)
      .set('Cookie', ck(s))
      .send({ names: ['An', 'Bình'] })
      .expect(200);
    await http().delete(`/api/classes/${c.id}/permanent`).set('Cookie', ck(s)).expect(204);
    await http().get(`/api/classes/${c.id}`).set('Cookie', ck(s)).expect(404);
    const prisma = app.get(PrismaService);
    await expect(prisma.student.count({ where: { classId: c.id } })).resolves.toBe(0);
  });
});
