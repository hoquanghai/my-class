import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

export const E2E_EMAIL_PREFIX = 'e2e-';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  await configureApp(app, { corsOrigin: true });
  await app.init();
  return app;
}

/** Xóa mọi giáo viên tạo bởi e2e (cascade xóa lớp, học sinh, token…). */
export async function cleanupE2eData(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.teacher.deleteMany({ where: { email: { startsWith: E2E_EMAIL_PREFIX } } });
}

export function uniqueEmail(tag: string): string {
  return `${E2E_EMAIL_PREFIX}${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

export type CookieJar = Record<string, string>;

/** Đọc các Set-Cookie của response thành map name → value (giá trị rỗng = cookie bị xóa). */
export function readSetCookies(res: request.Response): CookieJar {
  const raw = res.headers['set-cookie'];
  const list: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const jar: CookieJar = {};
  for (const line of list) {
    const first = line.split(';')[0] ?? '';
    const eq = first.indexOf('=');
    if (eq > 0) jar[first.slice(0, eq)] = first.slice(eq + 1);
  }
  return jar;
}

export function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export interface Session {
  jar: CookieJar;
  teacher: { id: string; email: string; name: string; emailVerified: boolean };
  email: string;
  password: string;
}

export async function signup(
  app: INestApplication,
  tag = 'user',
  overrides: Partial<{ name: string; password: string }> = {},
): Promise<Session> {
  const email = uniqueEmail(tag);
  const password = overrides.password ?? 'matkhau123';
  const res = await request(app.getHttpServer())
    .post('/api/auth/signup')
    .send({ name: overrides.name ?? 'GV Test', email, password, acceptTerms: true })
    .expect(201);
  return { jar: readSetCookies(res), teacher: res.body.teacher, email, password };
}

/** Parser cho supertest khi response là nhị phân (ảnh PNG…). Dùng với `.buffer(true).parse(binaryParser)`. */
export function binaryParser(
  res: unknown,
  callback: (err: Error | null, body: Buffer) => void,
): void {
  const stream = res as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  stream.on('end', () => callback(null, Buffer.concat(chunks)));
  stream.on('error', (err: Error) => callback(err, Buffer.alloc(0)));
}

/** Lấy token từ liên kết trong email (`?token=...`). */
export function tokenFromMail(text: string): string {
  const match = text.match(/token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error('Không tìm thấy token trong email');
  return match[1] as string;
}

export interface StudentSession {
  jar: CookieJar;
  token: string;
  studentId: string;
  deviceId: string;
}

/** Học sinh chọn tên trong lớp theo mã → cookie + token thiết bị. */
export async function pickStudent(
  app: INestApplication,
  code: string,
  studentId: string,
): Promise<StudentSession> {
  const res = await request(app.getHttpServer())
    .post(`/api/join/${code}/pick`)
    .send({ studentId })
    .expect(200);
  return {
    jar: readSetCookies(res),
    token: res.body.token,
    studentId,
    deviceId: res.body.student.deviceId,
  };
}
