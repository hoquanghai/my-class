'use client';

import { createQuizSchema } from '@lophoc/shared';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useCreateQuiz, useDeleteQuiz, useQuizzes } from '@/lib/quizzes';

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('Quizzes');
  const tc = useTranslations('Common');
  const router = useRouter();
  const create = useCreateQuiz();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('30');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const parsed = createQuizSchema.safeParse({
      title,
      description: description || null,
      defaultTimeLimitSec: Number(time),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? tc('errorGeneric'));
      return;
    }
    try {
      const quiz = await create.mutateAsync(parsed.data);
      router.push(`/app/quizzes/${quiz.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('create')}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label={t('name')} htmlFor="quiz-title">
          <Input
            id="quiz-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('namePlaceholder')}
            maxLength={150}
          />
        </Field>
        <Field label={`${t('description')} (${tc('optional')})`} htmlFor="quiz-desc">
          <Textarea
            id="quiz-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </Field>
        <Field label={t('defaultTime')} htmlFor="quiz-time">
          <Input
            id="quiz-time"
            type="number"
            min={5}
            max={600}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-32"
          />
        </Field>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
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

export default function QuizzesPage() {
  const t = useTranslations('Quizzes');
  const quizzes = useQuizzes();
  const remove = useDeleteQuiz();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          {t('create')}
        </Button>
      </div>

      {quizzes.isError && <Alert variant="error">{errorMessage(quizzes.error)}</Alert>}
      {remove.isError && <Alert variant="error">{errorMessage(remove.error)}</Alert>}

      {quizzes.isPending ? (
        <div className="flex justify-center py-12 text-slate-400">
          <Spinner className="size-6" />
        </div>
      ) : quizzes.data && quizzes.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          <ClipboardList className="mx-auto mb-3 size-8 text-slate-300" />
          {t('empty')}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.data?.map((quiz) => (
            <li
              key={quiz.id}
              className="relative rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-500"
            >
              <Link href={`/app/quizzes/${quiz.id}`} className="block">
                <h2 className="pr-8 font-semibold text-slate-900">{quiz.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {t('questionsCount', { count: quiz.questionCount, points: quiz.totalPoints })}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {t('updated', { time: formatDateTime(quiz.updatedAt) })}
                </p>
              </Link>
              <button
                type="button"
                aria-label={t('delete')}
                title={t('delete')}
                className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => {
                  if (window.confirm(t('deleteConfirm', { title: quiz.title }))) {
                    remove.mutate(quiz.id);
                  }
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && <CreateDialog open onClose={() => setCreating(false)} />}
    </div>
  );
}
