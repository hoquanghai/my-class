'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Tex } from '@/components/tex';
import { cn } from '@/components/ui/cn';
import { usePrefersReducedMotion } from './use-reduced-motion';

/*
 * Sân khấu demo trong hero: một vòng lặp 6 bước kể lại buổi học.
 *   0 học sinh bắt đầu vào lớp        1 gần đủ lớp
 *   2 câu hỏi mở, đếm ngược           3 học sinh chọn B và nộp
 *   4 công bố: phân bố đáp án         5 bảng xếp hạng + pháo giấy
 * Mọi chuyển động chỉ dùng transform/opacity; giảm chuyển động → đứng yên ở bước 5.
 */
const STEP_MS = [1600, 1500, 2600, 1300, 2200, 2800];
const LAST = STEP_MS.length - 1;

const NAMES = [
  'An',
  'Bình',
  'Châu',
  'Dũng',
  'Hân',
  'Khoa',
  'Linh',
  'My',
  'Nam',
  'Phúc',
  'Quân',
  'Thư',
];
/** Đáp án viết bằng TeX; B đúng: ∫₀¹ 3x² dx = [x³]₀¹ = 1 */
const OPTIONS: [string, string][] = [
  ['A', '0'],
  ['B', '1'],
  ['C', '3'],
  ['D', '\\tfrac{1}{3}'],
];
const DIST = [3, 18, 6, 3];
const BOARD: [string, number][] = [
  ['Nguyễn Văn An', 10],
  ['Trần Thị Bình', 9],
  ['Lê Minh Châu', 9],
];
const SPARKS = [
  ['bg-block-lime', 'left-[8%] top-[10%]', '0ms'],
  ['bg-block-lilac', 'left-[30%] top-[4%]', '120ms'],
  ['bg-block-coral', 'left-[55%] top-[12%]', '240ms'],
  ['bg-block-mint', 'left-[78%] top-[6%]', '80ms'],
  ['bg-block-cream', 'left-[92%] top-[18%]', '200ms'],
];

function useDemoStep(): number {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current = 0;
    const schedule = () => {
      timer = setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          schedule();
          return;
        }
        current = (current + 1) % STEP_MS.length;
        setStep(current);
        schedule();
      }, STEP_MS[current]);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [reduced]);

  // Giảm chuyển động: đứng yên ở bước cuối (trạng thái đầy đủ nhất)
  return reduced ? LAST : step;
}

