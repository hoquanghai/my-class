'use client';

import { useTranslations } from 'next-intl';
import { CopyButton } from '@/components/copy-button';
import { cn } from '@/components/ui/cn';
import { apiUrl } from '@/lib/api';
import { studentJoinDisplay, studentJoinUrl } from '@/lib/student-origin';

/**
 * Cách học sinh vào làm bài: mã lớp, link ngắn trên tên miền học sinh và mã QR.
 * Dùng ở trang buổi học và trang điều khiển bài kiểm tra; học sinh vào một lần,
 * điểm danh và bài kiểm tra đang mở tự hiện trên máy các em.
 */
export function JoinPanel({
  classId,
  classCode,
  participants,
  compact,
}: {
  classId: string;
  classCode: string;
  /** Số học sinh đã vào phòng (trang bài kiểm tra). */
  participants?: number;
  /** Bản gọn khi bài kiểm tra đang diễn ra. */
  compact?: boolean;
}) {
  const t = useTranslations('Join');
  const url = studentJoinUrl(classCode);
  return (
    <section
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white',
        compact ? 'p-3' : 'p-5',
      )}
      aria-label={t('title')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh PNG từ API, cần cookie */}
      <img
        src={`${apiUrl(`/classes/${classId}/qr.png`)}?v=${classCode}`}
        alt={t('qrAlt', { code: classCode })}
        className={cn(
          'shrink-0 rounded-md border border-slate-100',
          compact ? 'size-24' : 'size-40',
        )}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-semibold text-slate-800">{t('title')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-md bg-slate-900 px-3 py-1 font-mono font-bold tracking-[0.3em] text-white',
              compact ? 'text-lg' : 'text-2xl',
            )}
          >
            {classCode}
          </span>
          <span className="font-mono text-base text-slate-800">
            {studentJoinDisplay(classCode)}
          </span>
          <CopyButton text={url} label={t('copyLink')} />
        </div>
        <p className="text-sm text-slate-600">{t('steps')}</p>
        {participants !== undefined && (
          <p className="text-sm font-medium text-slate-700">
            {t('joined', { count: participants })}
          </p>
        )}
      </div>
    </section>
  );
}
