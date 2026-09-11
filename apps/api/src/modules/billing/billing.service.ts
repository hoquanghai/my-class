import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type BillingCycle,
  type BillingDto,
  type CreatePaymentRequestInput,
  effectivePlan,
  ErrorCodes,
  extendExpiry,
  formatVnd,
  type PaidPlanId,
  type PaymentRequestDto,
  type PaymentStatus,
  PLAN_NAMES,
  type PlanId,
  planAmount,
  transferMemo,
} from '@lophoc/shared';
import type { Env } from '../../config/env.js';
import type { PaymentRequest } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailerService } from '../mailer/mailer.service.js';

type Decision = 'confirmed' | 'rejected';

export interface ReviewInfo {
  request: PaymentRequestDto;
  teacher: { name: string; email: string; plan: PlanId; planExpiresAt: string | null };
}

const CYCLE_LABEL: Record<BillingCycle, string> = { monthly: '1 tháng', yearly: '12 tháng' };

export function toPaymentRequestDto(r: PaymentRequest): PaymentRequestDto {
  return {
    id: r.id,
    plan: r.plan as PaidPlanId,
    cycle: r.cycle as BillingCycle,
    amount: r.amount,
    memo: r.memo,
    note: r.note,
    status: r.status as PaymentStatus,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewNote: r.reviewNote,
    activatedUntil: r.activatedUntil?.toISOString() ?? null,
  };
}

function fmtDate(d: Date | null): string {
  return d ? d.toLocaleDateString('vi-VN') : '—';
}

