'use client';

import type { StudentLimitDetails } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

/** `details` của lỗi LIMIT_STUDENTS có đủ số liệu để hiện hộp thoại lựa chọn. */
export function isStudentLimitDetails(value: unknown): value is StudentLimitDetails {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  return (
    (d.scope === 'teacher' || d.scope === 'class') &&
    typeof d.limit === 'number' &&
    typeof d.current === 'number' &&
    typeof d.requested === 'number' &&
    typeof d.remaining === 'number'
  );
}

/**
 * Nhập quá giới hạn gói miễn phí: chọn nâng cấp gói, hoặc chỉ nhập số học sinh còn chỗ.
 * Hết chỗ hoàn toàn thì chỉ còn nâng cấp.
 */
export function RosterLimitDialog({
  details,
  fitting,
  onFit,
  onClose,
}: {
  details: StudentLimitDetails | null;
  fitting: boolean;
  onFit: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('Roster');
  const tc = useTranslations('Common');
  const router = useRouter();
  if (!details) return null;
  const canFit = details.remaining > 0;
  const { limit, current, requested, remaining } = details;

  return (
    <Dialog open onClose={onClose} title={t('limitTitle')}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink">
          {t(details.scope === 'teacher' ? 'limitBodyTeacher' : 'limitBodyClass', {
            limit,
            current,
            requested,
          })}
        </p>
        <p className="text-sm font-medium text-ink">
          {canFit ? t('limitRemaining', { remaining }) : t('limitFull')}
        </p>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={fitting}>
            {tc('cancel')}
          </Button>
          {canFit && (
            <Button variant="secondary" loading={fitting} onClick={onFit}>
              {t('limitFit', { remaining })}
            </Button>
          )}
          <Button onClick={() => router.push('/app/upgrade')} disabled={fitting}>
            {t('limitUpgrade')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
