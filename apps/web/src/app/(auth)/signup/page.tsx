'use client';

import { signupSchema, type TeacherDto } from '@lophoc/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { PasswordInput } from '@/components/auth/password-input';
import { OrDivider, SocialButtons } from '@/components/auth/social-buttons';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiFetch, errorMessage } from '@/lib/api';
import { ME_QUERY_KEY } from '@/lib/auth';
import { type FieldErrors, validate } from '@/lib/forms';

export default function SignupPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const v = validate(signupSchema, { name, email, password, acceptTerms });
    if (v.errors) return setErrors(v.errors);
    setErrors({});
    setLoading(true);
    try {
      const res = await apiFetch<{ teacher: TeacherDto }>('/auth/signup', {
        method: 'POST',
        body: v.data,
      });
      queryClient.setQueryData(ME_QUERY_KEY, res.teacher);
      router.replace('/app/classes');
    } catch (err) {
      setServerError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="type-h2 text-ink">{t('signupTitle')}</h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">{t('signupHint')}</p>
      </div>

      {serverError && <Alert variant="error">{serverError}</Alert>}

      <SocialButtons />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t('name')} htmlFor="name" error={errors.name}>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
            className="h-12"
          />
        </Field>
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
        <Field
          label={t('password')}
          htmlFor="password"
          hint={t('passwordHint')}
          error={errors.password}
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
        </Field>

        <div className="space-y-1">
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 rounded border-hairline accent-accent"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span>
              {t.rich('acceptTerms', {
                terms: (chunks) => (
                  <Link
                    href="/terms"
                    className="font-medium text-accent underline-offset-4 hover:underline"
                    target="_blank"
                  >
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link
                    href="/privacy"
                    className="font-medium text-accent underline-offset-4 hover:underline"
                    target="_blank"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-sm text-danger" role="alert">
              {errors.acceptTerms}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full rounded-full" loading={loading}>
          {t('signupButton')}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted">
        {t('haveAccount')}{' '}
        <Link
          href="/login"
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t('loginLink')}
        </Link>
      </p>
    </div>
  );
}
