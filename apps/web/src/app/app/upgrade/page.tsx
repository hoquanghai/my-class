'use client';

import { type BillingCycle, PLAN_IDS, type PlanId } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { OrderDialog } from '@/components/pricing/order-dialog';
import { PricingTable } from '@/components/pricing/pricing-table';
import { cn } from '@/components/ui/cn';
import { Spinner } from '@/components/ui/spinner';
import { useMe } from '@/lib/auth';
import { useLimits } from '@/lib/classes';

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

function asPlan(value: string | undefined): PlanId {
  return (PLAN_IDS as readonly string[]).includes(value ?? '') ? (value as PlanId) : 'free';
}

export default function UpgradePage() {
  const t = useTranslations('Upgrade');
  const me = useMe();
  const limits = useLimits();
  const u = limits.data;
  const [order, setOrder] = useState<{ plan: PlanId; cycle: BillingCycle } | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="type-h2 text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('subtitle')}</p>
      </div>

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

      <PricingTable
        variant="app"
        currentPlan={asPlan(me.data?.plan)}
        onChoose={(plan, cycle) => setOrder({ plan, cycle })}
      />

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
