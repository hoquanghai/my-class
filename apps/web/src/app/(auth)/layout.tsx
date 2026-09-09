import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LeaderboardMock } from '@/components/marketing/mocks';
import { Eyebrow, StickyNote } from '@/components/marketing/primitives';

/**
 * Khung trang xác thực (DESIGN.md §6): hai cột bằng nhau từ 1024px.
 * Cột trái: form gói trong bề rộng 420px, căn giữa cả hai chiều để cân trên màn hình rộng.
 * Cột phải: khối lilac (ngân hàng câu hỏi) với ảnh lớp học và giấy nhớ; ẩn dưới 1024px.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('Auth');
  const tc = useTranslations('Common');
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight text-ink">
              {tc('appName')}
            </Link>
            <Link href="/" className="text-sm font-medium text-ink-muted hover:text-ink">
              {t('backHome')}
            </Link>
          </div>

          <div className="flex flex-1 items-center py-10">
            <div className="w-full">{children}</div>
          </div>
        </div>
      </div>

      <aside className="hidden items-center justify-center bg-block-lilac p-12 lg:flex xl:p-16">
        <div className="w-full max-w-xl">
          <Eyebrow>{t('panelEyebrow')}</Eyebrow>
          <p className="type-h2 mt-4 max-w-md text-ink">{t('panelTitle')}</p>
          <p className="type-lead mt-4 max-w-md text-ink">{t('panelBody')}</p>

          <div className="relative mt-12 mb-8">
            <div className="relative aspect-[3/2] overflow-hidden rounded-block bg-canvas/40">
              <Image
                src="/img/hero-classroom.webp"
                alt=""
                fill
                sizes="(min-width: 1280px) 576px, 50vw"
                className="object-cover"
              />
            </div>
            <StickyNote tone="white" rotate={-3} className="absolute -bottom-6 left-4 w-60">
              <LeaderboardMock />
            </StickyNote>
            <StickyNote tone="cream" rotate={2} className="absolute -top-5 right-4 w-56">
              <p className="type-eyebrow text-[11px]">{t('panelNoteTitle')}</p>
              <p className="mt-1.5 text-sm font-medium text-ink">{t('panelNoteBody')}</p>
            </StickyNote>
          </div>
        </div>
      </aside>
    </div>
  );
}
