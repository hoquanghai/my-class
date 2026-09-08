'use client';

import type { ClassDetailDto, SessionSummaryDto } from '@lophoc/shared';
import { Lock, Play, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STATUS_ORDER, STATUS_STYLES } from '@/components/attendance-status';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useSessions, useStartSession } from '@/lib/sessions';

function SessionRow({ session }: { session: SessionSummaryDto }) {
  const t = useTranslations('Sessions');
  const ta = useTranslations('Attendance');
  const active = session.status === 'active';
  return (
    <Link
      href={`/app/sessions/${session.id}`}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 transition hover:border-brand-500',
        active ? 'border-brand-300' : 'border-slate-200',
      )}
    >
      <div>
        <p className="font-medium text-slate-900">{formatDateTime(session.startedAt)}</p>
        <p className="text-sm">
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-xs font-semibold',
              active ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600',
            )}
          >
            {active ? t('active') : t('ended')}
          </span>
          {session.hasFeedback && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600">
              <Star className="size-3 fill-current" /> {t('feedbackGiven')}
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {STATUS_ORDER.map((s) => (
          <span key={s} className={cn('rounded-md px-2 py-1 font-medium', STATUS_STYLES[s].chip)}>
            {ta(`status.${s}`)} {session.summary[s]}
          </span>
        ))}
      </div>
    </Link>
  );
}

export function SessionsTab({ klass }: { klass: ClassDetailDto }) {
  const t = useTranslations('Sessions');
  const router = useRouter();
  const sessions = useSessions(klass.id);
  const start = useStartSession(klass.id);
  const active = sessions.data?.sessions.find((s) => s.status === 'active');

  async function onStart() {
    const detail = await start.mutateAsync();
    router.push(`/app/sessions/${detail.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{klass.studentCount > 0 ? null : t('needRoster')}</p>
        <Button
          onClick={onStart}
          loading={start.isPending}
          disabled={klass.studentCount === 0}
          size="lg"
        >
          <Play className="size-4" />
          {active ? t('continue') : t('start')}
        </Button>
      </div>

      {start.isError && <Alert variant="error">{errorMessage(start.error)}</Alert>}
      {sessions.isError && <Alert variant="error">{errorMessage(sessions.error)}</Alert>}

      {sessions.isPending ? (
        <div className="flex justify-center py-8 text-slate-400">
          <Spinner className="size-6" />
        </div>
      ) : sessions.data && sessions.data.sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {t('empty')}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.data?.sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </div>
      )}

      {sessions.data && sessions.data.hiddenCount > 0 && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Lock className="size-4" />
          {t('hidden', { count: sessions.data.hiddenCount, days: sessions.data.historyDays })}
        </p>
      )}
    </div>
  );
}
