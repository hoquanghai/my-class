'use client';

import { Check, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/components/ui/cn';
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

function PlanCard({
  name,
  price,
  badge,
  items,
  highlight,
}: {
  name: string;
  price: string;
  badge?: string;
  items: string[];
  highlight?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-card border p-5 sm:p-6',
        highlight ? 'border-accent bg-accent-soft/40' : 'border-hairline bg-canvas',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="type-h3 text-ink">{name}</h2>
        {badge && (
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              highlight ? 'bg-accent text-white' : 'bg-surface-soft text-ink-muted',
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink">{price}</p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-ink">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function UpgradePage() {
  const t = useTranslations('Upgrade');
  const me = useMe();
  const limits = useLimits();
  const u = limits.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          name={t('freeName')}
          price={t('freePrice')}
          badge={t('currentPlan')}
          items={[
            t('freeItems.classes', { max: u?.maxClasses ?? 2 }),
            t('freeItems.students', { max: u?.maxStudentsPerTeacher ?? 30 }),
            t('freeItems.ai', { max: u?.aiPagesPerMonth ?? 20 }),
            t('freeItems.history', { max: u?.historyDays ?? 30 }),
            t('freeItems.unlimited'),
          ]}
        />
        <PlanCard
          name={t('proName')}
          price={t('proPrice')}
          badge={t('comingSoon')}
          highlight
          items={[
            t('proItems.unlimited'),
            t('proItems.ai'),
            t('proItems.history'),
            t('proItems.export'),
            t('proItems.center'),
          ]}
        />
      </div>

      <section className="flex flex-col gap-3 rounded-card bg-block-cream p-5 sm:flex-row sm:items-start sm:gap-4 sm:p-6">
        <Sparkles className="size-6 shrink-0 text-ink" aria-hidden="true" />
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-ink">
            {t('notifyBody', { email: me.data?.email ?? '' })}
          </p>
          <Link href="/app/classes" className="text-sm font-medium text-accent hover:underline">
            {t('back')}
          </Link>
        </div>
      </section>
    </div>
  );
}
