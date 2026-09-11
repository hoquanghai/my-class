'use client';

import {
  type BillingCycle,
  formatVnd,
  PLAN_NAMES,
  planAmount,
  type PlanId,
  transferMemo,
} from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { CopyButton } from '@/components/copy-button';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

/** Tài khoản nhận tiền và kênh hỗ trợ đặt trong biến môi trường công khai của web. */
const BANK = {
  name: process.env.NEXT_PUBLIC_BILLING_BANK ?? '',
  account: process.env.NEXT_PUBLIC_BILLING_ACCOUNT ?? '',
  owner: process.env.NEXT_PUBLIC_BILLING_OWNER ?? '',
  zalo: process.env.NEXT_PUBLIC_BILLING_ZALO ?? '',
};

/**
 * Đăng ký gói bằng chuyển khoản, kích hoạt tay (chưa tích hợp cổng thanh toán):
 * hiện số tiền, tài khoản nhận và nội dung chuyển khoản để đối chiếu.
 */
export function OrderDialog({
  plan,
  cycle,
  email,
  onClose,
}: {
  plan: PlanId;
  cycle: BillingCycle;
  email: string;
  onClose: () => void;
}) {
  const t = useTranslations('Pricing.order');
  const tc = useTranslations('Common');
  const amount = planAmount(plan, cycle);
  const memo = transferMemo(plan, cycle, email);
  const hasBank = BANK.name && BANK.account;

  const row = (label: string, value: string, copy?: boolean) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="flex items-center gap-2 text-right font-medium text-ink">
        <span className="font-mono text-sm break-all">{value}</span>
        {copy && <CopyButton text={value} />}
      </dd>
    </div>
  );

  return (
    <Dialog open onClose={onClose} title={t('title', { plan: PLAN_NAMES[plan] })}>
      <div className="space-y-4">
        <div className="rounded-lg bg-surface-soft p-4">
          <p className="text-sm text-ink-muted">
            {t('summary', {
              plan: PLAN_NAMES[plan],
              cycle: cycle === 'yearly' ? t('cycleYearly') : t('cycleMonthly'),
            })}
          </p>
          <p className="mt-1 text-3xl font-bold text-ink tabular-nums">{formatVnd(amount)}</p>
        </div>

        <p className="text-sm text-ink">{t('step1')}</p>
        {hasBank ? (
          <dl className="divide-y divide-hairline-soft rounded-lg border border-hairline px-4">
            {row(t('bank'), BANK.name)}
            {row(t('account'), BANK.account, true)}
            {BANK.owner && row(t('owner'), BANK.owner)}
            {row(t('amount'), formatVnd(amount), true)}
            {row(t('memo'), memo, true)}
          </dl>
        ) : (
          <Alert variant="warning">{t('missingBank')}</Alert>
        )}

        <p className="text-sm text-ink-muted">{t('step2', { email })}</p>
        {BANK.zalo && <p className="text-sm text-ink-muted">{t('contact', { zalo: BANK.zalo })}</p>}

        <div className="flex justify-end pt-1">
          <Button onClick={onClose}>{tc('close')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
