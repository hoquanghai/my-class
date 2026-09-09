'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/components/ui/cn';
import { PillLink } from './primitives';

const SECTIONS = ['tinh-nang', 'cach-dung', 'hoc-sinh', 'faq'] as const;
type SectionId = (typeof SECTIONS)[number];

/** Theo dõi section đang ở giữa màn hình để tô đậm mục menu tương ứng. */
function useActiveSection(): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Map<SectionId, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.id as SectionId;
          if (e.isIntersecting) visible.set(id, e.intersectionRatio);
          else visible.delete(id);
        }
        let best: SectionId | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setActive(best);
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: [0, 0.1, 0.25, 0.5] },
    );
    for (const id of SECTIONS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  return active;
}

export function TopNav() {
  const t = useTranslations('Landing.nav');
  const tc = useTranslations('Common');
  const [open, setOpen] = useState(false);
  const active = useActiveSection();
  const links: { id: SectionId; label: string }[] = [
    { id: 'tinh-nang', label: t('features') },
    { id: 'cach-dung', label: t('howItWorks') },
    { id: 'hoc-sinh', label: t('students') },
    { id: 'faq', label: t('faq') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-hairline-soft bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-ink">
          {tc('appName')}
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full bg-surface-soft p-1 lg:flex"
          aria-label={t('primary')}
        >
          {links.map((l) => {
            const isActive = active === l.id;
            return (
              <a
                key={l.id}
                href={`#${l.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'rounded-full px-4 py-2 text-[15px] font-semibold transition-colors duration-200',
                  isActive ? 'bg-ink text-white' : 'text-ink hover:bg-canvas hover:shadow-soft',
                )}
              >
                {l.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-[15px] font-semibold text-ink hover:bg-surface-soft sm:inline-flex"
          >
            {t('login')}
          </Link>
          <PillLink href="/signup" className="h-10 px-5 text-[15px]">
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
              key={l.id}
              href={`#${l.id}`}
              onClick={() => setOpen(false)}
              aria-current={active === l.id ? 'true' : undefined}
              className={cn(
                'rounded-lg px-3 py-3 text-base font-semibold text-ink hover:bg-surface-soft',
                active === l.id && 'bg-surface-soft',
              )}
            >
              {l.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-hairline-soft pt-3 sm:hidden">
            <PillLink href="/login" variant="secondary" className="w-full">
              {t('login')}
            </PillLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
