'use client';

import type { QuestionResult } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { MarkdownLatex } from '@/components/markdown-latex';
import { cn } from '@/components/ui/cn';

/** Phân bố lựa chọn + ai đúng sau khi đóng câu. */
export function ResultPanel({
  result,
  large,
  className,
}: {
  result: QuestionResult;
  large?: boolean;
  className?: string;
}) {
  const t = useTranslations('Runs');
  const max = Math.max(1, ...result.distribution.map((d) => d.count));
  return (
    <div className={cn('space-y-4', className)}>
      {result.distribution.length > 0 && (
        <ul className="space-y-2">
          {result.distribution.map((d) => {
            const correct = result.correctOptionIds.includes(d.optionId);
            return (
              <li key={d.optionId} className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg font-bold',
                    correct ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-700',
                  )}
                >
                  {d.label}
                </span>
                <div className="h-8 flex-1 overflow-hidden rounded-lg bg-slate-100">
                  <div
                    className={cn(
                      'flex h-full items-center justify-end rounded-lg px-2 text-sm font-semibold text-white transition-[width] duration-500',
                      correct ? 'bg-green-500' : 'bg-slate-400',
                    )}
                    style={{ width: `${Math.max(d.count > 0 ? 8 : 0, (d.count / max) * 100)}%` }}
                  >
                    {d.count > 0 && d.count}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {result.acceptedAnswers.length > 0 && (
        <p className={cn('text-green-800', large ? 'text-2xl' : 'text-sm')}>
          {t('acceptedAnswers')}: <strong>{result.acceptedAnswers.join(' / ')}</strong>
        </p>
      )}
      <div>
        <p className={cn('font-semibold text-slate-700', large ? 'text-xl' : 'text-sm')}>
          {result.correctStudentNames.length > 0
            ? t('correctNames', { count: result.correctStudentNames.length })
            : t('noCorrect')}
        </p>
        {result.correctStudentNames.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {result.correctStudentNames.map((n) => (
              <span
                key={n}
                className={cn(
                  'rounded-md bg-green-50 px-2 py-0.5 text-green-900',
                  large ? 'text-lg' : 'text-sm',
                )}
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </div>
      {result.explanationMd && (
        <details className={cn('text-slate-700', large ? 'text-xl' : 'text-sm')} open={large}>
          <summary className="cursor-pointer select-none font-medium">{t('explanation')}</summary>
          <MarkdownLatex className="mt-1">{result.explanationMd}</MarkdownLatex>
        </details>
      )}
    </div>
  );
}
