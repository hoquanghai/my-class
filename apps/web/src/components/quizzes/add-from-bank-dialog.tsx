'use client';

import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  type QuizDetailDto,
} from '@lophoc/shared';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MarkdownLatex } from '@/components/markdown-latex';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { type QuestionFilterInput, useQuestionFacets, useQuestions } from '@/lib/questions';
import { useAddQuizItems } from '@/lib/quizzes';
import { useDebounce } from '@/lib/use-debounce';

const PAGE_SIZE = 20;

export function AddFromBankDialog({
  quiz,
  open,
  onClose,
}: {
  quiz: QuizDetailDto;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('Quizzes');
  const tq = useTranslations('Questions');
  const tc = useTranslations('Common');
  const [filter, setFilter] = useState<QuestionFilterInput>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const q = useDebounce(search.trim(), 300);
  const facets = useQuestionFacets();
  const questions = useQuestions({ ...filter, q: q || undefined, page, pageSize: PAGE_SIZE });
  const add = useAddQuizItems(quiz.id);
  const inQuiz = new Set(quiz.items.map((i) => i.questionId));

  const set = (patch: QuestionFilterInput) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const pages = questions.data ? Math.max(1, Math.ceil(questions.data.total / PAGE_SIZE)) : 1;

  async function submit() {
    if (picked.length === 0) return;
    await add.mutateAsync({ questionIds: picked });
    setPicked([]);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('addFromBank')} className="max-w-3xl">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-48 flex-1">
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
            aria-label={tq('subject')}
            value={filter.subject ?? ''}
            onChange={(e) => set({ subject: e.target.value || undefined })}
          >
            <option value="">{tq('subject')}</option>
            {facets.data?.subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            aria-label={tq('topic')}
            value={filter.topic ?? ''}
            onChange={(e) => set({ topic: e.target.value || undefined })}
          >
            <option value="">{tq('topic')}</option>
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
              set({
                difficulty: (e.target.value || undefined) as QuestionFilterInput['difficulty'],
              })
            }
          >
            <option value="">{tq('difficulty')}</option>
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
              set({ type: (e.target.value || undefined) as QuestionFilterInput['type'] })
            }
          >
            <option value="">{tq('type')}</option>
            {QUESTION_TYPES.map((k) => (
              <option key={k} value={k}>
                {QUESTION_TYPE_LABELS[k]}
              </option>
            ))}
          </Select>
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200">
          {questions.isPending ? (
            <div className="flex justify-center py-8 text-slate-400">
              <Spinner className="size-5" />
            </div>
          ) : questions.data && questions.data.items.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{t('bankEmpty')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {questions.data?.items.map((item) => {
                const already = inQuiz.has(item.id);
                const checked = picked.includes(item.id);
                return (
                  <li key={item.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer gap-3 p-3 text-sm hover:bg-slate-50',
                        already && 'cursor-default opacity-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        disabled={already}
                        checked={already || checked}
                        onChange={(e) =>
                          setPicked((p) =>
                            e.target.checked ? [...p, item.id] : p.filter((x) => x !== item.id),
                          )
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 flex flex-wrap gap-1 text-xs text-slate-500">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">
                            {QUESTION_TYPE_LABELS[item.type]}
                          </span>
                          {item.topic && (
                            <span className="rounded border border-slate-200 px-1.5 py-0.5">
                              {item.topic}
                            </span>
                          )}
                          {already && <span className="text-brand-700">{t('inQuiz')}</span>}
                        </span>
                        <MarkdownLatex className="line-clamp-2 text-slate-800">
                          {item.stemMd}
                        </MarkdownLatex>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ‹
            </Button>
            <span>
              {page}/{pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              ›
            </Button>
          </div>
        )}

        {add.isError && <Alert variant="error">{errorMessage(add.error)}</Alert>}

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-500">{t('selected', { count: picked.length })}</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button onClick={submit} disabled={picked.length === 0} loading={add.isPending}>
              {t('addSelected', { count: picked.length })}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
