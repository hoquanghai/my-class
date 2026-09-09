'use client';

import { type ClassDetailDto, type ScheduleItem, updateClassSchema } from '@lophoc/shared';
import { Download, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { CopyButton } from '@/components/copy-button';
import { ScheduleEditor } from '@/components/schedule-editor';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiUrl, errorMessage } from '@/lib/api';
import { useDeleteClass, useRegenerateCode, useUpdateClass } from '@/lib/classes';
import { type FieldErrors, validate } from '@/lib/forms';
import { studentJoinUrl } from '@/lib/student-origin';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsTab({ klass }: { klass: ClassDetailDto }) {
  const t = useTranslations('Settings');
  const tcl = useTranslations('Classes');
  const tc = useTranslations('Common');
  const router = useRouter();
  const update = useUpdateClass(klass.id);
  const regenerate = useRegenerateCode(klass.id);
  const remove = useDeleteClass(klass.id);

  const [name, setName] = useState(klass.name);
  const [subject, setSubject] = useState(klass.subject ?? '');
  const [grade, setGrade] = useState(klass.grade ?? '');
  const [schedule, setSchedule] = useState<ScheduleItem[]>(klass.schedule);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [hardOpen, setHardOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const joinUrl = studentJoinUrl(klass.code);

  async function saveInfo(e: FormEvent) {
    e.preventDefault();
    const v = validate(updateClassSchema, { name, subject, grade, schedule });
    if (v.errors) return setErrors(v.errors);
    setErrors({});
    await update.mutateAsync(v.data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function downloadQr() {
    const res = await fetch(apiUrl(`/classes/${klass.id}/qr.png`), { credentials: 'include' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lophoc-${klass.code}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function softDelete() {
    if (!window.confirm(t('softDeleteConfirm', { name: klass.name }))) return;
    await remove.mutateAsync(false);
    router.replace('/app/classes');
  }

  async function hardDelete() {
    if (confirmName.trim() !== klass.name) return;
    await remove.mutateAsync(true);
    setHardOpen(false);
    router.replace('/app/classes');
  }

  const anyError = update.error ?? regenerate.error ?? remove.error;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Section title={t('info')}>
          <form onSubmit={saveInfo} className="space-y-4" noValidate>
            <Field label={tcl('name')} htmlFor="s-name" error={errors.name}>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tcl('subject')} htmlFor="s-subject">
                <Input
                  id="s-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </Field>
              <Field label={tcl('grade')} htmlFor="s-grade">
                <Input id="s-grade" value={grade} onChange={(e) => setGrade(e.target.value)} />
              </Field>
            </div>
            <Field label={tcl('schedule')} error={errors.schedule}>
              <ScheduleEditor value={schedule} onChange={setSchedule} />
            </Field>
            <div className="flex items-center gap-3">
              <Button type="submit" loading={update.isPending}>
                {tc('save')}
              </Button>
              {saved && <span className="text-sm text-green-700">{t('saved')}</span>}
            </div>
          </form>
        </Section>

        <Section title={t('lock')}>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-4 rounded border-slate-300"
              checked={klass.rosterLocked}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ rosterLocked: e.target.checked })}
            />
            <span className="text-sm text-slate-600">{t('lockHint')}</span>
          </label>
        </Section>

        {anyError && <Alert variant="error">{errorMessage(anyError)}</Alert>}
      </div>

      <div className="space-y-6">
        <Section title={t('codeTitle')}>
          <p className="text-sm text-slate-600">{t('codeHint')}</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${apiUrl(`/classes/${klass.id}/qr.png`)}?v=${klass.code}`}
              alt={`QR ${klass.code}`}
              className="size-44 rounded-lg border border-slate-200"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{tcl('code')}</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-3xl font-bold tracking-[0.3em] text-slate-900">
                    {klass.code}
                  </span>
                  <CopyButton text={klass.code} />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{t('joinLink')}</p>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-slate-700">{joinUrl}</span>
                  <CopyButton text={joinUrl} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={downloadQr}>
                  <Download className="size-4" />
                  {t('downloadQr')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer className="size-4" />
                  {t('print')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={regenerate.isPending}
                  onClick={() => {
                    if (window.confirm(t('regenerateConfirm'))) regenerate.mutate();
                  }}
                >
                  <RefreshCw className="size-4" />
                  {t('regenerate')}
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <section className="space-y-4 rounded-xl border border-red-200 bg-white p-5">
          <h2 className="text-base font-semibold text-red-700">{t('danger')}</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">{t('softDelete')}</p>
              <p className="text-sm text-slate-500">{t('softDeleteHint')}</p>
            </div>
            <Button variant="secondary" onClick={softDelete} loading={remove.isPending}>
              {t('softDelete')}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="font-medium text-slate-900">{t('hardDelete')}</p>
              <p className="text-sm text-slate-500">{t('hardDeleteHint')}</p>
            </div>
            <Button variant="danger" onClick={() => setHardOpen(true)}>
              <Trash2 className="size-4" />
              {t('hardDelete')}
            </Button>
          </div>
        </section>
      </div>

      <Dialog open={hardOpen} onClose={() => setHardOpen(false)} title={t('hardDelete')}>
        <div className="space-y-4">
          <Alert variant="warning">{t('hardDeleteHint')}</Alert>
          <Field label={t('hardDeleteConfirm', { name: klass.name })} htmlFor="confirm-name">
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setHardOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={confirmName.trim() !== klass.name}
              loading={remove.isPending}
              onClick={hardDelete}
            >
              {t('hardDelete')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
