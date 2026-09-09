import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LeaderboardMock } from '@/components/marketing/mocks';
import { Eyebrow } from '@/components/marketing/primitives';

/**
 * Khung trang xác thực theo ngôn ngữ trang chủ: nền xám nhạt, thẻ form trắng ở giữa,
 * từ 1024px thêm cột quyền lợi gói miễn phí trên nền navy. Mobile chỉ có thẻ form và
 * một hàng chip quyền lợi ngắn bên dưới.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('Auth');
  const tp = useTranslations('Landing.pricing');
  const tc = useTranslations('Common');
  const items = [0, 1, 2, 3, 4].map((i) => tp(`items.${i}`));

  return (
    <div className="flex min-h-dvh flex-col bg-surface-soft">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-ink">
          {tc('appName')}
        </Link>
        <Link
          href="/"
          className="rounded-full px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-canvas hover:text-ink"
        >
          {t('backHome')}
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-10">
        <section className="mx-auto w-full max-w-md rounded-card border border-hairline bg-canvas p-5 shadow-soft sm:p-8">
          {children}
        </section>

        <aside className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="hidden rounded-block bg-block-navy p-8 text-white lg:block xl:p-10">
            <Eyebrow className="text-white/70">{tp('eyebrow')}</Eyebrow>
            <p className="type-h2 mt-3 max-w-[18ch]">{tp('title')}</p>
            <p className="type-body mt-4 max-w-md text-white/85">{tp('body')}</p>
            <ul className="mt-6 space-y-3">
              {items.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-white/90">
                  <Check className="mt-0.5 size-4 shrink-0 text-block-lime" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-4">
              <div>
                <p className="text-5xl font-bold tracking-tight">{tp('price')}</p>
                <p className="mt-1 text-sm text-white/70">{tp('unit')}</p>
              </div>
              <div className="min-w-56 flex-1 rounded-card bg-canvas p-4 text-ink shadow-soft">
                <LeaderboardMock />
                <p className="mt-2 text-[11px] text-ink-muted">{t('panelSample')}</p>
              </div>
            </div>
          </div>

          <ul className="flex flex-wrap justify-center gap-2 text-xs text-ink-muted lg:hidden">
            {items.slice(0, 3).map((item) => (
              <li key={item} className="rounded-full border border-hairline bg-canvas px-3 py-1.5">
                {item}
              </li>
            ))}
            <li className="rounded-full border border-hairline bg-canvas px-3 py-1.5">
              {tp('price')} · {tp('unit')}
            </li>
          </ul>
        </aside>
      </main>
    </div>
  );
}
