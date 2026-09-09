'use client';

import {
  publishSetSchema,
  QUESTION_TYPE_LABELS,
  type QuizDetailDto,
  type SharedSetDetailDto,
  SHARED_SET_STATUS_LABELS,
} from '@lophoc/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { type FormEvent, useMemo, useState } from 'react';
import { SubjectGradeFields } from '@/components/classes/subject-grade-fields';
import { MarkdownLatex } from '@/components/markdown-latex';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiFetch, errorMessage } from '@/lib/api';
import { usePublishSet } from '@/lib/community';
import { type FieldErrors, validate } from '@/lib/forms';
import { useQuestionFacets, useQuestions } from '@/lib/questions';
import { quizKeys, useQuizzes } from '@/lib/quizzes';

type Mode = 'quiz' | 'bank';
type PublishStatus = 'draft' | 'published' | 'unlisted';
const PUBLISH_STATUSES: PublishStatus[] = ['published', 'unlisted', 'draft'];
const BANK_PAGE_SIZE = 50;

/**
 * Đăng bộ đề lên cộng đồng: nội dung lấy từ một đề kiểm tra hoặc chọn câu trong ngân hàng,
 * kèm tiêu đề, môn/khối, chủ đề, trạng thái và xác nhận quyền chia sẻ.
 * Cha render có điều kiện để mỗi lần mở là form mới.
 */
