'use client';

import { BookOpen, ClipboardList, LogOut, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Spinner } from '@/components/ui/spinner';
import { apiFetch } from '@/lib/api';
import { useLogout, useMe } from '@/lib/auth';

function VerifyBanner() {
  const t = useTranslations('Auth');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm text-amber-900">
        <span>{state === 'sent' ? t('resent') : t('unverifiedBanner')}</span>
        {state !== 'sent' && (
          <Button
            size="sm"
            variant="secondary"
            loading={state === 'sending'}
            onClick={async () => {
              setState('sending');
              try {
                await apiFetch<void>('/auth/resend-verification', { method: 'POST' });
                setState('sent');
              } catch {
                setState('idle');
              }
            }}
          >
            {t('resend')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('Shell');
  const tc = useTranslations('Common');
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const logout = useLogout();

  useEffect(() => {
    if (me.isError) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [me.isError, router, pathname]);

  if (me.isPending || me.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        <Spinner className="size-6" />
      </div>
    );
  }

  const nav = [
    { href: '/app/classes', label: t('classes'), icon: Users, enabled: true },
    { href: '/app/questions', label: t('questions'), icon: BookOpen, enabled: true },
    { href: '/app/quizzes', label: t('quizzes'), icon: ClipboardList, enabled: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/app/classes" className="text-lg font-bold text-brand-700">
              {tc('appName')}
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {nav.map((item) =>
                item.enabled ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                      pathname.startsWith(item.href)
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                ) : (
                  <span
                    key={item.href}
                    title={tc('comingSoon')}
                    className="flex cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-400"
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </span>
                ),
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-700 sm:inline">{me.data.name}</span>
            <Button
              variant="ghost"
              size="sm"
              loading={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, { onSettled: () => router.replace('/login') })
              }
            >
              <LogOut className="size-4" />
              {tc('logout')}
            </Button>
          </div>
        </div>
      </header>

      {!me.data.emailVerified && <VerifyBanner />}

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      {logout.isError && (
        <div className="fixed bottom-4 right-4">
          <Alert variant="error">{tc('errorGeneric')}</Alert>
        </div>
      )}
    </div>
  );
}
