'use client';

import { loginSchema, type TeacherDto } from '@lophoc/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.015em] text-ink sm:text-4xl">
          {t('loginTitle')}
        </h1>
        <p className="mt-2 text-base text-ink-muted">{t('loginHint')}</p>
      </div>
      {serverError && <Alert variant="error">{serverError}</Alert>}

      <Field label={t('email')} htmlFor="email" error={errors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          className="h-12"
        />
      </Field>
      <Field label={t('password')} htmlFor="password" error={errors.password}>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            className="h-12 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            aria-pressed={showPassword}
            className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-soft hover:text-ink"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </Field>

      <Button
        type="submit"
        size="lg"
        className="w-full rounded-full bg-ink hover:bg-ink/85 disabled:bg-ink/50"
        loading={loading}
      >
        {t('loginButton')}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="text-accent underline-offset-4 hover:underline">
          {t('forgot')}
        </Link>
        <span className="text-ink-muted">
          {t('noAccount')}{' '}
          <Link
            href="/signup"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            {t('signupLink')}
          </Link>
        </span>
      </div>

      {providers.data?.google && (
        <>
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.08em] text-ink-muted">
            <span className="h-px flex-1 bg-hairline" />
            {t('or')}
            <span className="h-px flex-1 bg-hairline" />
          </div>
          <a
            href={apiUrl('/auth/google')}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-hairline font-semibold text-ink hover:bg-surface-soft"
          >
            <GoogleIcon />
            {t('google')}
          </a>
          <p className="text-center text-xs text-ink-muted">{t('googleTermsNote')}</p>
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
