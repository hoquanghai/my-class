import { type INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

/** Cấu hình dùng chung cho main.ts và test e2e để hai môi trường không lệch nhau. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
}
