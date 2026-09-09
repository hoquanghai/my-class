'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { apiFetch } from '@/lib/api';
import { ME_QUERY_KEY } from '@/lib/auth';

type Status = 'verifying' | 'ok' | 'failed' | 'missing';

function VerifyEmail() {
  const t = useTranslations('Auth');
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'missing');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<{ verified: true }>('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => {
        if (cancelled) return;
        setStatus('ok');
        void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [token, queryClient]);

  return (
    <div className="space-y-5">
      <h1 className="type-h2 text-ink">{t('verifyTitle')}</h1>
      {status === 'verifying' && (
        <div className="flex items-center gap-3 text-slate-600">
          <Spinner className="size-5" /> {t('verifying')}
        </div>
      )}
      {status === 'ok' && <Alert variant="success">{t('verified')}</Alert>}
      {status === 'failed' && <Alert variant="error">{t('verifyFailed')}</Alert>}
      {status === 'missing' && <Alert variant="warning">{t('verifyMissingToken')}</Alert>}
      <Link
        href="/app/classes"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 font-medium text-white hover:bg-brand-700"
      >
        {t('goToApp')}
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
