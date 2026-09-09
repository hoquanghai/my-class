'use client';

import { loginSchema, type TeacherDto } from '@lophoc/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { OrDivider, SocialButtons } from '@/components/auth/social-buttons';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiFetch, errorMessage } from '@/lib/api';
import { ME_QUERY_KEY } from '@/lib/auth';
import { type FieldErrors, validate } from '@/lib/forms';

function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/app/classes';
}

function LoginForm() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const oauthError = params.get('error');
  const [serverError, setServerError] = useState<string | null>(
    oauthError === 'google'
      ? t('googleError')
      : oauthError === 'facebook'
        ? t('facebookError')
        : null,
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
    <div className="space-y-6">
      <div>
        <h1 className="type-h2 text-ink">{t('loginTitle')}</h1>
        <p className="mt-2 text-base text-ink-muted">{t('loginHint')}</p>
      </div>

      {serverError && <Alert variant="error">{serverError}</Alert>}

      <SocialButtons />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
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

        <Button type="submit" size="lg" className="w-full rounded-full" loading={loading}>
          {t('loginButton')}
        </Button>
      </form>

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
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
