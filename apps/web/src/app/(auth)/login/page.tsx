'use client';

import { loginSchema, type TeacherDto } from '@lophoc/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiFetch, apiUrl, errorMessage } from '@/lib/api';
import { ME_QUERY_KEY, useAuthProviders } from '@/lib/auth';
import { type FieldErrors, validate } from '@/lib/forms';

function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/app/classes';
}

function LoginForm() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const providers = useAuthProviders();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(
    params.get('error') === 'google' ? t('googleError') : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const v = validate(loginSchema, { email, password });
    if (v.errors) return setErrors(v.errors);
    setErrors({});
    setLoading(true);
    try {
      const res = await apiFetch<{ teacher: TeacherDto }>('/auth/login', {
        method: 'POST',
        body: v.data,
      });
      queryClient.setQueryData(ME_QUERY_KEY, res.teacher);
      router.replace(safeNext(params.get('next')));
    } catch (err) {
      setServerError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <h1 className="text-xl font-semibold text-slate-900">{t('loginTitle')}</h1>
      {serverError && <Alert variant="error">{serverError}</Alert>}

      <Field label={t('email')} htmlFor="email" error={errors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
      </Field>
      <Field label={t('password')} htmlFor="password" error={errors.password}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {t('loginButton')}
      </Button>

      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">
          {t('forgot')}
        </Link>
        <span className="text-slate-600">
          {t('noAccount')}{' '}
          <Link href="/signup" className="font-medium text-brand-700 hover:underline">
            {t('signupLink')}
          </Link>
        </span>
      </div>

      {providers.data?.google && (
        <>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            {t('or')}
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <a
            href={apiUrl('/auth/google')}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 font-medium text-slate-800 hover:bg-slate-50"
          >
            <GoogleIcon />
            {t('google')}
          </a>
          <p className="text-center text-xs text-slate-500">{t('googleTermsNote')}</p>
        </>
      )}
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
