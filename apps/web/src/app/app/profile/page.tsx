'use client';

import {
  changePasswordSchema,
  SUBJECT_LABELS,
  SUBJECTS,
  type Subject,
  TEACHING_LEVEL_LABELS,
  TEACHING_LEVELS,
  type TeacherDto,
  type TeachingLevel,
  updateProfileSchema,
} from '@lophoc/shared';
import { BadgeCheck, Camera, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useRef, useState } from 'react';
import { Avatar } from '@/components/account-menu';
import { PasswordInput } from '@/components/auth/password-input';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { type FieldErrors, validate } from '@/lib/forms';
import {
  useChangePassword,
  useRemoveAvatar,
  useUpdateProfile,
  useUploadAvatar,
} from '@/lib/teachers';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-hairline bg-canvas p-5 sm:p-6">
      <h2 className="type-h3 mb-4 text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Chip({
  active,
  onToggle,
  children,
}: {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'min-h-10 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-hairline bg-canvas text-ink hover:bg-surface-soft',
      )}
    >
      {children}
    </button>
  );
}

function AvatarCard({ teacher }: { teacher: TeacherDto }) {
  const t = useTranslations('Profile');
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > 2 * 1024 * 1024) {
      setError(t('avatarTooBig'));
      return;
    }
    try {
      await upload.mutateAsync(file);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card title={t('avatarTitle')}>
      <div className="flex flex-wrap items-center gap-5">
        <Avatar teacher={teacher} size={96} />
        <div className="space-y-2">
          <p className="font-semibold text-ink">{teacher.name}</p>
          <p className="text-sm text-ink-muted">{t('avatarHint')}</p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="sr-only"
              onChange={(e) => {
                void onPick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              loading={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="size-4" aria-hidden="true" />
              {teacher.avatarUrl ? t('avatarChange') : t('avatarUpload')}
            </Button>
            {teacher.avatarUrl && (
              <Button
                variant="ghost"
                size="sm"
                loading={remove.isPending}
                onClick={() => remove.mutate()}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t('avatarRemove')}
              </Button>
            )}
          </div>
          {error && <Alert variant="error">{error}</Alert>}
        </div>
      </div>
    </Card>
  );
}

function InfoCard({ teacher }: { teacher: TeacherDto }) {
  const t = useTranslations('Profile');
  const tc = useTranslations('Common');
  const update = useUpdateProfile();
  const [name, setName] = useState(teacher.name);
  const [phone, setPhone] = useState(teacher.phone ?? '');
  const [school, setSchool] = useState(teacher.school ?? '');
  const [levels, setLevels] = useState<TeachingLevel[]>(teacher.levels);
  const [subjects, setSubjects] = useState<Subject[]>(teacher.subjects);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);

  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const v = validate(updateProfileSchema, { name, phone, school, levels, subjects });
    if (v.errors) return setErrors(v.errors);
    setErrors({});
    try {
      await update.mutateAsync(v.data);
      setSaved(true);
    } catch {
      // lỗi hiển thị qua update.error bên dưới
    }
  }

  return (
    <Card title={t('infoTitle')}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('name')} htmlFor="p-name" error={errors.name}>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>
          <Field label={t('phone')} htmlFor="p-phone" hint={t('phoneHint')} error={errors.phone}>
            <Input
              id="p-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
            />
          </Field>
        </div>
        <Field label={t('school')} htmlFor="p-school" hint={t('schoolHint')} error={errors.school}>
          <Input
            id="p-school"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            autoComplete="organization"
            maxLength={120}
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">{t('levels')}</legend>
          <div className="flex flex-wrap gap-2">
            {TEACHING_LEVELS.map((lv) => (
              <Chip
                key={lv}
                active={levels.includes(lv)}
                onToggle={() => setLevels((l) => toggle(l, lv))}
              >
                {TEACHING_LEVEL_LABELS[lv]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">{t('subjects')}</legend>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((sub) => (
              <Chip
                key={sub}
                active={subjects.includes(sub)}
                onToggle={() => setSubjects((s) => toggle(s, sub))}
              >
                {SUBJECT_LABELS[sub]}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-muted">{t('subjectsHint')}</p>
        </fieldset>

        {update.isError && <Alert variant="error">{errorMessage(update.error)}</Alert>}
        {saved && !update.isPending && <Alert variant="success">{t('saved')}</Alert>}

        <div className="flex justify-end">
          <Button type="submit" loading={update.isPending}>
            {tc('save')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SecurityCard({ teacher }: { teacher: TeacherDto }) {
  const t = useTranslations('Profile');
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    const v = validate(changePasswordSchema, {
      currentPassword: teacher.hasPassword ? current : undefined,
      newPassword: next,
    });
    const errs: FieldErrors = v.errors ? { ...v.errors } : {};
    if (teacher.hasPassword && !current) errs.currentPassword = t('currentRequired');
    if (next !== confirm) errs.confirm = t('confirmMismatch');
    if (Object.keys(errs).length > 0 || !v.data) return setErrors(errs);
    setErrors({});
    try {
      await change.mutateAsync(v.data);
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch {
      // lỗi hiển thị qua change.error
    }
  }

  const providerLabel = (p: string) =>
    p === 'google' ? 'Google' : p === 'facebook' ? 'Facebook' : p;

  return (
    <Card title={t('securityTitle')}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-ink">{t('email')}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink">
              <span className="break-all">{teacher.email}</span>
              {teacher.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-block-mint px-2 py-0.5 text-xs font-medium text-success">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  {t('emailVerified')}
                </span>
              ) : (
                <span className="rounded-full bg-block-cream px-2 py-0.5 text-xs font-medium text-warning">
                  {t('emailUnverified')}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{t('linked')}</p>
            <p className="mt-1 text-sm text-ink">
              {teacher.providers.length > 0
                ? teacher.providers.map(providerLabel).join(', ')
                : t('linkedNone')}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 border-t border-hairline pt-5" noValidate>
          <h3 className="font-semibold text-ink">
            {teacher.hasPassword ? t('changePassword') : t('setPassword')}
          </h3>
          {!teacher.hasPassword && <p className="text-sm text-ink-muted">{t('setPasswordHint')}</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            {teacher.hasPassword && (
              <Field
                label={t('currentPassword')}
                htmlFor="pw-current"
                error={errors.currentPassword}
              >
                <PasswordInput
                  id="pw-current"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  aria-invalid={Boolean(errors.currentPassword)}
                />
              </Field>
            )}
            <Field
              label={t('newPassword')}
              htmlFor="pw-new"
              hint={t('passwordHint')}
              error={errors.newPassword}
            >
              <PasswordInput
                id="pw-new"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                aria-invalid={Boolean(errors.newPassword)}
              />
            </Field>
            <Field label={t('confirmPassword')} htmlFor="pw-confirm" error={errors.confirm}>
              <PasswordInput
                id="pw-confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={Boolean(errors.confirm)}
              />
            </Field>
          </div>
          {change.isError && <Alert variant="error">{errorMessage(change.error)}</Alert>}
          {done && <Alert variant="success">{t('passwordChanged')}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" loading={change.isPending}>
              {teacher.hasPassword ? t('changePassword') : t('setPassword')}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

export default function ProfilePage() {
  const t = useTranslations('Profile');
  const me = useMe();

  if (me.isPending || !me.data) {
    return (
      <div className="flex justify-center py-12 text-ink-muted">
        <Spinner className="size-6" />
      </div>
    );
  }
  const teacher = me.data;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="type-h2 text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('subtitle')}</p>
      </div>
      <AvatarCard teacher={teacher} />
      <InfoCard key={`${teacher.id}-${teacher.name}`} teacher={teacher} />
      <SecurityCard teacher={teacher} />
    </div>
  );
}
