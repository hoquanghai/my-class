'use client';

import {
  GRADES_BY_LEVEL,
  SUBJECT_LABELS,
  SUBJECTS,
  subjectLabel,
  TEACHING_LEVEL_LABELS,
  TEACHING_LEVELS,
} from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import type { FieldErrors } from '@/lib/forms';

/** Hai dropdown bắt buộc Môn + Khối lớp, dùng chung cho tạo lớp và cài đặt lớp. */
export function SubjectGradeFields({
  idPrefix,
  subject,
  grade,
  onSubjectChange,
  onGradeChange,
  errors,
}: {
  idPrefix: string;
  subject: string;
  grade: string;
  onSubjectChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  errors: FieldErrors;
}) {
  const t = useTranslations('Classes');
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={t('subject')} htmlFor={`${idPrefix}-subject`} error={errors.subject}>
        <Select
          id={`${idPrefix}-subject`}
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          aria-invalid={Boolean(errors.subject)}
          required
        >
          <option value="" disabled>
            {t('selectSubject')}
          </option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {SUBJECT_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('grade')} htmlFor={`${idPrefix}-grade`} error={errors.grade}>
        <Select
          id={`${idPrefix}-grade`}
          value={grade}
          onChange={(e) => onGradeChange(e.target.value)}
          aria-invalid={Boolean(errors.grade)}
          required
        >
          <option value="" disabled>
            {t('selectGrade')}
          </option>
          {TEACHING_LEVELS.map((lv) => (
            <optgroup key={lv} label={TEACHING_LEVEL_LABELS[lv]}>
              {GRADES_BY_LEVEL[lv].map((g) => (
                <option key={g} value={g}>
                  {t('gradeLabel', { grade: g })}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
    </div>
  );
}

/** "Toán · Lớp 12" cho thẻ lớp và tiêu đề lớp; lớp cũ chưa có môn/khối thì hiện "—". */
export function ClassMeta({ subject, grade }: { subject: string | null; grade: string | null }) {
  const t = useTranslations('Classes');
  const parts = [subjectLabel(subject), grade ? t('gradeLabel', { grade }) : null].filter(Boolean);
  return <>{parts.length > 0 ? parts.join(' · ') : '—'}</>;
}
