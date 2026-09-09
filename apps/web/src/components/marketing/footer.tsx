import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function Footer() {
  const t = useTranslations('Landing.footer');
  const tc = useTranslations('Common');
  return (
    <footer className="border-t border-hairline-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="text-2xl font-bold tracking-tight text-ink">{tc('appName')}</p>
          <p className="mt-1 max-w-xs text-sm text-ink-muted">{t('tagline')}</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm" aria-label={t('links')}>
          <Link href="/login" className="text-ink hover:underline">
            {t('login')}
          </Link>
          <Link href="/terms" className="text-ink hover:underline">
            {t('terms')}
          </Link>
          <Link href="/privacy" className="text-ink hover:underline">
            {t('privacy')}
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <p className="font-mono text-xs tracking-[0.05em] text-ink-muted">
          {t('copyright', { year: new Date().getFullYear() })} · {t('contact')}
        </p>
      </div>
    </footer>
  );
}
