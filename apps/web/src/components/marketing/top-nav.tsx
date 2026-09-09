'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/components/ui/cn';
import { PillLink } from './primitives';

export function TopNav() {
  const t = useTranslations('Landing.nav');
  const tc = useTranslations('Common');
  const [open, setOpen] = useState(false);
  const links = [
    { href: '#tinh-nang', label: t('features') },
    { href: '#cach-dung', label: t('howItWorks') },
    { href: '#hoc-sinh', label: t('students') },
    { href: '#faq', label: t('faq') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-hairline-soft bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-ink">
          {tc('appName')}
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t('primary')}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-ink hover:bg-surface-soft"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink hover:bg-surface-soft sm:inline-flex"
          >
            {t('login')}
          </Link>
          <PillLink
            href="/join"
            variant="secondary"
            className="hidden h-10 px-4 text-sm md:inline-flex"
          >
            {t('studentJoin')}
          </PillLink>
          <PillLink href="/signup" className="h-10 px-4 text-sm">
            {t('cta')}
          </PillLink>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-soft lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? tc('close') : t('menu')}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn('border-t border-hairline-soft bg-canvas lg:hidden', !open && 'hidden')}
      >
        <nav className="mx-auto flex max-w-6xl flex-col px-4 py-3" aria-label={t('primary')}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-surface-soft"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-hairline-soft pt-3 sm:flex-row">
            <PillLink href="/join" variant="secondary" className="w-full sm:w-auto">
              {t('studentJoin')}
            </PillLink>
            <PillLink href="/login" variant="secondary" className="w-full sm:hidden">
              {t('login')}
            </PillLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
