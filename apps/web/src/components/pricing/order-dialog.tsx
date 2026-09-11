'use client';

import {
  BANK_ACCOUNT,
  type BillingCycle,
  ErrorCodes,
  formatVnd,
  type PaidPlanId,
  PLAN_NAMES,
  planAmount,
  qrImagePath,
  transferMemo,
} from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { type FormEvent, useState } from 'react';
import { CopyButton } from '@/components/copy-button';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { ApiError, errorMessage } from '@/lib/api';
import { useBilling, useCreatePaymentRequest } from '@/lib/billing';
import { formatDateTime } from '@/lib/format';

/** Tài khoản nhận: mặc định theo mã QR trong repo, có thể ghi đè bằng biến môi trường công khai. */
const BANK = {
  name: process.env.NEXT_PUBLIC_BILLING_BANK || BANK_ACCOUNT.bank,
  account: process.env.NEXT_PUBLIC_BILLING_ACCOUNT || BANK_ACCOUNT.account,
  owner: process.env.NEXT_PUBLIC_BILLING_OWNER || BANK_ACCOUNT.owner,
  zalo: process.env.NEXT_PUBLIC_BILLING_ZALO ?? '',
};

type Step = 'pay' | 'confirm' | 'done';

/**
 * Đăng ký gói bằng chuyển khoản: quét mã QR đúng số tiền → bấm "Tôi đã chuyển khoản" → gửi xác nhận
 * (kèm ghi chú) → yêu cầu ở trạng thái chờ, admin nhận email và kích hoạt tay.
 */
export function OrderDialog({
  plan,
  cycle,
  email,
  onClose,
}: {
  plan: PaidPlanId;
  cycle: BillingCycle;
  email: string;
  onClose: () => void;
}) {
  const t = useTranslations('Pricing.order');
  const tc = useTranslations('Common');
  const billing = useBilling();
  const create = useCreatePaymentRequest();
  const [step, setStep] = useState<Step>('pay');
  const [note, setNote] = useState('');

  const amount = planAmount(plan, cycle);
  const memo = transferMemo(plan, cycle, email);
  const qr = qrImagePath(plan, cycle);
  const cycleLabel = cycle === 'yearly' ? t('cycleYearly') : t('cycleMonthly');
  const pending = billing.data?.pendingRequest ?? null;
  const pendingError =
    create.error instanceof ApiError && create.error.code === ErrorCodes.PAYMENT_PENDING;

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ plan, cycle, note });
      setStep('done');
    } catch {
      // lỗi hiển thị qua create.error
    }
  }

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
      {pending && step !== 'done' ? (
        <div className="space-y-4">
          <Alert variant="info">
            {t('pendingExists', {
              plan: PLAN_NAMES[pending.plan],
              cycle: pending.cycle === 'yearly' ? t('cycleYearly') : t('cycleMonthly'),
              date: formatDateTime(pending.createdAt),
            })}
          </Alert>
          <div className="flex justify-end">
            <Button onClick={onClose}>{tc('close')}</Button>
          </div>
        </div>
      ) : step === 'done' ? (
        <div className="space-y-4">
          <Alert variant="success">{t('sent', { email })}</Alert>
          <div className="flex justify-end">
            <Button onClick={onClose}>{tc('close')}</Button>
          </div>
        </div>
      ) : step === 'confirm' ? (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <p className="text-sm text-ink">
            {t('confirmBody', {
              amount: formatVnd(amount),
              plan: PLAN_NAMES[plan],
              cycle: cycleLabel,
            })}
          </p>
          <label htmlFor="pay-note" className="block text-sm font-medium text-ink">
            {t('noteLabel')}
          </label>
          <Textarea
            id="pay-note"
            rows={3}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
          />
          {create.isError && (
            <Alert variant="error">
              {pendingError ? t('pendingShort') : errorMessage(create.error)}
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep('pay')}>
              {t('back')}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t('send')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-surface-soft p-4">
            <p className="text-sm text-ink-muted">
              {t('summary', { plan: PLAN_NAMES[plan], cycle: cycleLabel })}
            </p>
            <p className="mt-1 text-3xl font-bold text-ink tabular-nums">{formatVnd(amount)}</p>
          </div>

          {qr && (
            <div className="flex flex-col items-center gap-2">
              <Image
                src={qr}
                alt={t('qrAlt', { plan: PLAN_NAMES[plan], cycle: cycleLabel })}
                width={280}
                height={394}
                priority
                className="rounded-xl border border-hairline"
              />
              <p className="max-w-sm text-center text-xs text-ink-muted">{t('scanHint')}</p>
            </div>
          )}

          <dl className="divide-y divide-hairline-soft rounded-lg border border-hairline px-4">
            {row(t('bank'), BANK.name)}
            {row(t('account'), BANK.account, true)}
            {row(t('owner'), BANK.owner)}
            {row(t('amount'), formatVnd(amount), true)}
            {row(t('memo'), memo, true)}
          </dl>

          <p className="text-sm text-ink-muted">{t('step2', { email })}</p>
          {BANK.zalo && (
            <p className="text-sm text-ink-muted">{t('contact', { zalo: BANK.zalo })}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button onClick={() => setStep('confirm')}>{t('paid')}</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
