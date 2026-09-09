'use client';

import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  type QuestionDto,
  subjectLabel,
} from '@lophoc/shared';
import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { QuestionCard } from '@/components/questions/question-card';
import { QuestionEditorDialog } from '@/components/questions/question-editor-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import {
  type QuestionFilterInput,
  useDeleteQuestion,
  useQuestionFacets,
  useQuestions,
} from '@/lib/questions';
import { useDebounce } from '@/lib/use-debounce';

const PAGE_SIZE = 20;

export default function QuestionsPage() {
  const t = useTranslations('Questions');
  const [filter, setFilter] = useState<QuestionFilterInput>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<QuestionDto | null>(null);
  const q = useDebounce(search.trim(), 300);

  const facets = useQuestionFacets();
  const questions = useQuestions({ ...filter, q: q || undefined, page, pageSize: PAGE_SIZE });
  const remove = useDeleteQuestion();

  const set = (patch: QuestionFilterInput) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const pages = questions.data ? Math.max(1, Math.ceil(questions.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <Link
          href="/app/questions/import"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="size-4" />
          {t('import')}
        </Link>
      </div>

      {/* Máy tính: ô tìm + 5 ô lọc trên một hàng; màn hình hẹp: 2–3 ô mỗi hàng */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(14rem,1.6fr)_repeat(5,minmax(0,1fr))]">
        <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            aria-label={t('search')}
            placeholder={t('search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          aria-label={t('subject')}
          className="w-full min-w-0"
          value={filter.subject ?? ''}
          onChange={(e) => set({ subject: e.target.value || undefined })}
        >
          <option value="">
            {t('subject')}: {t('all')}
          </option>
          {facets.data?.subjects.map((s) => (
            <option key={s} value={s}>
              {subjectLabel(s)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('grade')}
          className="w-full min-w-0"
          value={filter.grade ?? ''}
          onChange={(e) => set({ grade: e.target.value || undefined })}
        >
          <option value="">
            {t('grade')}: {t('all')}
          </option>
          {facets.data?.grades.map((g) => (
            <option key={g} value={g}>
              {t('gradeLabel', { grade: g })}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('topic')}
          className="w-full min-w-0"
          value={filter.topic ?? ''}
          onChange={(e) => set({ topic: e.target.value || undefined })}
        >
          <option value="">
            {t('topic')}: {t('all')}
          </option>
          {facets.data?.topics.map((tp) => (
            <option key={tp} value={tp}>
              {tp}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('difficulty')}
          className="w-full min-w-0"
          value={filter.difficulty ?? ''}
          onChange={(e) =>
            set({ difficulty: (e.target.value || undefined) as QuestionFilterInput['difficulty'] })
          }
        >
          <option value="">
            {t('difficulty')}: {t('all')}
          </option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('type')}
          className="w-full min-w-0"
          value={filter.type ?? ''}
          onChange={(e) =>
            set({ type: (e.target.value || undefined) as QuestionFilterInput['type'] })
          }
        >
          <option value="">
            {t('type')}: {t('all')}
          </option>
          {QUESTION_TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {QUESTION_TYPE_LABELS[tp]}
            </option>
          ))}
        </Select>
      </div>

      {questions.isError && <Alert variant="error">{errorMessage(questions.error)}</Alert>}
      {remove.isError && <Alert variant="error">{errorMessage(remove.error)}</Alert>}

      {questions.isPending ? (
        <div className="flex justify-center py-12 text-slate-400">
          <Spinner className="size-6" />
        </div>
      ) : questions.data && questions.data.total === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {t('empty')}
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {t('total', { count: questions.data?.total ?? 0 })}
          </p>
          <div className="space-y-3">
            {questions.data?.items.map((item, i) => (
              <QuestionCard
                key={item.id}
                question={item}
                index={(page - 1) * PAGE_SIZE + i + 1}
                onEdit={() => setEditing(item)}
                onDelete={() => {
                  if (window.confirm(t('deleteConfirm'))) remove.mutate(item.id);
                }}
              />
            ))}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('prev')}
              </Button>
              <span>{t('page', { page, pages })}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('next')}
              </Button>
            </div>
          )}
        </>
      )}

      {editing && (
        <QuestionEditorDialog
          key={editing.id}
          question={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
