import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  cleanupE2eData,
  cookieHeader,
  createTestApp,
  readSetCookies,
  type Session,
  signup,
} from './helpers.js';

describe('Student join (e2e)', () => {
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

  async function setup(tag: string) {
    const s = await signup(app, tag);
    const c = await http()
      .post('/api/classes')
      .set('Cookie', ck(s))
      .send({ name: `Lớp ${tag}` })
      .expect(201);
    const imported = await http()
      .post(`/api/classes/${c.body.id}/students/import`)
      .set('Cookie', ck(s))
      .send({ names: ['An', 'Bình'] })
      .expect(200);
    return {
      s,
      classId: c.body.id as string,
      code: c.body.code as string,
      students: imported.body.students as { id: string; name: string }[],
    };
  }

  it('mã sai → 404; thông tin lớp; chọn tên → cookie lh_st + token; /student/me qua cookie và Bearer', async () => {
    const { s, code, students, classId } = await setup('join-basic');
    await http().get('/api/join/ZZZZZZ').expect(404);

    const info = await http().get(`/api/join/${code.toLowerCase()}`).expect(200);
    expect(info.body.class.rosterLocked).toBe(false);
    expect(
      info.body.students.map((x: { name: string; bound: boolean }) => [x.name, x.bound]),
    ).toEqual([
      ['An', false],
      ['Bình', false],
    ]);

    const pick = await http()
      .post(`/api/join/${code}/pick`)
      .send({ studentId: students[0]!.id })
      .expect(200);
    expect(pick.body.student).toMatchObject({ studentId: students[0]!.id, name: 'An', classId });
    expect(typeof pick.body.token).toBe('string');
    const jar = readSetCookies(pick);
    expect(jar.lh_st).toBe(pick.body.token);

    const meCookie = await http()
      .get('/api/student/me')
      .set('Cookie', cookieHeader(jar))
      .expect(200);
    expect(meCookie.body.student.name).toBe('An');
    expect(meCookie.body.session).toBeNull();
    const meBearer = await http()
      .get('/api/student/me')
      .set('Authorization', `Bearer ${pick.body.token}`)
      .expect(200);
    expect(meBearer.body.student.deviceId).toBe(pick.body.student.deviceId);

    await http().get('/api/student/me').expect(401);
    // token giáo viên không dùng được cho route học sinh và ngược lại
    await http().get('/api/student/me').set('Cookie', ck(s)).expect(401);
    await http().get('/api/classes').set('Authorization', `Bearer ${pick.body.token}`).expect(401);

    const infoAfter = await http().get(`/api/join/${code}`).expect(200);
    expect(infoAfter.body.students[0].bound).toBe(true);
  });

  it('khóa danh sách: tên đã gắn thiết bị không chọn được từ máy khác (409); cùng thiết bị chọn lại OK; gỡ thiết bị → 401', async () => {
    const { s, code, students, classId } = await setup('join-lock');
    const first = await http()
      .post(`/api/join/${code}/pick`)
      .send({ studentId: students[0]!.id })
      .expect(200);
    const firstJar = readSetCookies(first);

    await http()
      .patch(`/api/classes/${classId}`)
      .set('Cookie', ck(s))
      .send({ rosterLocked: true })
      .expect(200);

    const other = await http()
      .post(`/api/join/${code}/pick`)
      .send({ studentId: students[0]!.id })
      .expect(409);
    expect(other.body.code).toBe('STUDENT_BOUND');

    const again = await http()
      .post(`/api/join/${code}/pick`)
      .set('Cookie', cookieHeader(firstJar))
      .send({ studentId: students[0]!.id })
      .expect(200);
    expect(again.body.student.deviceId).toBe(first.body.student.deviceId);

    await http().post(`/api/join/${code}/pick`).send({ studentId: students[1]!.id }).expect(200);

    await http()
      .post(`/api/classes/${classId}/students/${students[0]!.id}/unbind`)
      .set('Cookie', ck(s))
      .expect(204);
    await http().get('/api/student/me').set('Cookie', cookieHeader(firstJar)).expect(401);
    const info = await http().get(`/api/join/${code}`).expect(200);
    expect(info.body.students[0].bound).toBe(false);
    await http().post(`/api/join/${code}/pick`).send({ studentId: students[0]!.id }).expect(200);
  });

  it('không khóa: chọn lại từ máy khác tạo thiết bị mới; buổi đang mở được ghi tham gia; /me trả session', async () => {
    const { s, code, students, classId } = await setup('join-session');
    const session = (
      await http().post(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(201)
    ).body;

    const d1 = await http()
      .post(`/api/join/${code}/pick`)
      .send({ studentId: students[0]!.id })
      .expect(200);
    const d2 = await http()
      .post(`/api/join/${code}/pick`)
      .send({ studentId: students[0]!.id })
      .expect(200);
    expect(d2.body.student.deviceId).not.toBe(d1.body.student.deviceId);

    const me = await http()
      .get('/api/student/me')
      .set('Cookie', cookieHeader(readSetCookies(d2)))
      .expect(200);
    expect(me.body.session).toEqual({ id: session.id, status: 'active' });
    expect(me.body.run).toBeNull();

    const detail = await http().get(`/api/sessions/${session.id}`).set('Cookie', ck(s)).expect(200);
    expect(detail.body.records).toHaveLength(2);
  });
});
