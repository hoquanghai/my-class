'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';
import { Spinner } from '@/components/ui/spinner';
import { ApiError, errorMessage } from '@/lib/api';
import { useJoinInfo, usePickName } from '@/lib/student';

export default function PickNamePage() {
  const { code } = useParams<{ code: string }>();
  const t = useTranslations('Student');
  const router = useRouter();
  const info = useJoinInfo(code);
  const pick = usePickName(code);
  const [picking, setPicking] = useState<string | null>(null);

  async function choose(studentId: string) {
    setPicking(studentId);
    try {
      await pick.mutateAsync(studentId);
      router.replace('/s');
    } catch {
      setPicking(null);
    }
  }

  if (info.isPending) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (info.isError || !info.data) {
    return (
      <div className="space-y-4 pt-10">
        <Alert variant="error">
          {info.error instanceof ApiError && info.error.status === 404
            ? t('invalidCode')
            : errorMessage(info.error)}
        </Alert>
        <Link href="/join" className="block text-center text-brand-700 underline">
          {t('joinTitle')}
        </Link>
      </div>
    );
  }

  const { class: klass, students } = info.data;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">{t('pickTitle')}</h1>
        <p className="mt-1 text-slate-600">{t('pickHint', { name: klass.name })}</p>
      </div>
      {pick.isError && <Alert variant="error">{errorMessage(pick.error)}</Alert>}
      <ul className="grid grid-cols-2 gap-2">
        {students.map((s) => {
          const blocked = klass.rosterLocked && s.bound;
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={blocked || picking !== null}
                onClick={() => choose(s.id)}
                className={cn(
                  'flex min-h-16 w-full items-center justify-center rounded-xl border-2 px-2 text-center text-lg font-medium transition',
                  blocked
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-slate-200 bg-white text-slate-900 active:scale-[0.98] hover:border-brand-500',
                  picking === s.id && 'border-brand-600 bg-brand-50',
                )}
              >
                <span>
                  {picking === s.id ? <Spinner className="mx-auto size-5" /> : s.name}
                  {blocked && <span className="block text-xs font-normal">{t('bound')}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
