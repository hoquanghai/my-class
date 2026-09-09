import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LeaderboardMock } from '@/components/marketing/mocks';
import { Eyebrow, StickyNote } from '@/components/marketing/primitives';

/**
 * Khung trang xác thực: cột form trên nền trắng, cột phải là khối lilac (ngân hàng câu hỏi)
 * chỉ hiện từ 1024px. Học sinh đi lạc vào đây có đường về /join.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('Auth');
  const tc = useTranslations('Common');
  return (
    <div className="grid min-h-dvh lg:grid-cols-12">
      <div className="flex flex-col px-4 py-6 sm:px-8 lg:col-span-6 lg:px-12 xl:col-span-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-ink">
            {tc('appName')}
          </Link>
          <Link href="/" className="text-sm font-medium text-ink-muted hover:text-ink">
            {t('backHome')}
          </Link>
        </div>

        <div className="flex flex-1 items-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <p className="text-sm text-ink-muted">
          {t('studentHint')}{' '}
          <Link href="/join" className="font-medium text-accent underline-offset-4 hover:underline">
            {t('studentLink')}
          </Link>
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-block-lilac lg:col-span-6 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:col-span-7">
        <div>
          <Eyebrow>{t('panelEyebrow')}</Eyebrow>
          <p className="mt-4 max-w-md text-balance text-3xl font-bold leading-tight tracking-[-0.015em] text-ink xl:text-4xl">
            {t('panelTitle')}
          </p>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink">{t('panelBody')}</p>
        </div>
        <div className="relative mt-10 h-64">
          <StickyNote tone="white" rotate={-3} className="absolute left-0 top-4 w-64">
            <LeaderboardMock />
          </StickyNote>
          <StickyNote tone="cream" rotate={2} className="absolute left-56 top-24 w-56">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em]">
              {t('panelNoteTitle')}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">{t('panelNoteBody')}</p>
          </StickyNote>
        </div>
      </aside>
    </div>
  );
}
