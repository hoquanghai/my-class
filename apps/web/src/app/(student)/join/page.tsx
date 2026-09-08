'use client';

import { normalizeClassCode } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getStudentToken } from '@/lib/student';

export default function JoinPage() {
  const t = useTranslations('Student');
  const tc = useTranslations('Common');
  const router = useRouter();
  const [code, setCode] = useState('');

  // Thiết bị đã gắn tên → vào thẳng phòng
  useEffect(() => {
    if (getStudentToken()) router.replace('/s');
  }, [router]);

  return (
    <form
      className="space-y-6 pt-10"
      onSubmit={(e) => {
        e.preventDefault();
        const normalized = normalizeClassCode(code);
        if (normalized.length >= 4) router.push(`/join/${normalized}`);
      }}
    >
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          {tc('appName')}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{t('joinTitle')}</h1>
        <p className="mt-2 text-slate-600">{t('joinHint')}</p>
      </div>
      <Input
        aria-label={t('joinTitle')}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder={t('codePlaceholder')}
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={8}
        className="h-16 text-center font-mono text-3xl tracking-[0.3em]"
        autoFocus
      />
      <Button type="submit" size="lg" className="w-full" disabled={code.trim().length < 4}>
        {t('joinButton')}
      </Button>
    </form>
  );
}
