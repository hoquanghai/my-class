'use client';

import { GENDER_LABELS, GENDERS, type StudentDto } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { FieldErrors } from '@/lib/forms';

export type StudentFormKey =
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

/** Trạng thái form thông tin học sinh: mọi ô là chuỗi, rỗng = chưa nhập. */
export type StudentFormState = Record<StudentFormKey, string>;

export function emptyStudentForm(): StudentFormState {
  return {
    name: '',
    studentCode: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
    school: '',
    parentName: '',
    parentPhone: '',
    note: '',
  };
}

export function studentFormFromDto(s: StudentDto): StudentFormState {
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

/**
 * Các ô nhập thông tin một học sinh; dùng chung cho hộp thoại thêm mới và sửa.
 * Chỉ họ và tên là bắt buộc. `idPrefix` để hai hộp thoại không trùng id.
 */
export function StudentFields({
  form,
  errors,
  onChange,
  idPrefix = 'st',
}: {
  form: StudentFormState;
  errors: FieldErrors;
  onChange: (key: StudentFormKey, value: string) => void;
  idPrefix?: string;
}) {
  const t = useTranslations('StudentInfo');
  const tc = useTranslations('Common');

  const textField = (
    key: Exclude<StudentFormKey, 'gender' | 'note'>,
    props: Partial<ComponentProps<typeof Input>> = {},
  ) => (
    <Field
      label={key === 'name' ? `${t('name')} (${tc('required')})` : t(key)}
      htmlFor={`${idPrefix}-${key}`}
      error={errors[key]}
    >
      <Input
        id={`${idPrefix}-${key}`}
        value={form[key]}
        onChange={(e) => onChange(key, e.target.value)}
        aria-invalid={Boolean(errors[key])}
        {...props}
      />
    </Field>
  );

  return (
    <>
      <p className="text-sm text-ink-muted">{t('onlyNameRequired')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {textField('name', { autoComplete: 'off', autoFocus: true })}
        {textField('studentCode', { maxLength: 50 })}
        {textField('dateOfBirth', { type: 'date', min: '1990-01-01', max: '2030-12-31' })}
        <Field label={t('gender')} htmlFor={`${idPrefix}-gender`} error={errors.gender}>
          <Select
            className="w-full"
            id={`${idPrefix}-gender`}
            value={form.gender}
            onChange={(e) => onChange('gender', e.target.value)}
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
      <Field label={t('note')} htmlFor={`${idPrefix}-note`} error={errors.note}>
        <Textarea
          id={`${idPrefix}-note`}
          rows={3}
          maxLength={500}
          value={form.note}
          onChange={(e) => onChange('note', e.target.value)}
        />
      </Field>
    </>
  );
}
