'use client';

import { ArrowRight, ChartColumn, Check, FileText, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useState } from 'react';
import { cn } from '@/components/ui/cn';
import { Eyebrow } from './primitives';

/**
 * "Lớp học mẫu": ba tab kể lại một buổi kiểm tra (nhập đề → làm bài → xem kết quả)
 * với dữ liệu minh họa lớp 12. Mở sẵn tab kết quả để người xem thấy giá trị trước.
 */
const STEP_ICONS = [FileText, Users, ChartColumn] as const;
const DISTRIBUTION = [3, 18, 6, 3];
const TOTAL = DISTRIBUTION.reduce((a, b) => a + b, 0);
const ANSWERS = ['3', '−3', '0', '−1'];
const CORRECT = 1;

const PRIMARY_BTN =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function Showcase() {
  const t = useTranslations('Landing.showcase');
  const [step, setStep] = useState(2);
  const [source, setSource] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + STEP_ICONS.length) % STEP_ICONS.length;
    setStep(next);
    document.getElementById(`showcase-tab-${next}`)?.focus();
  }

  return (
    <section
      aria-labelledby="showcase-heading"
      className="overflow-hidden rounded-block border border-hairline bg-surface-soft shadow-soft"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-hairline bg-canvas px-5 py-5 sm:px-8 lg:flex-row lg:items-center">
        <div>
          <Eyebrow className="text-ink-muted">{t('eyebrow')}</Eyebrow>
          <h2 id="showcase-heading" className="type-h3 mt-2">
            {t('title')}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink">{t('body')}</p>
        </div>
        <span className="w-fit shrink-0 rounded-full bg-surface-soft px-3 py-1.5 text-xs text-ink-muted">
          {t('sample')}
        </span>
      </div>

      <div className="p-4 sm:p-8">
        <div className="mb-6 grid grid-cols-3 gap-2" role="tablist" aria-label={t('title')}>
          {STEP_ICONS.map((Icon, i) => {
            const selected = step === i;
            return (
              <button
                key={i}
                id={`showcase-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="showcase-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setStep(i)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={cn(
                  'flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-sm',
                  selected
                    ? 'bg-accent text-white shadow-soft'
                    : 'bg-canvas text-ink hover:bg-accent-soft',
                )}
              >
                <Icon className="hidden size-4 sm:block" aria-hidden="true" />
                <span>
                  {i + 1}. {t(`steps.${i}`)}
                </span>
              </button>
            );
          })}
        </div>

        <div
          id="showcase-panel"
          role="tabpanel"
          aria-labelledby={`showcase-tab-${step}`}
          className="min-h-[390px]"
        >
          {step === 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-card border border-hairline bg-canvas p-6 sm:p-8">
                <FileText className="size-8 text-accent" aria-hidden="true" />
                <h3 className="type-h3 mt-5 text-2xl">{t('importTitle')}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink">{t('importBody')}</p>
                <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t('steps.0')}>
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={source === i}
                      onClick={() => setSource(i)}
                      className={cn(
                        'min-h-11 rounded-lg border px-4 text-sm focus-visible:outline-2 focus-visible:outline-accent',
                        source === i
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-hairline',
                      )}
                    >
                      {t(`sources.${i}`)}
                    </button>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-dashed border-hairline bg-surface-soft p-6">
                  <p className="text-xs font-semibold text-accent">{t(`sources.${source}`)}</p>
                  <p className="mt-3 font-medium">{t('file')}</p>
                  <p className="mt-3 text-sm text-ink-muted">{t('sourcePreview')}</p>
                </div>
              </div>
              <div className="rounded-card border border-hairline bg-canvas p-6 sm:p-8">
                <h3 className="type-h3">{t('ready')}</h3>
                <ol className="mt-6 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex gap-3 rounded-xl bg-surface-soft p-5 text-sm">
                      <span className="font-mono text-accent">0{i + 1}</span>
                      {t(`questions.${i}`)}
                      <Check className="ml-auto size-4 shrink-0 text-success" aria-hidden="true" />
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={cn(PRIMARY_BTN, 'mt-6')}
                >
                  {t('steps.1')}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-card bg-block-navy p-6 text-white sm:p-8">
                <Users className="size-8 text-block-lime" aria-hidden="true" />
                <h3 className="type-h3 mt-5 text-2xl">{t('joinTitle')}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/80">{t('joinBody')}</p>
                <p className="mt-8 text-sm text-white/70">{t('className')}</p>
                <p className="tabular mt-3 font-mono text-4xl font-bold tracking-widest">DEM268</p>
                <p className="mt-6 text-xs text-white/60">{t('sample')}</p>
              </div>
              <div className="rounded-card border border-hairline bg-canvas p-6 sm:p-8">
                <p className="text-xs font-semibold text-accent">{t('question')}</p>
                <h3 className="type-h3 mt-4">{t('questions.2')}</h3>
                <div
                  role="group"
                  aria-label={t('question')}
                  className="mt-5 grid grid-cols-2 gap-3"
                >
                  {ANSWERS.map((a, i) => (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={answer === i}
                      onClick={() => {
                        setAnswer(i);
                        setSubmitted(false);
                      }}
                      className={cn(
                        'min-h-12 rounded-xl border p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-accent',
                        answer === i
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-hairline hover:bg-surface-soft',
                      )}
                    >
                      {'ABCD'[i]}. {a}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={answer === null || submitted}
                  onClick={() => setSubmitted(true)}
                  className={cn(
                    'mt-5 min-h-12 w-full rounded-full px-4 text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                    submitted
                      ? 'bg-success'
                      : 'bg-accent hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {submitted ? t('submitted') : t('submit')}
                </button>
                <p role="status" className="mt-3 min-h-10 text-sm text-success">
                  {submitted ? t('sent') : ''}
                </p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-accent focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {t('resultLink')}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <div className="rounded-card border border-hairline bg-canvas p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t('className')}</p>
                  <span className="rounded-full bg-block-mint px-3 py-1 text-xs font-medium text-success">
                    {t('steps.2')}
                  </span>
                </div>
                <h3 className="type-h3 mt-5 text-2xl">{t('resultTitle')}</h3>
                <div className="my-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-surface-soft p-4">
                    <p className="tabular text-3xl font-bold">
                      {TOTAL}
                      <span className="text-lg font-normal text-ink-muted"> / {TOTAL}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{t('answered')}</p>
                  </div>
                  <div className="rounded-xl bg-accent-soft p-4">
                    <p className="tabular text-3xl font-bold text-accent">
                      {Math.round((DISTRIBUTION[CORRECT]! / TOTAL) * 100)}%
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{t('correct')}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold">{t('resultBody')}</p>
                <ul className="mt-4 space-y-3" aria-label={t('distribution')}>
                  {DISTRIBUTION.map((n, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-md font-semibold',
                          i === CORRECT ? 'bg-accent text-white' : 'bg-surface-soft',
                        )}
                      >
                        {'ABCD'[i]}
                      </span>
                      <span className="h-6 flex-1 overflow-hidden rounded bg-surface-soft">
                        <span
                          className={cn(
                            'block h-full rounded',
                            i === CORRECT ? 'bg-accent' : 'bg-block-lilac',
                          )}
                          style={{ width: `${(n / TOTAL) * 100}%` }}
                        />
                      </span>
                      <span className="tabular w-20 text-right">
                        {n} · {Math.round((n / TOTAL) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 rounded-xl bg-accent-soft p-4 text-sm leading-relaxed text-ink">
                  {t('review')}
                </p>
              </div>
              <aside className="self-center rounded-[28px] border-[5px] border-ink bg-canvas p-5 shadow-soft">
                <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-ink" aria-hidden="true" />
                <p className="type-eyebrow text-[11px] text-ink-muted">{t('phone')}</p>
                <p className="mt-5 text-base font-semibold">{t('questions.2')}</p>
                <div className="mt-5 space-y-2">
                  {ANSWERS.map((a, i) => (
                    <div
                      key={a}
                      className={cn(
                        'flex items-center justify-between rounded-xl border p-3 text-sm',
                        i === CORRECT ? 'border-success bg-block-mint' : 'border-hairline',
                      )}
                    >
                      <span>
                        {'ABCD'[i]}. {a}
                      </span>
                      {i === CORRECT && (
                        <Check
                          className="size-4 text-success"
                          role="img"
                          aria-label={t('correct')}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-relaxed text-ink-muted">{t('phoneNote')}</p>
              </aside>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