export function PublishSetDialog({
  initialQuizId,
  onClose,
  onPublished,
}: {
  initialQuizId?: string | null;
  onClose: () => void;
  onPublished: (set: SharedSetDetailDto) => void;
}) {
  const t = useTranslations('Community');
  const tc = useTranslations('Common');
  const [mode, setMode] = useState<Mode>(initialQuizId ? 'quiz' : 'bank');
  const [quizId, setQuizId] = useState(initialQuizId ?? '');
  const quizzes = useQuizzes();
  const quiz = useQuery({
    queryKey: quizKeys.detail(quizId),
    queryFn: () => apiFetch<QuizDetailDto>(`/quizzes/${quizId}`),
    enabled: quizId !== '',
  });

  const [bank, setBank] = useState({ subject: '', grade: '', topic: '', q: '', page: 1 });
  const bankList = useQuestions({
    subject: bank.subject || undefined,
    grade: bank.grade || undefined,
    topic: bank.topic || undefined,
    q: bank.q || undefined,
    page: bank.page,
    pageSize: BANK_PAGE_SIZE,
  });
  const bankFacets = useQuestionFacets({
    subject: bank.subject || undefined,
    grade: bank.grade || undefined,
  });
  const [selected, setSelected] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    grade: '',
    topic: '',
    source: '',
    status: 'published' as PublishStatus,
  });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const publish = usePublishSet();

  // Ô còn trống thì lấy mặc định từ đề đã chọn (hoặc bộ lọc ngân hàng) ngay lúc render
  const first = quiz.data?.items[0]?.question;
  const fromQuiz = mode === 'quiz';
  const effective = {
    ...form,
    title: form.title || (fromQuiz ? (quiz.data?.title ?? '') : ''),
    description: form.description || (fromQuiz ? (quiz.data?.description ?? '') : ''),
    subject: form.subject || (fromQuiz ? (first?.subject ?? '') : bank.subject),
    grade: form.grade || (fromQuiz ? (first?.grade ?? '') : bank.grade),
    topic: form.topic || (fromQuiz ? (first?.topic ?? '') : bank.topic),
  };
  const setFacets = useQuestionFacets({
    subject: effective.subject || undefined,
    grade: effective.grade || undefined,
  });

  const questionCount = fromQuiz ? (quiz.data?.questionCount ?? 0) : selected.length;
  const pageIds = useMemo(() => (bankList.data?.items ?? []).map((q) => q.id), [bankList.data]);
  const pages = Math.max(1, Math.ceil((bankList.data?.total ?? 0) / BANK_PAGE_SIZE));

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      title: effective.title,
      description: effective.description,
      subject: effective.subject,
      grade: effective.grade,
      topic: effective.topic,
      source: effective.source,
      status: effective.status,
      questionIds: fromQuiz ? undefined : selected,
      quizId: fromQuiz ? quizId || undefined : undefined,
      agree: agree ? true : undefined,
    };
    const v = validate(publishSetSchema, payload);
    if (v.errors) {
      const mapped: FieldErrors = { ...v.errors };
      if (mapped.agree) mapped.agree = t('agreeRequired');
      if (mapped.questionIds) mapped.questionIds = t('needQuestions');
      return setErrors(mapped);
    }
    setErrors({});
    try {
      onPublished(await publish.mutateAsync(v.data));
    } catch {
      // lỗi hiển thị qua publish.error
    }
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setMode(value)}
      className={cn(
        'h-9 flex-1 rounded-md px-3 text-sm font-medium transition',
        mode === value
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900',
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog open onClose={onClose} title={t('publishTitle')} size="lg">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div role="tablist" className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {tab('quiz', t('fromQuiz'))}
          {tab('bank', t('fromBank'))}
        </div>

        {fromQuiz ? (
          <Field label={t('pickQuiz')} htmlFor="pub-quiz" error={errors.questionIds}>
            <Select
              className="w-full"
              id="pub-quiz"
              value={quizId}
              onChange={(e) => setQuizId(e.target.value)}
            >
              <option value="">{t('pickQuiz')}…</option>
              {(quizzes.data ?? []).map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({t('questions', { count: q.questionCount })})
                </option>
              ))}
            </Select>
            {quizzes.data?.length === 0 && (
              <p className="mt-1 text-sm text-slate-500">{t('noQuizzes')}</p>
            )}
          </Field>
        ) : (
          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <SubjectGradeFields
              idPrefix="pub-bank"
              subject={bank.subject}
              grade={bank.grade}
              onSubjectChange={(v) => setBank({ ...bank, subject: v, topic: '', page: 1 })}
              onGradeChange={(v) => setBank({ ...bank, grade: v, topic: '', page: 1 })}
              errors={{}}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                className="w-full"
                aria-label={t('filterTopic')}
                value={bank.topic}
                onChange={(e) => setBank({ ...bank, topic: e.target.value, page: 1 })}
              >
                <option value="">{t('allTopics')}</option>
                {(bankFacets.data?.topics ?? []).map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </Select>
              <Input
                type="search"
                aria-label={t('search')}
                placeholder={t('searchStem')}
                value={bank.q}
                onChange={(e) => setBank({ ...bank, q: e.target.value, page: 1 })}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className={cn('font-medium', errors.questionIds && 'text-red-600')}>
                {errors.questionIds ?? t('selected', { count: selected.length })}
              </span>
              <span className="flex gap-3">
                <button
                  type="button"
                  className="text-brand-700 hover:underline"
                  onClick={() => setSelected((s) => [...new Set([...s, ...pageIds])])}
                >
                  {t('selectPage')}
                </button>
                <button
                  type="button"
                  className="text-slate-500 hover:underline"
                  onClick={() => setSelected([])}
                >
                  {t('clearSelection')}
                </button>
              </span>
            </div>
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {(bankList.data?.items ?? []).map((q) => (
                <li key={q.id}>
                  <label className="flex cursor-pointer gap-3 px-3 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-accent"
                      checked={selected.includes(q.id)}
                      onChange={() => toggle(q.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="mb-0.5 flex flex-wrap gap-1 text-xs text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5">
                          {QUESTION_TYPE_LABELS[q.type]}
                        </span>
                        {q.topic && (
                          <span className="rounded border border-slate-200 px-1.5 py-0.5">
                            {q.topic}
                          </span>
                        )}
                      </span>
                      <MarkdownLatex className="line-clamp-2 text-sm text-slate-800 [&_p]:my-0">
                        {q.stemMd}
                      </MarkdownLatex>
                    </span>
                  </label>
                </li>
              ))}
              {bankList.data?.items.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-slate-500">{t('bankEmpty')}</li>
              )}
            </ul>
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={bank.page <= 1}
                  onClick={() => setBank({ ...bank, page: bank.page - 1 })}
                >
                  {t('prev')}
                </Button>
                <span className="tabular-nums">{t('page', { page: bank.page, pages })}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={bank.page >= pages}
                  onClick={() => setBank({ ...bank, page: bank.page + 1 })}
                >
                  {t('next')}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <Field label={t('setTitle')} htmlFor="pub-title" error={errors.title}>
            <Input
              id="pub-title"
              value={effective.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('setTitlePlaceholder')}
              maxLength={120}
              aria-invalid={Boolean(errors.title)}
            />
          </Field>
          <SubjectGradeFields
            idPrefix="pub-set"
            subject={effective.subject}
            grade={effective.grade}
            onSubjectChange={(v) => setForm({ ...form, subject: v })}
            onGradeChange={(v) => setForm({ ...form, grade: v })}
            errors={{ subject: errors.subject ?? '', grade: errors.grade ?? '' }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('topic')} htmlFor="pub-topic" error={errors.topic}>
              <Input
                id="pub-topic"
                list="pub-topics"
                value={effective.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder={t('topicPlaceholder')}
                maxLength={80}
                autoComplete="off"
              />
              <datalist id="pub-topics">
                {(setFacets.data?.topics ?? []).map((tp) => (
                  <option key={tp} value={tp} />
                ))}
              </datalist>
            </Field>
            <Field label={t('sourceField')} htmlFor="pub-source" error={errors.source}>
              <Input
                id="pub-source"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder={t('sourcePlaceholder')}
                maxLength={200}
              />
            </Field>
          </div>
          <Field label={t('description')} htmlFor="pub-description" error={errors.description}>
            <Textarea
              id="pub-description"
              rows={3}
              maxLength={2000}
              value={effective.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('descriptionPlaceholder')}
            />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">{t('publishAs')}</legend>
            {PUBLISH_STATUSES.map((s) => (
              <label key={s} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="pub-status"
                  className="mt-1 accent-accent"
                  checked={form.status === s}
                  onChange={() => setForm({ ...form, status: s })}
                />
                <span>
                  <span className="font-medium text-slate-900">{SHARED_SET_STATUS_LABELS[s]}</span>
                  <span className="block text-slate-500">{t(`statusHint.${s}`)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-accent"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              aria-invalid={Boolean(errors.agree)}
            />
            <span className={cn(errors.agree && 'text-red-600')}>
              {t('agree')}
              {errors.agree && <span className="block text-xs">{errors.agree}</span>}
            </span>
          </label>
        </div>

        {publish.isError && <Alert variant="error">{errorMessage(publish.error)}</Alert>}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-sm text-slate-500">{t('questions', { count: questionCount })}</span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button type="submit" loading={publish.isPending}>
              {t('publishSubmit')}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
