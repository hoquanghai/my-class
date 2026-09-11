import type { BillingCycle, PlanId } from '../plans.js';
import type { PaidPlanId, PaymentStatus } from './schemas.js';

export interface PaymentRequestDto {
  id: string;
  plan: PaidPlanId;
  cycle: BillingCycle;
  /** VND */
  amount: number;
  /** Nội dung chuyển khoản để admin đối chiếu */
  memo: string;
  note: string | null;
  status: PaymentStatus;
  createdAt: string;
  reviewedAt: string | null;
  /** Ghi chú của admin khi kích hoạt / từ chối */
  reviewNote: string | null;
  /** Hạn gói sau khi kích hoạt */
  activatedUntil: string | null;
}

/** Gói đang hiệu lực, hạn, yêu cầu đang chờ và lịch sử thanh toán của giáo viên. */
export interface BillingDto {
  plan: PlanId;
  planExpiresAt: string | null;
  pendingRequest: PaymentRequestDto | null;
  requests: PaymentRequestDto[];
}
