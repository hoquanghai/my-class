'use client';

import { createClassSchema, type ScheduleItem } from '@lophoc/shared';
import { Plus, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { ClassMeta, SubjectGradeFields } from '@/components/classes/subject-grade-fields';
import { ScheduleEditor } from '@/components/schedule-editor';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useClasses, useCreateClass, useLimits } from '@/lib/classes';
import { type FieldErrors, validate } from '@/lib/forms';

function CreateClassDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('Classes');
  const tc = useTranslations('Common');
  const router = useRouter();
  const create = useCreateClass();
  const me = useMe();
  const [name, setName] = useState('');
  // Gợi ý từ hồ sơ: giáo viên chỉ dạy một môn thì chọn sẵn môn đó.
  const [subject, setSubject] = useState(me.data?.subjects.length === 1 ? me.data.subjects[0] : '');
  const [grade, setGrade] = useState('');
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate(createClassSchema, { name, subject, grade, schedule });
    if (v.errors) return setErrors(v.errors);
    setErrors({});
    try {
      const created = await create.mutateAsync(v.data);
      onClose();
      router.push(`/app/classes/${created.id}`);
    } catch {
      // lỗi hiển thị qua create.error
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('createDialogTitle')}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {create.isError && <Alert variant="error">{errorMessage(create.error)}</Alert>}
        <Field label={t('name')} htmlFor="class-name" error={errors.name}>
          <Input
            id="class-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            autoFocus
          />
        </Field>
        <SubjectGradeFields
          idPrefix="class"
          subject={subject}
          grade={grade}
          onSubjectChange={(v) => {
            setSubject(v);
            setErrors((e) => ({ ...e, subject: '' }));
          }}
          onGradeChange={(v) => {
            setGrade(v);
            setErrors((e) => ({ ...e, grade: '' }));
          }}
          errors={errors}
        />
        <Field label={`${t('schedule')} (${tc('optional')})`} error={errors.schedule}>
          <ScheduleEditor value={schedule} onChange={setSchedule} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" loading={create.isPending}>
            {t('create')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function ClassesPage() {
  const t = useTranslations('Classes');
  const classes = useClasses();
  const limits = useLimits();
  const [open, setOpen] = useState(false);

  const maxClasses = limits.data?.maxClasses;
  const atLimit =
    classes.data !== undefined && maxClasses !== undefined && classes.data.length >= maxClasses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <Button onClick={() => setOpen(true)} disabled={atLimit}>
          <Plus className="size-4" />
          {t('create')}
        </Button>
      </div>

      {atLimit && maxClasses !== undefined && (
        <Alert variant="warning">{t('limitReached', { max: maxClasses })}</Alert>
      )}
      {classes.isError && <Alert variant="error">{errorMessage(classes.error)}</Alert>}

      {classes.isPending ? (
        <div className="flex justify-center py-12 text-slate-400">
          <Spinner className="size-6" />
        </div>
      ) : classes.data && classes.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {t('empty')}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.data?.map((c) => (
            <Link
              key={c.id}
              href={`/app/classes/${c.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow"
            >
              <h2 className="text-lg font-semibold text-slate-900">{c.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                <ClassMeta subject={c.subject} grade={c.grade} />
              </p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Users className="size-4" />
                  {t('studentsCount', { count: c.studentCount })}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold tracking-widest text-slate-700">
                  {c.code}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && <CreateClassDialog open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}
