import { type INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { AppIoAdapter } from './modules/realtime/app-io.adapter.js';

export interface ConfigureAppOptions {
  corsOrigin: string | string[] | boolean;
  /** URL Redis cho Socket.IO adapter; bỏ trống → adapter trong bộ nhớ (một instance / test). */
  realtimeRedisUrl?: string;
}

/** Cấu hình dùng chung cho main.ts và test e2e để hai môi trường không lệch nhau. */
export async function configureApp(
  app: INestApplication,
  options: ConfigureAppOptions,
): Promise<AppIoAdapter> {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  const io = new AppIoAdapter(app, options.corsOrigin);
  if (options.realtimeRedisUrl) await io.connectToRedis(options.realtimeRedisUrl);
  app.useWebSocketAdapter(io);
  return io;
}
