'use client';

import { resetPasswordSchema } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiFetch, errorMessage } from '@/lib/api';
import { type FieldErrors, validate } from '@/lib/forms';

function ResetPasswordForm() {
  const t = useTranslations('Auth');
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const v = validate(resetPasswordSchema, { token, password });
    if (v.errors) {
      if (v.errors.token) setServerError(t('verifyMissingToken'));
      return setErrors(v.errors);
    }
    setErrors({});
    setLoading(true);
    try {
      await apiFetch<{ reset: true }>('/auth/reset-password', { method: 'POST', body: v.data });
      setDone(true);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <h1 className="text-3xl font-bold tracking-[-0.015em] text-ink sm:text-4xl">
        {t('resetTitle')}
      </h1>
      {serverError && <Alert variant="error">{serverError}</Alert>}
      {done ? (
        <Alert variant="success">{t('resetDone')}</Alert>
      ) : (
        <>
          <Field
            label={t('newPassword')}
            htmlFor="password"
            hint={t('passwordHint')}
            error={errors.password}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {t('resetButton')}
          </Button>
        </>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-brand-700 hover:underline">
          {t('backToLogin')}
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
