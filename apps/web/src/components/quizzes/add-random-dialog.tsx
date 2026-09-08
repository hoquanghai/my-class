'use client';

import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  type QuizRandomFilter,
} from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiError, errorMessage } from '@/lib/api';
import { useQuestionFacets } from '@/lib/questions';
import { useAddRandomItems } from '@/lib/quizzes';

export function AddRandomDialog({
  quizId,
  open,
  onClose,
}: {
  quizId: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('Quizzes');
  const tq = useTranslations('Questions');
  const tc = useTranslations('Common');
  const facets = useQuestionFacets();
  const add = useAddRandomItems(quizId);
  const [count, setCount] = useState('5');
  const [filter, setFilter] = useState<QuizRandomFilter>({});
  const n = Math.max(1, Math.min(50, Number(count) || 0));

  async function submit() {
    await add.mutateAsync({ count: n, filter });
    onClose();
  }

  const clean = (v: string) => v || undefined;

  return (
    <Dialog open={open} onClose={onClose} title={t('addRandom')}>
      <div className="space-y-4">
        <Field label={t('randomCount')} htmlFor="random-count">
          <Input
            id="random-count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-28"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label={tq('subject')}
            value={filter.subject ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, subject: clean(e.target.value) }))}
          >
            <option value="">
              {tq('subject')}: {tq('all')}
            </option>
            {facets.data?.subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            aria-label={tq('grade')}
            value={filter.grade ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, grade: clean(e.target.value) }))}
          >
            <option value="">
              {tq('grade')}: {tq('all')}
            </option>
            {facets.data?.grades.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            aria-label={tq('topic')}
            value={filter.topic ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, topic: clean(e.target.value) }))}
          >
            <option value="">
              {tq('topic')}: {tq('all')}
            </option>
            {facets.data?.topics.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            aria-label={tq('difficulty')}
            value={filter.difficulty ?? ''}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                difficulty: clean(e.target.value) as QuizRandomFilter['difficulty'],
              }))
            }
          >
            <option value="">
              {tq('difficulty')}: {tq('all')}
            </option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </Select>
          <Select
            aria-label={tq('type')}
            value={filter.type ?? ''}
            onChange={(e) =>
              setFilter((f) => ({ ...f, type: clean(e.target.value) as QuizRandomFilter['type'] }))
            }
          >
            <option value="">
              {tq('type')}: {tq('all')}
            </option>
            {QUESTION_TYPES.map((k) => (
              <option key={k} value={k}>
                {QUESTION_TYPE_LABELS[k]}
              </option>
            ))}
          </Select>
        </div>
        {add.isError && (
          <Alert variant="error">
            {add.error instanceof ApiError && add.error.status === 400
              ? t('randomNone')
              : errorMessage(add.error)}
          </Alert>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button onClick={submit} loading={add.isPending}>
            {t('randomAdd', { count: n })}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
