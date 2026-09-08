'use client';

import type { LeaderboardEntry } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/cn';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard({
  entries,
  totalPoints,
  highlightId,
  large,
  limit,
  className,
}: {
  entries: LeaderboardEntry[];
  totalPoints: number;
  highlightId?: string;
  large?: boolean;
  limit?: number;
  className?: string;
}) {
  const t = useTranslations('Runs');
  const rows = limit ? entries.slice(0, limit) : entries;
  return (
    <table className={cn('w-full text-left', large ? 'text-2xl' : 'text-sm', className)}>
      <thead>
        <tr className="text-slate-500">
          <th className="w-14 py-1 font-medium">{t('rank')}</th>
          <th className="py-1 font-medium">{t('name')}</th>
          <th className="py-1 text-right font-medium">{t('score')}</th>
          <th className="hidden py-1 text-right font-medium sm:table-cell">{t('correct')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr
            key={e.studentId}
            className={cn(
              'border-t border-slate-100',
              e.studentId === highlightId && 'bg-brand-50 font-semibold',
            )}
          >
            <td className="py-1.5 tabular-nums">
              {e.rank <= 3 && e.score > 0 ? MEDALS[e.rank - 1] : e.rank}
            </td>
            <td className="py-1.5">{e.name}</td>
            <td className="py-1.5 text-right tabular-nums">
              {e.score}
              <span className="text-slate-400">/{totalPoints}</span>
            </td>
            <td className="hidden py-1.5 text-right tabular-nums sm:table-cell">
              {e.correctCount}/{e.answeredCount}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
