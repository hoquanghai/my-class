import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);
  const appUrl = config.get('APP_URL', { infer: true });

  await configureApp(app, {
    corsOrigin: appUrl,
    realtimeRedisUrl:
      config.get('REALTIME_ADAPTER', { infer: true }) === 'redis'
        ? config.get('REDIS_URL', { infer: true })
        : undefined,
  });
  app.enableCors({ origin: appUrl, credentials: true });
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api (Socket.IO /rt)`);
}

await bootstrap();
