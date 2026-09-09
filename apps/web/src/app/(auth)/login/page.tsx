'use client';

import { loginSchema, type TeacherDto } from '@lophoc/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { PasswordInput } from '@/components/auth/password-input';
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
        <p className="mt-2 text-sm text-ink-muted sm:text-base">{t('loginHint')}</p>
      </div>

      {serverError && <Alert variant="error">{serverError}</Alert>}

      <SocialButtons />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t('email')} htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            className="h-12"
          />
        </Field>
        <Field label={t('password')} htmlFor="password" error={errors.password}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
        </Field>
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            {t('forgot')}
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full rounded-full" loading={loading}>
          {t('loginButton')}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted">
        {t('noAccount')}{' '}
        <Link
          href="/signup"
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t('signupLink')}
        </Link>
      </p>
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
