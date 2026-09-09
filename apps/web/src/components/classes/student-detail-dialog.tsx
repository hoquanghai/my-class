'use client';

import { GENDER_LABELS, GENDERS, type StudentDto, updateStudentSchema } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { errorMessage } from '@/lib/api';
import { useUpdateStudent } from '@/lib/classes';
import { type FieldErrors, validate } from '@/lib/forms';

type TextKey =
  | 'name'
  | 'studentCode'
  | 'dateOfBirth'
  | 'gender'
  | 'phone'
  | 'email'
  | 'school'
  | 'parentName'
  | 'parentPhone'
  | 'note';

type FormState = Record<TextKey, string>;

function initialState(s: StudentDto): FormState {
  return {
    name: s.name,
    studentCode: s.studentCode ?? '',
    dateOfBirth: s.dateOfBirth ?? '',
    gender: s.gender ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    school: s.school ?? '',
    parentName: s.parentName ?? '',
    parentPhone: s.parentPhone ?? '',
    note: s.note ?? '',
  };
}

/** Hộp thoại sửa đầy đủ thông tin một học sinh; chỉ họ và tên là bắt buộc. */
export function StudentDetailDialog({
  classId,
  student,
  onClose,
}: {
  classId: string;
  student: StudentDto | null;
  onClose: () => void;
}) {
  if (!student) return null;
  return <StudentForm key={student.id} classId={classId} student={student} onClose={onClose} />;
}

function StudentForm({
  classId,
  student,
  onClose,
}: {
  classId: string;
  student: StudentDto;
  onClose: () => void;
}) {
  const t = useTranslations('Student');
  const tc = useTranslations('Common');
  const update = useUpdateStudent(classId);
  const [form, setForm] = useState<FormState>(() => initialState(student));
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = (key: TextKey) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate(updateStudentSchema, form);
    if (v.errors) return setErrors(v.errors);
    setErrors({});
    try {
      await update.mutateAsync({ studentId: student.id, input: v.data });
      onClose();
    } catch {
      // lỗi hiển thị qua update.error
    }
  }

  const textField = (
    key: Exclude<TextKey, 'gender' | 'note'>,
    props: Partial<React.ComponentProps<typeof Input>> = {},
  ) => (
    <Field
      label={key === 'name' ? `${t('name')} (${tc('required')})` : t(key)}
      htmlFor={`st-${key}`}
      error={errors[key]}
    >
      <Input
        id={`st-${key}`}
        value={form[key]}
        onChange={(e) => set(key)(e.target.value)}
        aria-invalid={Boolean(errors[key])}
        {...props}
      />
    </Field>
  );

  return (
    <Dialog open onClose={onClose} title={t('title')} size="lg">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-ink-muted">{t('onlyNameRequired')}</p>
        {update.isError && <Alert variant="error">{errorMessage(update.error)}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          {textField('name', { autoComplete: 'off', autoFocus: true })}
          {textField('studentCode', { maxLength: 50 })}
          {textField('dateOfBirth', { type: 'date', min: '1990-01-01', max: '2030-12-31' })}
          <Field label={t('gender')} htmlFor="st-gender" error={errors.gender}>
            <Select
              className="w-full"
              id="st-gender"
              value={form.gender}
              onChange={(e) => set('gender')(e.target.value)}
            >
              <option value="">{t('genderNone')}</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </Select>
          </Field>
          {textField('phone', { inputMode: 'tel', autoComplete: 'off' })}
          {textField('email', { type: 'email', inputMode: 'email', autoComplete: 'off' })}
          {textField('school', { maxLength: 120 })}
          {textField('parentName', { maxLength: 100 })}
          {textField('parentPhone', { inputMode: 'tel', autoComplete: 'off' })}
        </div>
        <Field label={t('note')} htmlFor="st-note" error={errors.note}>
          <Textarea
            id="st-note"
            rows={3}
            maxLength={500}
            value={form.note}
            onChange={(e) => set('note')(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" loading={update.isPending}>
            {tc('save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
