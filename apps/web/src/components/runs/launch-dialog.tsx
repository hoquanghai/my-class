'use client';

import { type LaunchRunInput, launchRunSchema, type RunMode } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiError, errorMessage } from '@/lib/api';
import { useQuizzes } from '@/lib/quizzes';
import { useLaunchRun } from '@/lib/runs';

export function LaunchDialog({
  sessionId,
  open,
  onClose,
}: {
  sessionId: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('Runs');
  const tc = useTranslations('Common');
  const router = useRouter();
  const quizzes = useQuizzes();
  const launch = useLaunchRun(sessionId);

  const [quizId, setQuizId] = useState('');
  const [mode, setMode] = useState<RunMode>('paced');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [minutes, setMinutes] = useState('10');
  const [error, setError] = useState<string | null>(null);

  const usable = (quizzes.data ?? []).filter((q) => q.questionCount > 0);
  const effectiveQuizId = quizId || usable[0]?.id || '';

  async function submit() {
    setError(null);
    const parsed = launchRunSchema.safeParse({
      quizId: effectiveQuizId,
      mode,
      shuffleQuestions,
      shuffleOptions,
      selfPacedMinutes: mode === 'self_paced' ? Number(minutes) : undefined,
    } satisfies Partial<LaunchRunInput>);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? tc('errorGeneric'));
      return;
    }
    try {
      const detail = await launch.mutateAsync(parsed.data);
      router.push(`/app/runs/${detail.state.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'RUN_ACTIVE' ? t('runActive') : errorMessage(err),
      );
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('launchTitle')}>
      <div className="space-y-4">
        {quizzes.data && usable.length === 0 ? (
          <Alert variant="warning">
            {t('noQuizzes')}{' '}
            <Link href="/app/quizzes" className="font-medium underline">
              {t('pickQuiz')}
            </Link>
          </Alert>
        ) : (
          <Field label={t('pickQuiz')} htmlFor="launch-quiz">
            <Select
              id="launch-quiz"
              className="w-full"
              value={effectiveQuizId}
              onChange={(e) => setQuizId(e.target.value)}
            >
              {usable.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.questionCount} câu)
                </option>
              ))}
            </Select>
          </Field>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">{t('mode')}</legend>
          {(['paced', 'self_paced'] as const).map((m) => (
            <label
              key={m}
              className={cn(
                'flex cursor-pointer gap-3 rounded-lg border p-3',
                mode === m ? 'border-brand-600 bg-brand-50' : 'border-slate-200',
              )}
            >
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-slate-900">
                  {m === 'paced' ? t('paced') : t('selfPaced')}
                </span>
                <span className="block text-sm text-slate-500">
                  {m === 'paced' ? t('pacedHint') : t('selfPacedHint')}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === 'self_paced' && (
          <Field label={t('minutes')} htmlFor="launch-minutes">
            <Input
              id="launch-minutes"
              type="number"
              min={1}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-32"
            />
          </Field>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
            />
            {t('shuffleQuestions')}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
            />
            {t('shuffleOptions')}
          </label>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button onClick={submit} loading={launch.isPending} disabled={!effectiveQuizId}>
            {t('launch')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
