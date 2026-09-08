import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers.js';

describe('GET /api/health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('trả về 200 và status ok từ DB thật, không cần đăng nhập', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
    expect(typeof res.body.time).toBe('string');
  });
});
