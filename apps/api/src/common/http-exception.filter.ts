import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Chuẩn hóa mọi lỗi thành `{ statusCode, code?, message }`.
 * - HttpException giữ nguyên status; nếu body có `code` thì giữ lại (mã lỗi nghiệp vụ).
 * - Lỗi validation (message dạng mảng) gộp thành một chuỗi.
 * - Lỗi không xác định → 500, ghi log stack.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const { message, code } = normalizeBody(exception.getResponse(), exception.message);
      res.status(status).json({ statusCode: status, ...(code ? { code } : {}), message });
      return;
    }

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Lỗi hệ thống, vui lòng thử lại' });
  }
}

function normalizeBody(body: string | object, fallback: string): { message: string; code?: string } {
  if (typeof body === 'string') return { message: body };
  const b = body as { message?: unknown; code?: unknown };
  const message = Array.isArray(b.message)
    ? b.message.map(String).join('; ')
    : typeof b.message === 'string'
      ? b.message
      : fallback;
  const code = typeof b.code === 'string' ? b.code : undefined;
  return { message, code };
}
