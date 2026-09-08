import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupE2eData, createTestApp, uniqueEmail } from './helpers.js';

describe('Auth rate limit (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.THROTTLE_SKIP = 'false';
    app = await createTestApp();
  });

  afterAll(async () => {
    process.env.THROTTLE_SKIP = 'true';
    await cleanupE2eData(app);
    await app.close();
  });

  it('lần đăng nhập sai thứ 11 trong một phút bị chặn 429', async () => {
    const email = uniqueEmail('throttle');
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'sai-mat-khau' })
        .expect(401);
    }
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'sai-mat-khau' })
      .expect(429);
    expect(res.body.statusCode).toBe(429);
  });
});
