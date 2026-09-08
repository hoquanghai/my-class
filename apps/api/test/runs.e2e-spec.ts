import type { INestApplication } from '@nestjs/common';
import type { RunPublicStateDto } from '@lophoc/shared';
import { io as ioClient, type Socket } from 'socket.io-client';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  cleanupE2eData,
  cookieHeader,
  createTestApp,
  pickStudent,
  type Session,
  signup,
  type StudentSession,
} from './helpers.js';

const single = {
  type: 'single_choice',
  stemMd: 'Nghiệm của $2x+3=11$?',
  source: 'manual',
  options: [
    { label: 'A', contentMd: '3', isCorrect: false },
    { label: 'B', contentMd: '4', isCorrect: true },
    { label: 'C', contentMd: '5', isCorrect: false },
  ],
  acceptedAnswers: [],
};
const short = {
  type: 'short_text',
  stemMd: 'Tính 15×4',
  source: 'manual',
  options: [],
  acceptedAnswers: ['60'],
};

interface Ctx {
  s: Session;
  classId: string;
  code: string;
  sessionId: string;
  quizId: string;
  an: StudentSession;
  binh: StudentSession;
}

describe('Quiz runs (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const http = () => request(app.getHttpServer());
  const ck = (s: { jar: Record<string, string> }) => cookieHeader(s.jar);

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0);
    const address = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await cleanupE2eData(app);
    (app.getHttpServer() as { closeAllConnections?: () => void }).closeAllConnections?.();
    await app.close();
  });

  async function setup(tag: string): Promise<Ctx> {
    const s = await signup(app, tag);
    const c = (
      await http()
        .post('/api/classes')
        .set('Cookie', ck(s))
        .send({ name: `Lớp ${tag}` })
        .expect(201)
    ).body;
    const roster = (
      await http()
        .post(`/api/classes/${c.id}/students/import`)
        .set('Cookie', ck(s))
        .send({ names: ['An', 'Bình', 'Châu'] })
        .expect(200)
    ).body.students as { id: string; name: string }[];
    const qs = (
      await http()
        .post('/api/questions/bulk')
        .set('Cookie', ck(s))
        .send({ source: 'manual', questions: [single, short] })
        .expect(201)
    ).body.ids as string[];
    const quiz = (
      await http()
        .post('/api/quizzes')
        .set('Cookie', ck(s))
        .send({ title: `Đề ${tag}`, defaultTimeLimitSec: 60 })
        .expect(201)
    ).body;
    await http()
      .post(`/api/quizzes/${quiz.id}/items`)
      .set('Cookie', ck(s))
      .send({ questionIds: qs })
      .expect(200);
    await http()
      .patch(
        `/api/quizzes/${quiz.id}/items/${(await http().get(`/api/quizzes/${quiz.id}`).set('Cookie', ck(s))).body.items[1].id}`,
      )
      .set('Cookie', ck(s))
      .send({ points: 2 })
      .expect(200);
    const session = (
      await http().post(`/api/classes/${c.id}/sessions`).set('Cookie', ck(s)).expect(201)
    ).body;
    const an = await pickStudent(app, c.code, roster[0]!.id);
    const binh = await pickStudent(app, c.code, roster[1]!.id);
    return { s, classId: c.id, code: c.code, sessionId: session.id, quizId: quiz.id, an, binh };
  }

  it('paced: phát đề → bắt đầu → nộp → đóng → chuyển → kết thúc → xếp hạng → sửa điểm', async () => {
    const { s, sessionId, quizId, an, binh } = await setup('run-paced');

    const launched = await http()
      .post(`/api/sessions/${sessionId}/runs`)
      .set('Cookie', ck(s))
      .send({ quizId, mode: 'paced', shuffleOptions: true })
      .expect(201);
    const runId: string = launched.body.state.id;
    expect(launched.body.state.status).toBe('lobby');
    expect(launched.body.questions).toHaveLength(2);
    expect(launched.body.questions[0].snapshot.correctOptionIds).toHaveLength(1);
    expect(launched.body.state.participants.map((p: { name: string }) => p.name).sort()).toEqual([
      'An',
      'Bình',
    ]);

    const dup = await http()
      .post(`/api/sessions/${sessionId}/runs`)
      .set('Cookie', ck(s))
      .send({ quizId, mode: 'paced' })
      .expect(409);
    expect(dup.body.code).toBe('RUN_ACTIVE');

    const lobbyView = await http()
      .get(`/api/student/runs/${runId}`)
      .set('Cookie', ck(an))
      .expect(200);
    expect(lobbyView.body.state.status).toBe('lobby');
    expect(lobbyView.body.questions).toEqual([]);

    const q1 = launched.body.questions[0];
    const early = await http()
      .post(`/api/student/runs/${runId}/answers`)
      .set('Cookie', ck(an))
      .send({ runQuestionId: q1.id, selectedOptionIds: [q1.snapshot.correctOptionIds[0]] })
      .expect(409);
    expect(early.body.code).toBe('RUN_NOT_OPEN');

    const started = await http().post(`/api/runs/${runId}/start`).set('Cookie', ck(s)).expect(200);
    expect(started.body.state).toMatchObject({ status: 'in_progress', currentIndex: 0 });
    expect(started.body.state.currentQuestion.runQuestionId).toBe(q1.id);
    expect(started.body.state.currentQuestion).not.toHaveProperty('correctOptionIds');

    const correctId: string = q1.snapshot.correctOptionIds[0];
    const wrongId: string = q1.snapshot.options.find((o: { id: string }) => o.id !== correctId).id;
    const a1 = await http()
      .post(`/api/student/runs/${runId}/answers`)
      .set('Cookie', ck(an))
      .send({ runQuestionId: q1.id, selectedOptionIds: [correctId], responseMs: 4000 })
      .expect(200);
    expect(a1.body.accepted).toBe(true);
    const a1dup = await http()
      .post(`/api/student/runs/${runId}/answers`)
      .set('Authorization', `Bearer ${an.token}`)
      .send({ runQuestionId: q1.id, selectedOptionIds: [wrongId] })
      .expect(200);
    expect(a1dup.body).toEqual({ accepted: false, answerId: a1.body.answerId });
    await http()
      .post(`/api/student/runs/${runId}/answers`)
      .set('Cookie', ck(binh))
      .send({ runQuestionId: q1.id, selectedOptionIds: [wrongId], responseMs: 6000 })
      .expect(200);

    const hidden = await http().get(`/api/student/runs/${runId}`).set('Cookie', ck(an)).expect(200);
    expect(hidden.body.myAnswers[0].isCorrect).toBeNull();
    expect(hidden.body.revealed).toEqual([]);

    const closed = await http().post(`/api/runs/${runId}/close`).set('Cookie', ck(s)).expect(200);
    expect(closed.body.state.currentResult).toMatchObject({
      answeredCount: 2,
      correctStudentNames: ['An'],
      correctOptionIds: [correctId],
    });
    const dist = closed.body.state.currentResult.distribution as {
      optionId: string;
      count: number;
    }[];
    expect(dist.find((d) => d.optionId === correctId)?.count).toBe(1);
    expect(dist.find((d) => d.optionId === wrongId)?.count).toBe(1);

    const revealedView = await http()
      .get(`/api/student/runs/${runId}`)
      .set('Cookie', ck(binh))
      .expect(200);
    expect(revealedView.body.myAnswers[0].isCorrect).toBe(false);
    expect(revealedView.body.revealed[0].correctOptionIds).toEqual([correctId]);

    await http()
      .post(`/api/student/runs/${runId}/answers`)
      .set('Cookie', ck(binh))
      .send({ runQuestionId: q1.id, selectedOptionIds: [correctId] })
      .expect(200); // đã nộp trước đó → accepted:false, không lỗi

    const next = await http().post(`/api/runs/${runId}/next`).set('Cookie', ck(s)).expect(200);
    expect(next.body.state.currentIndex).toBe(1);
    const q2 = launched.body.questions[1];
    await http()
      .post(`/api/student/runs/${runId}/answers`)
      .set('Cookie', ck(an))
      .send({ runQuestionId: q2.id, textAnswer: '  60 ', responseMs: 3000 })
      .expect(200);
    await http()
      .post(`/api/student/runs/${runId}/answers`)
      .set('Cookie', ck(binh))
      .send({ runQuestionId: q2.id, textAnswer: '61', responseMs: 2000 })
      .expect(200);

    const finished = await http().post(`/api/runs/${runId}/next`).set('Cookie', ck(s)).expect(200);
    expect(finished.body.state.status).toBe('finished');
    const board = finished.body.state.leaderboard as {
      name: string;
      score: number;
      rank: number;
    }[];
    expect(board.map((b) => [b.name, b.score, b.rank])).toEqual([
      ['An', 3, 1],
      ['Bình', 0, 2],
    ]);
    const prisma = app.get(PrismaService);
    expect(await prisma.quizRunResult.count({ where: { runId } })).toBe(2);

    const myResult = await http()
      .get(`/api/student/runs/${runId}`)
      .set('Cookie', ck(an))
      .expect(200);
    expect(myResult.body.myResult).toMatchObject({ score: 3, rank: 1, correctCount: 2 });
    expect(myResult.body.questions).toHaveLength(0);

    const binhAnswer = finished.body.answers.find(
      (a: { studentId: string; runQuestionId: string }) =>
        a.studentId === binh.studentId && a.runQuestionId === q2.id,
    );
    const overridden = await http()
      .patch(`/api/runs/${runId}/answers/${binhAnswer.id}`)
      .set('Cookie', ck(s))
      .send({ isCorrect: true })
      .expect(200);
    const board2 = overridden.body.state.leaderboard as { name: string; score: number }[];
    expect(board2.find((b) => b.name === 'Bình')?.score).toBe(2);
    expect(
      await prisma.quizRunResult.findFirst({ where: { runId, studentId: binh.studentId } }),
    ).toMatchObject({ score: 2 });

    const list = await http()
      .get(`/api/sessions/${sessionId}/runs`)
      .set('Cookie', ck(s))
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({
      status: 'finished',
      questionCount: 2,
      participantCount: 2,
    });

    const pub = await http().get(`/api/runs/${runId}/public`).expect(200);
    expect(pub.body.status).toBe('finished');
    expect(pub.body.leaderboard).toHaveLength(2);
  });

  it('self-paced: mọi câu mở tới hạn; nộp cả hai; kết thúc → kết quả', async () => {
    const { s, sessionId, quizId, an } = await setup('run-self');
    const launched = await http()
      .post(`/api/sessions/${sessionId}/runs`)
      .set('Cookie', ck(s))
      .send({ quizId, mode: 'self_paced' })
      .expect(400); // thiếu selfPacedMinutes
    expect(launched.body.message).toContain('thời gian');

    const run = (
      await http()
        .post(`/api/sessions/${sessionId}/runs`)
        .set('Cookie', ck(s))
        .send({ quizId, mode: 'self_paced', selfPacedMinutes: 5, shuffleQuestions: true })
        .expect(201)
    ).body;
    const started = await http()
      .post(`/api/runs/${run.state.id}/start`)
      .set('Cookie', ck(s))
      .expect(200);
    expect(started.body.state.deadlineAt).not.toBeNull();
    expect(started.body.state.currentQuestion).toBeNull();

    const view = await http()
      .get(`/api/student/runs/${run.state.id}`)
      .set('Cookie', ck(an))
      .expect(200);
    expect(view.body.questions).toHaveLength(2);
    for (const q of run.questions as {
      id: string;
      snapshot: { type: string; correctOptionIds: string[] };
    }[]) {
      await http()
        .post(`/api/student/runs/${run.state.id}/answers`)
        .set('Cookie', ck(an))
        .send(
          q.snapshot.type === 'short_text'
            ? { runQuestionId: q.id, textAnswer: 'sáu mươi' }
            : { runQuestionId: q.id, selectedOptionIds: q.snapshot.correctOptionIds },
        )
        .expect(200);
    }
    const finished = await http()
      .post(`/api/runs/${run.state.id}/finish`)
      .set('Cookie', ck(s))
      .expect(200);
    const an1 = (
      finished.body.state.leaderboard as { name: string; score: number; correctCount: number }[]
    ).find((b) => b.name === 'An');
    expect(an1).toMatchObject({ score: 1, correctCount: 1 });
    await http().post(`/api/runs/${run.state.id}/finish`).set('Cookie', ck(s)).expect(200);
  });

  it('socket: máy chiếu tham gia phòng nhận run:state khi giáo viên bắt đầu; giáo viên khác bị từ chối', async () => {
    const { s, sessionId, quizId } = await setup('run-socket');
    const other = await signup(app, 'run-socket-other');
    const run = (
      await http()
        .post(`/api/sessions/${sessionId}/runs`)
        .set('Cookie', ck(s))
        .send({ quizId, mode: 'paced' })
        .expect(201)
    ).body;

    const connect = (auth: Record<string, string>) =>
      new Promise<Socket>((resolve, reject) => {
        const socket = ioClient(`${baseUrl}/rt`, { transports: ['websocket'], auth });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', reject);
      });

    const presenter = await connect({ role: 'present' });
    const states: RunPublicStateDto[] = [];
    presenter.on('run:state', (st) => states.push(st));
    const joined = await presenter.emitWithAck('session:join', { sessionId });
    expect(joined).toBe(true);
    await new Promise((r) => setTimeout(r, 100));
    expect(states.at(-1)?.status).toBe('lobby');

    await http().post(`/api/runs/${run.state.id}/start`).set('Cookie', ck(s)).expect(200);
    for (let i = 0; i < 30 && states.at(-1)?.status !== 'in_progress'; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(states.at(-1)?.status).toBe('in_progress');
    expect(states.at(-1)?.currentQuestion?.index).toBe(0);

    const stranger = await connect({ role: 'teacher', token: other.jar.lh_at as string });
    const forbidden = await stranger.emitWithAck('session:join', { sessionId });
    expect(forbidden).toBe(false);

    const bad = ioClient(`${baseUrl}/rt`, {
      transports: ['websocket'],
      auth: { role: 'student', token: 'x' },
    });
    const rejected = await new Promise<boolean>((resolve) => {
      bad.on('rt:error', () => resolve(true));
      bad.on('disconnect', () => resolve(true));
      setTimeout(() => resolve(false), 3000);
    });
    expect(rejected).toBe(true);

    presenter.disconnect();
    stranger.disconnect();
    bad.disconnect();
  });
});
