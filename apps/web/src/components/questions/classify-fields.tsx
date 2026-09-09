'use client';

import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Difficulty,
  GRADES_BY_LEVEL,
  SUBJECT_LABELS,
  SUBJECTS,
  TEACHING_LEVEL_LABELS,
  TEACHING_LEVELS,
} from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useQuestionFacets } from '@/lib/questions';

/** Phân loại câu hỏi: môn và khối theo danh mục chung, chủ đề do giáo viên đặt, mức độ tùy chọn. */
export interface Classification {
  subject: string;
  grade: string;
  topic: string;
  difficulty: Difficulty | '';
}

export function isClassified(c: Classification): boolean {
  return Boolean(c.subject && c.grade && c.topic.trim());
}

/**
 * Bốn ô phân loại. Chủ đề là ô gõ tự do kèm danh sách chủ đề đã dùng cho cùng môn/khối:
 * chọn một chủ đề cũ hoặc gõ tên mới; gõ trùng tên (khác hoa thường) thì lấy lại cách viết cũ.
 */
export function ClassifyInputs({
  value,
  onChange,
  showErrors,
  showDifficulty = true,
}: {
  value: Classification;
  onChange: (next: Classification) => void;
  /** Hiện lỗi "vui lòng chọn" cho ô còn trống (sau khi bấm lưu/tạo). */
  showErrors?: boolean;
  showDifficulty?: boolean;
}) {
  const t = useTranslations('Questions');
  const id = useId();
  const facets = useQuestionFacets({
    subject: value.subject || undefined,
    grade: value.grade || undefined,
  });
  const topics = facets.data?.topics ?? [];
  const missing = (v: string) => (showErrors && !v.trim() ? t('required') : undefined);

  function snapTopic() {
    const typed = value.topic.trim().replace(/\s+/g, ' ');
    const match = topics.find((tp) => tp.toLowerCase() === typed.toLowerCase());
    const next = match ?? typed;
    if (next !== value.topic) onChange({ ...value, topic: next });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label={t('subject')} htmlFor={`${id}-subject`} error={missing(value.subject)}>
        <Select
          id={`${id}-subject`}
          value={value.subject}
          onChange={(e) => onChange({ ...value, subject: e.target.value })}
          aria-invalid={Boolean(missing(value.subject))}
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
      <Field label={t('grade')} htmlFor={`${id}-grade`} error={missing(value.grade)}>
        <Select
          id={`${id}-grade`}
          value={value.grade}
          onChange={(e) => onChange({ ...value, grade: e.target.value })}
          aria-invalid={Boolean(missing(value.grade))}
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
      <Field
        label={t('topic')}
        htmlFor={`${id}-topic`}
        error={missing(value.topic)}
        hint={topics.length > 0 ? t('topicHintExisting', { count: topics.length }) : t('topicHint')}
      >
        <Input
          id={`${id}-topic`}
          list={`${id}-topics`}
          value={value.topic}
          onChange={(e) => onChange({ ...value, topic: e.target.value })}
          onBlur={snapTopic}
          placeholder={t('topicPlaceholder')}
          maxLength={80}
          autoComplete="off"
          aria-invalid={Boolean(missing(value.topic))}
          required
        />
        <datalist id={`${id}-topics`}>
          {topics.map((tp) => (
            <option key={tp} value={tp} />
          ))}
        </datalist>
      </Field>
      {showDifficulty && (
        <Field label={t('difficulty')} htmlFor={`${id}-difficulty`}>
          <Select
            id={`${id}-difficulty`}
            value={value.difficulty}
            onChange={(e) =>
              onChange({ ...value, difficulty: e.target.value as Classification['difficulty'] })
            }
          >
            <option value="">{t('difficultyAny')}</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </div>
  );
}
