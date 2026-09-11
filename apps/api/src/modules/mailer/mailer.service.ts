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

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Gửi email theo `MAIL_TRANSPORT`:
 * - `resend`: gọi API HTTPS của Resend (production; không cần mở cổng SMTP trên VPS),
 * - `smtp`: nodemailer tới máy chủ SMTP (Mailpit ở dev),
 * - `memory`: giữ trong `outbox` để test.
 * Lỗi gửi được ghi log, không làm hỏng request gọi nó.
 */
@Injectable()
export class MailerService {
  readonly outbox: MailMessage[] = [];
  private readonly logger = new Logger(MailerService.name);
  private readonly mode: Env['MAIL_TRANSPORT'];
  private readonly from: string;
  private readonly smtp: Transporter | null = null;
  private readonly resendKey: string | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.mode = config.get('MAIL_TRANSPORT', { infer: true });
    this.from = config.get('MAIL_FROM', { infer: true });
    this.resendKey = config.get('RESEND_API_KEY', { infer: true });
    if (this.mode === 'smtp') {
      const user = config.get('SMTP_USER', { infer: true });
      const pass = config.get('SMTP_PASS', { infer: true });
      this.smtp = createTransport({
        host: config.get('SMTP_HOST', { infer: true }),
        port: config.get('SMTP_PORT', { infer: true }),
        secure: config.get('SMTP_SECURE', { infer: true }),
        auth: user ? { user, pass } : undefined,
      });
    }
  }

  async send(message: MailMessage): Promise<void> {
    if (this.mode === 'memory') {
      this.outbox.push(message);
      return;
    }
    try {
      if (this.mode === 'resend') await this.sendResend(message);
      else await this.smtp!.sendMail({ from: this.from, ...message });
    } catch (err) {
      this.logger.error(`Gửi email tới ${message.to} thất bại: ${(err as Error).message}`);
    }
  }

  private async sendResend(message: MailMessage): Promise<void> {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendKey ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend trả ${res.status}: ${body.slice(0, 300)}`);
    }
  }
}
