'use client';

import {
  type BillingCycle,
  formatVnd,
  type PaidPlanId,
  PAYMENT_STATUS_LABELS,
  type PaymentStatus,
  PLAN_NAMES,
  type PlanId,
} from '@lophoc/shared';
import { BadgeCheck, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { OrderDialog } from '@/components/pricing/order-dialog';
import { PricingTable } from '@/components/pricing/pricing-table';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';
import { Spinner } from '@/components/ui/spinner';
import { useMe } from '@/lib/auth';
import { useBilling } from '@/lib/billing';
import { useLimits } from '@/lib/classes';
import { formatDate, formatDateTime } from '@/lib/format';

const STATUS_STYLE: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function UsageBar({ label, value, max }: { label: string; value: number; max: number }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const full = value >= max;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className={cn('font-mono text-sm tabular-nums', full ? 'text-danger' : 'text-ink')}>
          {value}/{max}
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-soft"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={cn('h-full rounded-full', full ? 'bg-danger' : 'bg-accent')}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function UpgradePage() {
  const t = useTranslations('Upgrade');
  const tb = useTranslations('Billing');
  const me = useMe();
  const limits = useLimits();
  const billing = useBilling();
  const u = limits.data;
  const b = billing.data;
  const currentPlan: PlanId = b?.plan ?? 'free';
  const [order, setOrder] = useState<{ plan: PaidPlanId; cycle: BillingCycle } | null>(null);
  const cycleLabel = (c: BillingCycle) => tb(`cycle.${c}`);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="type-h2 text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section
          className={cn(
            'rounded-card border p-5 sm:p-6',
            currentPlan === 'free'
              ? 'border-hairline bg-canvas'
              : 'border-accent bg-accent-soft/40',
          )}
        >
          <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            {tb('currentPlanTitle')}
          </p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-ink">
            {currentPlan !== 'free' && <BadgeCheck className="size-6 text-accent" aria-hidden />}
            {PLAN_NAMES[currentPlan]}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {currentPlan === 'free'
              ? tb('planFreeHint')
              : b?.planExpiresAt
                ? tb('planUntil', { date: formatDate(b.planExpiresAt) })
                : tb('planNoExpiry')}
          </p>
          {b?.pendingRequest && (
            <Alert variant="warning" className="mt-4">
              <span className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
                {tb('pendingBanner', {
                  plan: PLAN_NAMES[b.pendingRequest.plan],
                  cycle: cycleLabel(b.pendingRequest.cycle),
                  date: formatDateTime(b.pendingRequest.createdAt),
                })}
              </span>
            </Alert>
          )}
        </section>

        <section className="rounded-card border border-hairline bg-canvas p-5 sm:p-6">
          <h2 className="type-h3 mb-4 text-ink">{t('usageTitle')}</h2>
          {u ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <UsageBar
                label={t('usageStudents')}
                value={u.usage.students}
                max={u.maxStudentsPerTeacher}
              />
              <UsageBar label={t('usageClasses')} value={u.usage.classes} max={u.maxClasses} />
            </div>
          ) : (
            <div className="flex justify-center py-4 text-ink-muted">
              <Spinner className="size-5" />
            </div>
          )}
        </section>
      </div>

      <PricingTable
        variant="app"
        currentPlan={currentPlan}
        onChoose={(plan, cycle) => {
          if (plan !== 'free') setOrder({ plan, cycle });
        }}
      />

      <section className="rounded-card border border-hairline bg-canvas">
        <h2 className="type-h3 px-5 pt-5 pb-3 text-ink">{tb('historyTitle')}</h2>
        {billing.isPending ? (
          <div className="flex justify-center py-6 text-ink-muted">
            <Spinner className="size-5" />
          </div>
        ) : !b || b.requests.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-ink-muted">{tb('historyEmpty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-soft text-left text-xs tracking-wide text-ink-muted uppercase">
                <tr>
                  <th className="px-5 py-2 font-medium">{tb('colDate')}</th>
                  <th className="px-3 py-2 font-medium">{tb('colPlan')}</th>
                  <th className="px-3 py-2 font-medium">{tb('colAmount')}</th>
                  <th className="px-3 py-2 font-medium">{tb('colStatus')}</th>
                  <th className="px-5 py-2 font-medium">{tb('colNote')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {b.requests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-2.5 whitespace-nowrap text-ink-muted">
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-ink">
                      {PLAN_NAMES[r.plan]} · {cycleLabel(r.cycle)}
                    </td>
                    <td className="px-3 py-2.5 text-ink tabular-nums">{formatVnd(r.amount)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-xs font-semibold',
                          STATUS_STYLE[r.status],
                        )}
                      >
                        {PAYMENT_STATUS_LABELS[r.status]}
                      </span>
                      {r.status === 'confirmed' && r.activatedUntil && (
                        <span className="ml-2 text-xs text-ink-muted">
                          {tb('activatedUntil', { date: formatDate(r.activatedUntil) })}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-ink-muted">{r.reviewNote ?? r.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-card bg-block-cream p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-ink">{t('activationNote')}</p>
        <Link
          href="/app/classes"
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          {t('back')}
        </Link>
      </section>

      {order && me.data && (
        <OrderDialog
          plan={order.plan}
          cycle={order.cycle}
          email={me.data.email}
          onClose={() => setOrder(null)}
        />
      )}
    </div>
  );
}
