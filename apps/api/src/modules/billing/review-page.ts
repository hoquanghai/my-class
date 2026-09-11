import {
  type BillingCycle,
  formatVnd,
  type PaidPlanId,
  PAYMENT_STATUS_LABELS,
  type PaymentRequestDto,
  PLAN_NAMES,
} from '@lophoc/shared';
import { escapeHtml, type ReviewInfo } from './billing.service.js';

const CYCLE_LABEL: Record<BillingCycle, string> = { monthly: '1 tháng', yearly: '12 tháng' };

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>body{font-family:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:#f7f7f5;color:#111;margin:0;padding:24px}main{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6e6e6;border-radius:16px;padding:24px}h1{font-size:20px;margin:0 0 12px}dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0 0 16px;font-size:14px}dt{color:#5b5b60}dd{margin:0;font-weight:600}form{display:inline-block;margin:8px 8px 0 0}button{height:40px;padding:0 16px;border-radius:8px;border:1px solid #e6e6e6;background:#fff;font:inherit;font-weight:600;cursor:pointer}button.primary{background:#2a5bd7;border-color:#2a5bd7;color:#fff}button.danger{color:#c62828}textarea{width:100%;box-sizing:border-box;margin:8px 0;padding:8px;border:1px solid #e6e6e6;border-radius:8px;font:inherit}.ok{background:#c8e6cd;padding:12px;border-radius:8px}.warn{background:#f4ecd6;padding:12px;border-radius:8px}</style></head><body><main>${body}</main></body></html>`;
}

function details(r: PaymentRequestDto, teacher: ReviewInfo['teacher']): string {
  return `<dl>
<dt>Giáo viên</dt><dd>${escapeHtml(teacher.name)} &lt;${escapeHtml(teacher.email)}&gt;</dd>
<dt>Gói hiện tại</dt><dd>${escapeHtml(PLAN_NAMES[teacher.plan])}${teacher.planExpiresAt ? ` (đến ${new Date(teacher.planExpiresAt).toLocaleDateString('vi-VN')})` : ''}</dd>
<dt>Yêu cầu</dt><dd>${escapeHtml(PLAN_NAMES[r.plan as PaidPlanId])} · ${CYCLE_LABEL[r.cycle]} · ${formatVnd(r.amount)}</dd>
<dt>Nội dung CK</dt><dd>${escapeHtml(r.memo)}</dd>
<dt>Ghi chú GV</dt><dd>${escapeHtml(r.note ?? '—')}</dd>
<dt>Gửi lúc</dt><dd>${new Date(r.createdAt).toLocaleString('vi-VN')}</dd>
<dt>Trạng thái</dt><dd>${PAYMENT_STATUS_LABELS[r.status]}</dd>
</dl>`;
}

/** Trang duyệt cho admin (mở từ email): hai nút kích hoạt / từ chối gửi form POST kèm token. */
export function renderReviewPage(info: ReviewInfo, token: string): string {
  const r = info.request;
  const actions =
    r.status === 'pending'
      ? `<textarea name="note" form="confirm" rows="2" maxlength="300" placeholder="Ghi chú gửi kèm email cho giáo viên (tùy chọn)"></textarea>
<form id="confirm" method="post" action="/api/billing/review/${r.id}/confirm"><input type="hidden" name="token" value="${escapeHtml(token)}"><button class="primary" type="submit">Kích hoạt gói</button></form>
<form method="post" action="/api/billing/review/${r.id}/reject" onsubmit="this.note.value=document.querySelector('textarea[name=note]').value"><input type="hidden" name="token" value="${escapeHtml(token)}"><input type="hidden" name="note" value=""><button class="danger" type="submit">Từ chối</button></form>`
      : `<p class="warn">Yêu cầu này đã được xử lý: <strong>${PAYMENT_STATUS_LABELS[r.status]}</strong>${r.reviewedAt ? ` lúc ${new Date(r.reviewedAt).toLocaleString('vi-VN')}` : ''}.</p>`;
  return layout(
    'Duyệt yêu cầu thanh toán',
    `<h1>Duyệt yêu cầu thanh toán</h1>${details(r, info.teacher)}${actions}`,
  );
}

export function renderDonePage(r: PaymentRequestDto): string {
  const ok = r.status === 'confirmed';
  const msg = ok
    ? `Đã kích hoạt ${PLAN_NAMES[r.plan as PaidPlanId]} · ${CYCLE_LABEL[r.cycle]} đến ${r.activatedUntil ? new Date(r.activatedUntil).toLocaleDateString('vi-VN') : '—'}. Giáo viên đã nhận email.`
    : `Đã từ chối yêu cầu. Giáo viên đã nhận email.`;
  return layout(
    'Đã xử lý',
    `<h1>Đã xử lý</h1><p class="${ok ? 'ok' : 'warn'}">${escapeHtml(msg)}</p>`,
  );
}