export function HeroDemo({ className }: { className?: string }) {
  const t = useTranslations('Landing.demo');
  const step = useDemoStep();
  const joined = step === 0 ? 4 : step === 1 ? 9 : NAMES.length;
  const questionOpen = step === 2;
  const submitted = step >= 3;
  const revealed = step >= 4;
  const board = step === LAST;
  const answeredCount = step < 2 ? 0 : step === 2 ? 11 : step === 3 ? 27 : 30;

  return (
    <div className={cn('relative mx-auto aspect-square w-full max-w-[560px]', className)}>
      {/* Hình khối nền trôi nhẹ */}
      <div
        aria-hidden="true"
        className="absolute -left-6 top-10 h-40 w-40 rounded-block bg-block-lilac/70 animate-float"
      />
      <div
        aria-hidden="true"
        className="absolute -right-4 bottom-8 h-32 w-32 rounded-block bg-block-cream animate-float [animation-delay:-3s]"
      />

      {/* Ảnh lớp học dạng polaroid ở phía sau */}
      <div className="absolute right-0 top-0 w-[58%] rotate-3 rounded-card bg-canvas p-2 shadow-soft">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
          <Image
            src="/img/hero-classroom.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 320px, 60vw"
            className="object-cover"
          />
        </div>
      </div>

      {/* Thẻ lớp: học sinh lần lượt vào */}
      <div className="absolute left-0 top-[6%] w-[54%] -rotate-2 rounded-card bg-canvas p-3 shadow-soft">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">{t('className')}</span>
          <span className="tabular rounded-md bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.15em] text-white">
            DEM268
          </span>
        </div>
        <ul className="flex flex-wrap gap-1">
          {NAMES.map((name, i) => (
            <li
              key={name}
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-all duration-300 [transition-timing-function:var(--ease-out-soft)]',
                i < joined
                  ? 'translate-y-0 bg-block-mint text-success opacity-100'
                  : 'translate-y-1 bg-surface-soft text-ink-muted opacity-60',
              )}
              style={{ transitionDelay: `${(i % 5) * 70}ms` }}
            >
              {name}
            </li>
          ))}
        </ul>
        <p className="mt-2 type-eyebrow text-[10px] text-ink-muted" aria-live="polite">
          {t('joined', { count: joined, total: NAMES.length })}
        </p>
      </div>

      {/* Máy chiếu: đếm số trả lời → phân bố → bảng xếp hạng */}
      <div className="absolute bottom-[4%] left-0 w-[64%] rotate-1 overflow-hidden rounded-card bg-block-navy p-4 pr-[30%] text-white shadow-modal">
        {board && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {SPARKS.map(([color, pos, delay]) => (
              <span
                key={pos}
                className={cn('absolute size-2 rounded-[2px] animate-sparkle', color, pos)}
                style={{ animationDelay: delay }}
              />
            ))}
          </div>
        )}
        <div className="mb-2 flex items-center justify-between">
          <span className="type-eyebrow text-[10px] text-white/70">
            {board ? t('board') : t('question', { index: 3, total: 10 })}
          </span>
          {!board && (
            <span className="tabular font-mono text-[10px] text-white/70">
              {t('answered', { count: answeredCount, total: 30 })}
            </span>
          )}
        </div>

        {!board ? (
          <ul className="space-y-1.5">
            {OPTIONS.map(([label], i) => {
              const correct = label === 'B';
              const width = revealed ? `${Math.max(6, (DIST[i]! / 18) * 100)}%` : '0%';
              return (
                <li key={label} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                      revealed && correct ? 'bg-success text-white' : 'bg-white/15 text-white',
                    )}
                  >
                    {label}
                  </span>
                  <span className="h-4 flex-1 overflow-hidden rounded bg-white/10">
                    <span
                      className={cn(
                        'block h-full rounded transition-[width] duration-700 [transition-timing-function:var(--ease-out-soft)]',
                        correct ? 'bg-block-mint' : 'bg-white/40',
                      )}
                      style={{ width }}
                    />
                  </span>
                  <span className="tabular w-5 text-right font-mono text-[10px] text-white/80">
                    {revealed ? DIST[i] : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <ol className="space-y-1.5">
            {BOARD.map(([name, score], i) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-xs animate-pop"
                style={{ animationDelay: `${i * 140}ms` }}
              >
                <span className="w-4 text-center">{['🥇', '🥈', '🥉'][i]}</span>
                <span className="flex-1 truncate font-medium">{name}</span>
                <span className="tabular font-mono text-[10px] text-white/80">{score}/10</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Điện thoại học sinh */}
      <div className="absolute bottom-0 right-[4%] w-[44%] rounded-[28px] border-[5px] border-ink bg-canvas p-3 shadow-modal">
        <div className="mb-2 flex items-center justify-between">
          <span className="type-eyebrow text-[9px] text-ink-muted">
            {step < 2 ? t('waiting') : t('question', { index: 3, total: 10 })}
          </span>
          {questionOpen && <CountdownRing ms={STEP_MS[2]!} />}
          {submitted && !revealed && (
            <span className="rounded bg-block-cream px-1.5 py-0.5 text-[9px] font-semibold text-warning">
              {t('submitted')}
            </span>
          )}
          {revealed && (
            <span className="rounded bg-block-mint px-1.5 py-0.5 text-[9px] font-semibold text-success">
              {t('correct')}
            </span>
          )}
        </div>

        {step < 2 ? (
          <div className="flex h-[132px] flex-col items-center justify-center gap-2 text-center">
            <span className="size-2 rounded-full bg-accent animate-pulse-dot" aria-hidden="true" />
            <p className="text-[11px] text-ink-muted">{t('waitingBody')}</p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[11px] font-semibold leading-snug">
              {t('stem')} <Tex tex={String.raw`\int_0^1 3x^2\,dx`} className="text-[12px]" />
            </p>
            <ul className="space-y-1">
              {OPTIONS.map(([label, text]) => {
                const selected = submitted && label === 'B';
                const correct = revealed && label === 'B';
                return (
                  <li
                    key={label}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-1.5 py-1 text-[11px] transition-all duration-200',
                      correct
                        ? 'border-success bg-block-mint'
                        : selected
                          ? 'scale-[1.02] border-accent bg-accent-soft'
                          : 'border-hairline',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 items-center justify-center rounded text-[9px] font-bold',
                        correct
                          ? 'bg-success text-white'
                          : selected
                            ? 'bg-accent text-white'
                            : 'bg-surface-soft',
                      )}
                    >
                      {label}
                    </span>
                    <span className="flex-1">
                      <Tex tex={text} />
                    </span>
                    {correct && <Check className="size-3 text-success" aria-hidden="true" />}
                  </li>
                );
              })}
            </ul>
            <div
              className={cn(
                'mt-2 h-7 rounded-full text-center text-[11px] font-semibold leading-7 transition-all duration-200',
                submitted ? 'scale-[0.97] bg-ink/60 text-white' : 'bg-ink text-white',
              )}
            >
              {submitted ? t('sent') : t('submit')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Vòng đếm ngược: stroke chạy hết trong đúng thời gian bước 2. */
function CountdownRing({ ms }: { ms: number }) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const r = 8;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex size-6 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="absolute inset-0 -rotate-90">
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-hairline"
          strokeWidth="3"
        />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-accent"
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={started ? c : 0}
          style={{ transition: `stroke-dashoffset ${ms}ms linear` }}
        />
      </svg>
      <span className="tabular font-mono text-[8px] font-bold">18</span>
    </span>
  );
}
