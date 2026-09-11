import { z } from 'zod';
import { BILLING_CYCLES } from '../plans.js';

/** Gói có thu phí (gói miễn phí không cần yêu cầu thanh toán). */
export const PAID_PLANS = ['gold', 'platinum'] as const;
export type PaidPlanId = (typeof PAID_PLANS)[number];

/** Trạng thái yêu cầu thanh toán: chờ admin đối chiếu → kích hoạt hoặc từ chối. */
export const PAYMENT_STATUSES = ['pending', 'confirmed', 'rejected'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã kích hoạt',
  rejected: 'Từ chối',
};

export const createPaymentRequestSchema = z.object({
  plan: z.enum(PAID_PLANS, { error: 'Gói không hợp lệ' }),
  cycle: z.enum(BILLING_CYCLES, { error: 'Chu kỳ không hợp lệ' }),
  /** Ghi chú cho admin: ngân hàng chuyển, giờ chuyển, tên người chuyển nếu khác */
  note: z
    .string()
    .trim()
    .max(300, 'Ghi chú tối đa 300 ký tự')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
});
export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;