/**
 * Thanh toán bằng chuyển khoản, kích hoạt tay: giáo viên gửi "đã chuyển khoản" → email cho admin
 * kèm link duyệt có chữ ký HMAC → admin bấm kích hoạt / từ chối trên trang duyệt của API →
 * gói và hạn được ghi lên Teacher, giáo viên nhận email.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly appUrl: string;
  private readonly apiUrl: string;
  private readonly adminEmail: string;
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true });
    this.apiUrl = config.get('API_URL', { infer: true });
    this.adminEmail = config.get('BILLING_ADMIN_EMAIL', { infer: true });
    this.secret = config.get('JWT_SECRET', { infer: true });
  }

  async me(teacherId: string): Promise<BillingDto> {
    const teacher = await this.prisma.teacher.findUniqueOrThrow({
      where: { id: teacherId },
      select: { plan: true, planExpiresAt: true },
    });
    const rows = await this.prisma.paymentRequest.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const requests = rows.map(toPaymentRequestDto);
    return {
      plan: effectivePlan(teacher.plan, teacher.planExpiresAt),
      planExpiresAt: teacher.planExpiresAt?.toISOString() ?? null,
      pendingRequest: requests.find((r) => r.status === 'pending') ?? null,
      requests,
    };
  }

  /** Giáo viên báo đã chuyển khoản; mỗi lúc chỉ một yêu cầu chờ để admin không đối chiếu nhầm. */
  async createRequest(
    teacherId: string,
    input: CreatePaymentRequestInput,
  ): Promise<PaymentRequestDto> {
    const teacher = await this.prisma.teacher.findUniqueOrThrow({
      where: { id: teacherId },
      select: { name: true, email: true, plan: true, planExpiresAt: true },
    });
    const pending = await this.prisma.paymentRequest.findFirst({
      where: { teacherId, status: 'pending' },
    });
    if (pending) {
      throw new ConflictException({
        code: ErrorCodes.PAYMENT_PENDING,
        message:
          'Bạn đang có một yêu cầu chờ xác nhận. Vui lòng đợi xử lý xong trước khi gửi yêu cầu mới.',
      });
    }
    const row = await this.prisma.paymentRequest.create({
      data: {
        teacherId,
        plan: input.plan,
        cycle: input.cycle,
        amount: planAmount(input.plan, input.cycle),
        memo: transferMemo(input.plan, input.cycle, teacher.email),
        note: input.note ?? null,
      },
    });
    await this.notifyAdmin(row, teacher);
    return toPaymentRequestDto(row);
  }

  reviewToken(id: string): string {
    return createHmac('sha256', this.secret).update(`billing-review:${id}`).digest('base64url');
  }

  private assertToken(id: string, token: string | undefined): void {
    const expected = this.reviewToken(id);
    const given = token ?? '';
    if (
      given.length !== expected.length ||
      !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
    ) {
      throw new ForbiddenException('Liên kết duyệt không hợp lệ');
    }
  }

  async reviewInfo(id: string, token: string | undefined): Promise<ReviewInfo> {
    this.assertToken(id, token);
    const row = await this.prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        teacher: { select: { name: true, email: true, plan: true, planExpiresAt: true } },
      },
    });
    if (!row) throw new NotFoundException('Không tìm thấy yêu cầu thanh toán');
    return {
      request: toPaymentRequestDto(row),
      teacher: {
        name: row.teacher.name,
        email: row.teacher.email,
        plan: effectivePlan(row.teacher.plan, row.teacher.planExpiresAt),
        planExpiresAt: row.teacher.planExpiresAt?.toISOString() ?? null,
      },
    };
  }

  /** Admin duyệt: kích hoạt (ghi gói + hạn lên Teacher) hoặc từ chối; gọi lại khi đã xử lý thì trả nguyên. */
  async review(
    id: string,
    token: string | undefined,
    decision: Decision,
    note?: string,
  ): Promise<PaymentRequestDto> {
    this.assertToken(id, token);
    const row = await this.prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true, plan: true, planExpiresAt: true } },
      },
    });
    if (!row) throw new NotFoundException('Không tìm thấy yêu cầu thanh toán');
    if (row.status !== 'pending') return toPaymentRequestDto(row);

    const reviewNote = note?.trim().slice(0, 300) || null;
    const now = new Date();
    let updated: PaymentRequest;
    if (decision === 'confirmed') {
      const activatedUntil = extendExpiry(
        { plan: row.teacher.plan, expiresAt: row.teacher.planExpiresAt },
        row.plan as PaidPlanId,
        row.cycle as BillingCycle,
        now,
      );
      [, updated] = await this.prisma.$transaction([
        this.prisma.teacher.update({
          where: { id: row.teacherId },
          data: { plan: row.plan, planExpiresAt: activatedUntil },
        }),
        this.prisma.paymentRequest.update({
          where: { id },
          data: { status: 'confirmed', reviewedAt: now, reviewNote, activatedUntil },
        }),
      ]);
    } else {
      updated = await this.prisma.paymentRequest.update({
        where: { id },
        data: { status: 'rejected', reviewedAt: now, reviewNote },
      });
    }
    await this.notifyTeacher(updated, row.teacher);
    return toPaymentRequestDto(updated);
  }

  // ---------- email ----------

  private describe(r: PaymentRequest): string {
    return `${PLAN_NAMES[r.plan as PaidPlanId]} · ${CYCLE_LABEL[r.cycle as BillingCycle]} · ${formatVnd(r.amount)}`;
  }

  private async notifyAdmin(
    r: PaymentRequest,
    teacher: { name: string; email: string; plan: string; planExpiresAt: Date | null },
  ): Promise<void> {
    if (!this.adminEmail) {
      this.logger.warn('BILLING_ADMIN_EMAIL trống: không gửi được email yêu cầu thanh toán');
      return;
    }
    const link = `${this.apiUrl}/api/billing/review/${r.id}?token=${this.reviewToken(r.id)}`;
    const lines = [
      `Giáo viên: ${teacher.name} <${teacher.email}>`,
      `Gói hiện tại: ${PLAN_NAMES[effectivePlan(teacher.plan, teacher.planExpiresAt)]}${teacher.planExpiresAt ? ` (đến ${fmtDate(teacher.planExpiresAt)})` : ''}`,
      `Yêu cầu: ${this.describe(r)}`,
      `Nội dung chuyển khoản: ${r.memo}`,
      `Ghi chú của giáo viên: ${r.note ?? '—'}`,
      `Gửi lúc: ${r.createdAt.toLocaleString('vi-VN')}`,
      '',
      `Duyệt tại: ${link}`,
    ];
    await this.mailer.send({
      to: this.adminEmail,
      subject: `[Lớp Học] Yêu cầu thanh toán ${this.describe(r)} – ${teacher.name}`,
      text: lines.join('\n'),
      html: `<p>${lines.slice(0, 6).map(escapeHtml).join('<br>')}</p><p><a href="${link}">Mở trang duyệt yêu cầu</a></p>`,
    });
  }

  private async notifyTeacher(
    r: PaymentRequest,
    teacher: { name: string; email: string },
  ): Promise<void> {
    const confirmed = r.status === 'confirmed';
    const subject = confirmed
      ? `[Lớp Học] Gói ${PLAN_NAMES[r.plan as PaidPlanId]} đã được kích hoạt`
      : `[Lớp Học] Yêu cầu thanh toán chưa được xác nhận`;
    const body = confirmed
      ? `Chào ${teacher.name},\n\nGói ${this.describe(r)} đã được kích hoạt, hiệu lực đến ${fmtDate(r.activatedUntil)}.${r.reviewNote ? `\nGhi chú: ${r.reviewNote}` : ''}\n\nMở ứng dụng: ${this.appUrl}/app/upgrade`
      : `Chào ${teacher.name},\n\nChúng tôi chưa đối chiếu được khoản chuyển cho ${this.describe(r)}.${r.reviewNote ? `\nLý do: ${r.reviewNote}` : ''}\nVui lòng kiểm tra lại giao dịch và gửi yêu cầu mới tại ${this.appUrl}/app/upgrade, hoặc trả lời email này để được hỗ trợ.`;
    await this.mailer.send({
      to: teacher.email,
      subject,
      text: body,
      html: `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`,
    });
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
