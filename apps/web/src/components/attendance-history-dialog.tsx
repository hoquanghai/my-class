'use client';

import type { StudentDto } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { STATUS_STYLES } from '@/components/attendance-status';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';
import { Dialog } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { formatDateTime, percent } from '@/lib/format';
import { useStudentAttendance } from '@/lib/sessions';

export function AttendanceHistoryDialog({
  classId,
  student,
  onClose,
}: {
  classId: string;
  student: StudentDto | null;
  onClose: () => void;
}) {
  const t = useTranslations('Attendance');
  const history = useStudentAttendance(classId, student?.id ?? null);

  return (
    <Dialog
      open={student !== null}
      onClose={onClose}
      title={`${t('historyTitle')} · ${student?.name ?? ''}`}
    >
      {history.isPending ? (
        <div className="flex justify-center py-6 text-slate-400">
          <Spinner className="size-5" />
        </div>
      ) : history.isError ? (
        <Alert variant="error">{errorMessage(history.error)}</Alert>
      ) : history.data ? (
        <div className="space-y-3">
          <p className="font-medium text-slate-800">
            {t('historyRate', {
              present: history.data.rate.present,
              total: history.data.rate.total,
              percent: percent(history.data.rate.present, history.data.rate.total),
            })}
          </p>
          {history.data.items.length === 0 ? (
            <p className="text-sm text-slate-500">{t('historyEmpty', { days: 30 })}</p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {history.data.items.map((item) => (
                <li
                  key={item.sessionId}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="text-slate-700">{formatDateTime(item.startedAt)}</span>
                  <span className="flex items-center gap-2">
                    {item.note && <span className="text-xs text-slate-500">{item.note}</span>}
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-xs font-semibold',
                        STATUS_STYLES[item.status].chip,
                      )}
                    >
                      {t(`status.${item.status}`)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {history.data.hiddenCount > 0 && (
            <p className="text-xs text-slate-500">
              {t('historyHidden', { count: history.data.hiddenCount })}
            </p>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
