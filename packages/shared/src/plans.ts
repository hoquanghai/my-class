/**
 * Danh mục gói dịch vụ và giá (VND). Quyết định 2026-09-11: Gold 100k/tháng, Platinum 200k/tháng,
 * gói năm bằng 70% của 12 tháng. Giới hạn ở đây là bảng quyền lợi để hiển thị; việc áp giới hạn
 * theo gói vẫn qua feature flag (`free.*`) cho tới khi có kích hoạt gói trả phí.
 */
export const PLAN_IDS = ['free', 'gold', 'platinum'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const BILLING_CYCLES = ['monthly', 'yearly'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** Gói năm = 12 tháng × (1 − 0,3). */
export const YEARLY_DISCOUNT = 0.3;

export const PLAN_NAMES: Record<PlanId, string> = {
  free: 'Miễn phí',
  gold: 'Gold',
  platinum: 'Platinum',
};

/** Giá năm làm tròn tới 10.000đ để dễ chuyển khoản. */
export function yearlyPrice(monthly: number): number {
  return Math.round((monthly * 12 * (1 - YEARLY_DISCOUNT)) / 10_000) * 10_000;
}

export interface PlanPricing {
  monthly: number;
  yearly: number;
}

export const PLAN_PRICES: Record<PlanId, PlanPricing> = {
  free: { monthly: 0, yearly: 0 },
  gold: { monthly: 100_000, yearly: yearlyPrice(100_000) },
  platinum: { monthly: 200_000, yearly: yearlyPrice(200_000) },
};

/** Số tiền phải trả cho một chu kỳ. */
export function planAmount(plan: PlanId, cycle: BillingCycle): number {
  return PLAN_PRICES[plan][cycle];
}

/** Giá quy ra mỗi tháng của gói năm (để so sánh trên bảng giá). */
export function monthlyEquivalent(plan: PlanId, cycle: BillingCycle): number {
  const p = PLAN_PRICES[plan];
  return cycle === 'yearly' ? Math.round(p.yearly / 12) : p.monthly;
}

/** "100.000đ" theo cách viết tiền Việt. */
export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

/** Quyền lợi số của từng gói; `null` = không giới hạn. */
export interface PlanLimits {
  maxClasses: number | null;
  maxStudents: number | null;
  maxQuestions: number | null;
  aiPagesPerMonth: number;
  /** Trang AI chạy chế độ chính xác cao (model mạnh hơn) */
  aiHighAccuracyPages: number;
  historyDays: number | null;
  exportEnabled: boolean;
  communityClonesPerDay: number | null;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxClasses: 2,
    maxStudents: 30,
    maxQuestions: 300,
    aiPagesPerMonth: 20,
    aiHighAccuracyPages: 0,
    historyDays: 30,
    exportEnabled: false,
    communityClonesPerDay: 20,
  },
  gold: {
    maxClasses: 10,
    maxStudents: 300,
    maxQuestions: 5_000,
    aiPagesPerMonth: 150,
    aiHighAccuracyPages: 0,
    historyDays: 365,
    exportEnabled: true,
    communityClonesPerDay: null,
  },
  platinum: {
    maxClasses: null,
    maxStudents: 1_000,
    maxQuestions: null,
    aiPagesPerMonth: 300,
    aiHighAccuracyPages: 50,
    historyDays: null,
    exportEnabled: true,
    communityClonesPerDay: null,
  },
};

/** Nội dung chuyển khoản để kích hoạt tay: `LOPHOC GOLD 12T ten@email`. */
export function transferMemo(plan: PlanId, cycle: BillingCycle, email: string): string {
  return `LOPHOC ${plan.toUpperCase()} ${cycle === 'yearly' ? 12 : 1}T ${email}`;
}
