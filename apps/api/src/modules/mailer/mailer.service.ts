import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../../config/env.js';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Gửi email qua SMTP (Mailpit ở dev). Với `MAIL_TRANSPORT=memory` (test) email được giữ trong `outbox`.
 * Lỗi gửi được ghi log, không làm hỏng request gọi nó.
 */
@Injectable()
export class MailerService {
  readonly outbox: MailMessage[] = [];
  private readonly logger = new Logger(MailerService.name);
  private readonly transport: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    this.from = config.get('MAIL_FROM', { infer: true });
    if (config.get('MAIL_TRANSPORT', { infer: true }) === 'memory') {
      this.transport = null;
      return;
    }
    const user = config.get('SMTP_USER', { infer: true });
    const pass = config.get('SMTP_PASS', { infer: true });
    this.transport = createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      auth: user ? { user, pass } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transport) {
      this.outbox.push(message);
      return;
    }
    try {
      await this.transport.sendMail({ from: this.from, ...message });
    } catch (err) {
      this.logger.error(`Gửi email tới ${message.to} thất bại: ${(err as Error).message}`);
    }
  }
}
