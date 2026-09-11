'use client';

import {
  type BillingCycle,
  formatVnd,
  monthlyEquivalent,
  PLAN_IDS,
  PLAN_NAMES,
  PLAN_PRICES,
  type PlanId,
} from '@lophoc/shared';
import { Check, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PillLink } from '@/components/marketing/primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';

const HIGHLIGHT: PlanId = 'gold';

/** Công tắc Tháng / Năm; gói năm rẻ hơn 30% nên gắn nhãn tiết kiệm ngay trên nút. */
export function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  const t = useTranslations('Pricing');
  const option = (value: BillingCycle, label: string, badge?: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={cycle === value}
      onClick={() => onChange(value)}
      className={cn(
        'flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
        cycle === value ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink',
      )}
    >
      {label}
      {badge && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            cycle === value ? 'bg-block-lime text-ink' : 'bg-block-lime/70 text-ink',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
  return (
    <div
      role="tablist"
      aria-label={t('billingLabel')}
      className="inline-flex rounded-full border border-hairline bg-canvas p-1"
    >
      {option('monthly', t('billingMonthly'))}
      {option('yearly', t('billingYearly'), t('yearlySave'))}
    </div>
  );
}

/**
 * Bảng giá ba gói. `variant="marketing"` dùng nút viên thuốc dẫn tới đăng ký;
 * `variant="app"` dùng nút trong app và gọi `onChoose` để mở hộp thoại đăng ký gói.
 */
export function PricingTable({
  variant = 'app',
  currentPlan,
  cycle: controlledCycle,
  onCycleChange,
  onChoose,
  className,
}: {
  variant?: 'app' | 'marketing';
  currentPlan?: PlanId;
  cycle?: BillingCycle;
  onCycleChange?: (cycle: BillingCycle) => void;
  onChoose?: (plan: PlanId, cycle: BillingCycle) => void;
  className?: string;
}) {
  const t = useTranslations('Pricing');
  const [innerCycle, setInnerCycle] = useState<BillingCycle>('yearly');
  const cycle = controlledCycle ?? innerCycle;
  const setCycle = (c: BillingCycle) => {
    setInnerCycle(c);
    onCycleChange?.(c);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col items-center gap-2">
        <BillingToggle cycle={cycle} onChange={setCycle} />
        <p className="text-xs text-ink-muted">{t('note')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_IDS.map((plan) => {
          const highlight = plan === HIGHLIGHT;
          const current = currentPlan === plan;
          const price = PLAN_PRICES[plan];
          const features = t.raw(`plans.${plan}.features`) as string[];
          const soon = plan === 'platinum' ? t('plans.platinum.soon') : null;
          return (
            <section
              key={plan}
              aria-label={PLAN_NAMES[plan]}
              className={cn(
                'relative flex flex-col rounded-card border bg-canvas p-6',
                highlight ? 'border-accent shadow-soft' : 'border-hairline',
              )}
            >
              {highlight && (
                <span className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                  <Sparkles className="size-3" aria-hidden="true" />
                  {t('popular')}
                </span>
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="type-h3 text-ink">{PLAN_NAMES[plan]}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{t(`plans.${plan}.tagline`)}</p>
                </div>
                {current && (
                  <span className="shrink-0 rounded-full bg-surface-soft px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                    {t('current')}
                  </span>
                )}
              </div>

              <div className="mt-5">
                {price.monthly === 0 ? (
                  <>
                    <p className="text-4xl font-bold tracking-tight text-ink tabular-nums">
                      {formatVnd(0)}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{t('forever')}</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-bold tracking-tight text-ink tabular-nums">
                      {formatVnd(monthlyEquivalent(plan, cycle))}
                      <span className="text-base font-medium text-ink-muted">{t('perMonth')}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-muted tabular-nums">
                      {cycle === 'yearly'
                        ? t('yearlyBilled', { total: formatVnd(price.yearly) })
                        : t('monthlyBilled', { yearly: formatVnd(price.yearly) })}
                    </p>
                  </>
                )}
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {features.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                    {item}
                  </li>
                ))}
                {soon && (
                  <li className="flex items-start gap-2 text-sm text-ink-muted">
                    <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {soon}
                  </li>
                )}
              </ul>

              <div className="mt-6">
                {variant === 'marketing' ? (
                  <PillLink
                    href={plan === 'free' ? '/signup' : `/signup?plan=${plan}`}
                    variant={highlight ? 'primary' : 'secondary'}
                    className="w-full px-3"
                  >
                    {t(`plans.${plan}.cta`)}
                  </PillLink>
                ) : plan === 'free' ? (
                  <Button variant="secondary" className="w-full" disabled>
                    {current ? t('current') : t('plans.free.cta')}
                  </Button>
                ) : (
                  <Button
                    variant={highlight ? 'primary' : 'secondary'}
                    className="w-full"
                    disabled={current}
                    onClick={() => onChoose?.(plan, cycle)}
                  >
                    {current ? t('current') : t(`plans.${plan}.cta`)}
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <CompareTable />
    </div>
  );
}

/** Bảng so sánh chi tiết; dữ liệu là mảng hàng trong vi.json để sửa quyền lợi không cần đổi code. */
function CompareTable() {
  const t = useTranslations('Pricing');
  const rows = t.raw('compare.rows') as {
    label: string;
    free: string;
    gold: string;
    platinum: string;
  }[];
  return (
    <details className="rounded-card border border-hairline bg-canvas">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-ink">
        {t('compareTitle')}
      </summary>
      <div className="overflow-x-auto border-t border-hairline">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-surface-soft text-left text-xs tracking-wide text-ink-muted uppercase">
            <tr>
              <th className="px-5 py-2 font-medium">{t('compareFeature')}</th>
              {PLAN_IDS.map((plan) => (
                <th key={plan} className="px-4 py-2 font-medium">
                  {PLAN_NAMES[plan]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-soft">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-5 py-2.5 font-medium text-ink">{row.label}</td>
                <td className="px-4 py-2.5 text-ink-muted">{row.free}</td>
                <td className="px-4 py-2.5 text-ink">{row.gold}</td>
                <td className="px-4 py-2.5 text-ink">{row.platinum}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
