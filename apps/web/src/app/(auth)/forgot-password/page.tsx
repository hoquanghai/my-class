'use client';

import { forgotPasswordSchema } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiFetch, errorMessage } from '@/lib/api';
import { type FieldErrors, validate } from '@/lib/forms';

export default function ForgotPasswordPage() {
  const t = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const v = validate(forgotPasswordSchema, { email });
    if (v.errors) return setErrors(v.errors);
    setErrors({});
    setLoading(true);
    try {
      await apiFetch<void>('/auth/forgot-password', { method: 'POST', body: v.data });
      setSent(true);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <h1 className="type-h2 text-ink">{t('forgotTitle')}</h1>
      <p className="text-sm text-slate-600">{t('forgotHint')}</p>
      {serverError && <Alert variant="error">{serverError}</Alert>}
      {sent ? (
        <Alert variant="success">{t('forgotSent')}</Alert>
      ) : (
        <>
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
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {t('forgotButton')}
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
