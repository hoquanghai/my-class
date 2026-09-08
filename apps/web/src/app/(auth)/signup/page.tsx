'use client';

import { signupSchema, type TeacherDto } from '@lophoc/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
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
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <h1 className="text-xl font-semibold text-slate-900">{t('signupTitle')}</h1>
      {serverError && <Alert variant="error">{serverError}</Alert>}

      <Field label={t('name')} htmlFor="name" error={errors.name}>
        <Input
          id="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
      </Field>
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
      <Field
        label={t('password')}
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

      <div className="space-y-1">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-slate-300"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <span>
            {t.rich('acceptTerms', {
              terms: (chunks) => (
                <Link href="/terms" className="text-brand-700 hover:underline" target="_blank">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/privacy" className="text-brand-700 hover:underline" target="_blank">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="text-sm text-red-600" role="alert">
            {errors.acceptTerms}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {t('signupButton')}
      </Button>

      <p className="text-center text-sm text-slate-600">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          {t('loginLink')}
        </Link>
      </p>
    </form>
  );
}
