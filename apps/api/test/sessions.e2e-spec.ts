import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanupE2eData, cookieHeader, createTestApp, type Session, signup } from './helpers.js';

interface Rec {
  studentId: string;
  name: string;
  status: string;
  note: string | null;
}

describe('Sessions & attendance (e2e)', () => {
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

  async function setup(tag: string, names = ['An', 'Bình', 'Châu']) {
    const s = await signup(app, tag);
    const c = await http()
      .post('/api/classes')
      .set('Cookie', ck(s))
      .send({ name: `Lớp ${tag}` })
      .expect(201);
    const classId: string = c.body.id;
    const imported = await http()
      .post(`/api/classes/${classId}/students/import`)
      .set('Cookie', ck(s))
      .send({ names })
      .expect(200);
    const students = imported.body.students as { id: string; name: string }[];
    return { s, classId, students };
  }

  it('bắt đầu buổi: 201 với mọi học sinh "có mặt"; gọi lại → 200 cùng buổi', async () => {
    const { s, classId } = await setup('sess-start');
    const first = await http().post(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(201);
    expect(first.body.status).toBe('active');
    expect(first.body.records).toHaveLength(3);
    expect(first.body.records.every((r: Rec) => r.status === 'present')).toBe(true);
    expect(first.body.summary).toEqual({ present: 3, absent: 0, late: 0, excused: 0, total: 3 });
    expect(first.body.className).toBe('Lớp sess-start');

    const again = await http().post(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(200);
    expect(again.body.id).toBe(first.body.id);
  });

  it('cập nhật điểm danh đơn lẻ, hàng loạt, ghi chú; học sinh lạ → 400', async () => {
    const { s, classId, students } = await setup('sess-update');
    const session = (await http().post(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(201)).body;
    const [an, binh, chau] = students;

    const single = await http()
      .patch(`/api/sessions/${session.id}/attendance`)
      .set('Cookie', ck(s))
      .send({ updates: [{ studentId: an!.id, status: 'absent', note: 'Ốm' }] })
      .expect(200);
    const anRec = single.body.records.find((r: Rec) => r.studentId === an!.id) as Rec;
    expect(anRec.status).toBe('absent');
    expect(anRec.note).toBe('Ốm');
    expect(single.body.summary).toMatchObject({ present: 2, absent: 1 });

    const bulk = await http()
      .patch(`/api/sessions/${session.id}/attendance`)
      .set('Cookie', ck(s))
      .send({
        updates: [
          { studentId: binh!.id, status: 'late' },
          { studentId: chau!.id, status: 'excused' },
          { studentId: an!.id, status: 'absent', note: null },
        ],
      })
      .expect(200);
    expect(bulk.body.summary).toEqual({ present: 0, absent: 1, late: 1, excused: 1, total: 3 });
    expect((bulk.body.records.find((r: Rec) => r.studentId === an!.id) as Rec).note).toBeNull();

    await http()
      .patch(`/api/sessions/${session.id}/attendance`)
      .set('Cookie', ck(s))
      .send({ updates: [{ studentId: 'khong-ton-tai', status: 'present' }] })
      .expect(400);
    await http()
      .patch(`/api/sessions/${session.id}/attendance`)
      .set('Cookie', ck(s))
      .send({ updates: [{ studentId: an!.id, status: 'sai' }] })
      .expect(400);
  });

  it('kết thúc buổi (idempotent), phản hồi ghi đè, danh sách có summary/hasFeedback', async () => {
    const { s, classId } = await setup('sess-end');
    const session = (await http().post(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(201)).body;

    const ended = await http().post(`/api/sessions/${session.id}/end`).set('Cookie', ck(s)).expect(200);
    expect(ended.body.status).toBe('ended');
    expect(typeof ended.body.endedAt).toBe('string');
    await http().post(`/api/sessions/${session.id}/end`).set('Cookie', ck(s)).expect(200);

    await http()
      .post(`/api/sessions/${session.id}/feedback`)
      .set('Cookie', ck(s))
      .send({ rating: 4, comment: 'Ổn' })
      .expect(204);
    await http()
      .post(`/api/sessions/${session.id}/feedback`)
      .set('Cookie', ck(s))
      .send({ rating: 5 })
      .expect(204);
    await http()
      .post(`/api/sessions/${session.id}/feedback`)
      .set('Cookie', ck(s))
      .send({ rating: 9 })
      .expect(400);
    const prisma = app.get(PrismaService);
    const fb = await prisma.sessionFeedback.findUnique({ where: { sessionId: session.id } });
    expect(fb?.rating).toBe(5);
    expect(fb?.comment).toBeNull();

    // Kết thúc rồi vẫn mở buổi mới được
    const next = await http().post(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(201);
    expect(next.body.id).not.toBe(session.id);

    const list = await http().get(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(200);
    expect(list.body.sessions).toHaveLength(2);
    expect(list.body.sessions[0].id).toBe(next.body.id);
    expect(list.body.sessions[1]).toMatchObject({ id: session.id, status: 'ended', hasFeedback: true });
    expect(list.body.sessions[1].summary.total).toBe(3);
    expect(list.body.hiddenCount).toBe(0);
    expect(list.body.historyDays).toBe(30);
  });

  it('buổi cũ hơn 30 ngày bị ẩn với hiddenCount; lịch sử học sinh đúng tỷ lệ', async () => {
    const { s, classId, students } = await setup('sess-history');
    const prisma = app.get(PrismaService);
    const teacher = await prisma.teacher.findUniqueOrThrow({ where: { email: s.email } });
    const an = students[0]!;

    const old = await prisma.classSession.create({
      data: {
        classId,
        teacherId: teacher.id,
        status: 'ended',
        startedAt: new Date(Date.now() - 40 * 86400000),
        endedAt: new Date(Date.now() - 40 * 86400000 + 3600000),
        attendance: { create: [{ studentId: an.id, status: 'absent' }] },
      },
    });

    const recent = (await http().post(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(201)).body;
    await http()
      .patch(`/api/sessions/${recent.id}/attendance`)
      .set('Cookie', ck(s))
      .send({ updates: [{ studentId: an.id, status: 'late' }] })
      .expect(200);
    await http().post(`/api/sessions/${recent.id}/end`).set('Cookie', ck(s)).expect(200);
    const recent2 = (await http().post(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(201)).body;
    await http()
      .patch(`/api/sessions/${recent2.id}/attendance`)
      .set('Cookie', ck(s))
      .send({ updates: [{ studentId: an.id, status: 'absent' }] })
      .expect(200);

    const list = await http().get(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(200);
    expect(list.body.sessions.map((x: { id: string }) => x.id)).toEqual([recent2.id, recent.id]);
    expect(list.body.hiddenCount).toBe(1);

    const history = await http()
      .get(`/api/classes/${classId}/students/${an.id}/attendance`)
      .set('Cookie', ck(s))
      .expect(200);
    expect(history.body.student.name).toBe('An');
    expect(history.body.items.map((i: { status: string }) => i.status)).toEqual(['absent', 'late']);
    expect(history.body.rate).toEqual({ present: 1, total: 2 });
    expect(history.body.hiddenCount).toBe(1);
    expect(history.body.items.find((i: { sessionId: string }) => i.sessionId === old.id)).toBeUndefined();
  });

  it('học sinh thêm sau khi mở buổi được bổ sung "có mặt"; học sinh rời lớp vẫn còn trong buổi cũ', async () => {
    const { s, classId, students } = await setup('sess-backfill', ['An', 'Bình']);
    const session = (await http().post(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(201)).body;
    expect(session.records).toHaveLength(2);

    await http()
      .post(`/api/classes/${classId}/students/import`)
      .set('Cookie', ck(s))
      .send({ names: ['Châu'] })
      .expect(200);
    await http().delete(`/api/classes/${classId}/students/${students[0]!.id}`).set('Cookie', ck(s)).expect(204);

    const detail = await http().get(`/api/sessions/${session.id}`).set('Cookie', ck(s)).expect(200);
    const names = detail.body.records.map((r: Rec) => r.name);
    expect(names).toEqual(['An', 'Bình', 'Châu']);
    expect(detail.body.summary.total).toBe(3);
  });

  it('buổi học của giáo viên khác → 404', async () => {
    const { s, classId } = await setup('sess-owner');
    const other = await signup(app, 'sess-other');
    const session = (await http().post(`/api/classes/${classId}/sessions`).set('Cookie', ck(s)).expect(201)).body;
    await http().get(`/api/sessions/${session.id}`).set('Cookie', ck(other)).expect(404);
    await http().post(`/api/sessions/${session.id}/end`).set('Cookie', ck(other)).expect(404);
    await http().get(`/api/classes/${classId}/sessions`).set('Cookie', ck(other)).expect(404);
  });
});
