'use client';

import type { RunAnswerDto, RunDetailDto, RunQuestionDto } from '@lophoc/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Monitor, Play, SkipForward, Square, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CopyButton } from '@/components/copy-button';
import { Countdown } from '@/components/runs/countdown';
import { Leaderboard } from '@/components/runs/leaderboard';
import { QuestionPanel } from '@/components/runs/question-panel';
import { ResultPanel } from '@/components/runs/result-panel';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { runKeys, useOverrideAnswer, useRunAction, useRunDetail } from '@/lib/runs';
import { useSessionSocket } from '@/lib/socket';
import { studentJoinDisplay, studentJoinUrl } from '@/lib/student-origin';

const STATUS_STYLE = {
  lobby: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-green-100 text-green-800',
  finished: 'bg-brand-50 text-brand-700',
} as const;

function QuestionReview({
  question,
  detail,
  onOverride,
  busy,
}: {
  question: RunQuestionDto;
  detail: RunDetailDto;
  onOverride: (answerId: string, isCorrect: boolean) => void;
  busy: boolean;
}) {
  const t = useTranslations('Runs');
  const nameOf = new Map(detail.state.participants.map((p) => [p.studentId, p.name]));
  const answers = detail.answers.filter((a) => a.runQuestionId === question.id);
  const optionLabel = (id: string) =>
    question.snapshot.options.find((o) => o.id === id)?.label ?? '?';
  const result = detail.results.find((r) => r.runQuestionId === question.id);

  return (
    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer items-center gap-3 p-3">
        <span className="font-semibold text-slate-500">{question.index + 1}</span>
        <span className="line-clamp-1 flex-1 text-slate-900">{question.snapshot.stemMd}</span>
        <span className="text-sm text-slate-500">
          {answers.filter((a) => a.isCorrect).length}/{answers.length}
        </span>
      </summary>
      <div className="space-y-4 border-t border-slate-100 p-3">
        <QuestionPanel
          question={{
            ...question.snapshot,
            runQuestionId: question.id,
            index: question.index,
            timeLimitSec: question.timeLimitSec,
            points: question.points,
          }}
          correctOptionIds={question.snapshot.correctOptionIds}
          acceptedAnswers={question.snapshot.acceptedAnswers}
        />
        {result && <ResultPanel result={result} />}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 font-medium">{t('name')}</th>
              <th className="py-1 font-medium">{t('answers')}</th>
              <th className="py-1 text-right font-medium">{t('score')}</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {[...answers]
              .sort((a, b) =>
                (nameOf.get(a.studentId) ?? '').localeCompare(nameOf.get(b.studentId) ?? '', 'vi'),
              )
              .map((a: RunAnswerDto) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="py-1.5">{nameOf.get(a.studentId) ?? '—'}</td>
                  <td className="py-1.5">
                    {a.textAnswer ?? a.selectedOptionIds.map(optionLabel).join(', ')}
                    {a.overriddenByTeacher && (
                      <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">
                        {t('overridden')}
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      'py-1.5 text-right tabular-nums',
                      a.isCorrect ? 'text-green-700' : 'text-red-600',
                    )}
                  >
                    {a.pointsAwarded}
                  </td>
                  <td className="py-1.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => onOverride(a.id, !a.isCorrect)}
                      title={a.isCorrect ? t('markWrong') : t('markCorrect')}
                    >
                      {a.isCorrect ? <X className="size-4" /> : <Check className="size-4" />}
                      {a.isCorrect ? t('markWrong') : t('markCorrect')}
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default function RunControlPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Runs');
  const queryClient = useQueryClient();
  const detail = useRunDetail(id);
  const action = useRunAction(id);
  const override = useOverrideAnswer(id);
  const sessionId = detail.data?.state.sessionId ?? null;
  const rt = useSessionSocket(
    sessionId,
    useMemo(() => ({ role: 'teacher' as const }), []),
  );

  // Mỗi lần server phát run:state → tải lại chi tiết (bài nộp, kết quả)
  const rtVersion = rt.runState
    ? `${rt.runState.status}:${rt.runState.currentIndex}:${rt.runState.questionClosedAt}:${rt.runState.currentAnswerCount}:${rt.runState.participants.length}`
    : '';
  useEffect(() => {
    if (rtVersion) void queryClient.invalidateQueries({ queryKey: runKeys.detail(id) });
  }, [rtVersion, queryClient, id]);

  const [autoClosed, setAutoClosed] = useState<string | null>(null);
  const closeNow = useCallback(() => {
    const st = detail.data?.state;
    if (!st || st.mode !== 'paced' || st.status !== 'in_progress' || st.questionClosedAt) return;
    const key = `${st.id}:${st.currentIndex}`;
    if (autoClosed === key) return;
    setAutoClosed(key);
    action.mutate('close');
  }, [detail.data, action, autoClosed]);

  if (detail.isPending) {
    return (
      <div className="flex justify-center py-12 text-slate-400">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (detail.isError || !detail.data)
    return <Alert variant="error">{errorMessage(detail.error)}</Alert>;

  const run = detail.data;
  // Ưu tiên trạng thái realtime (mới hơn) cho các con số; chi tiết dùng dữ liệu HTTP
  const state = rt.runState && rt.runState.id === run.state.id ? rt.runState : run.state;
  const current = state.currentQuestion;
  const openedAt = state.questionOpenedAt ? Date.parse(state.questionOpenedAt) : null;
  const closed = state.questionClosedAt !== null;
  const joinUrl = studentJoinUrl(state.classCode);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/app/sessions/${state.sessionId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          {t('backToSession')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{state.quizTitle}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{state.className}</span>
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 text-xs font-semibold',
                  STATUS_STYLE[state.status],
                )}
              >
                {t(`status.${state.status}`)}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {t(`modeLabel.${state.mode}`)}
              </span>
              {!rt.connected && sessionId && <Spinner className="size-3" />}
            </p>
          </div>
          <Link
            href={`/present/${state.sessionId}`}
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Monitor className="size-4" />
            {t('present')}
          </Link>
        </div>
      </div>

      {(action.isError || override.isError || rt.error) && (
        <Alert variant="error">{rt.error ?? errorMessage(action.error ?? override.error)}</Alert>
      )}

      {state.status === 'lobby' && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2 text-slate-700">
            <span>{t('joinHint', { url: studentJoinDisplay(state.classCode) })}</span>
            <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-lg font-bold tracking-widest text-white">
              {state.classCode}
            </span>
            <CopyButton text={joinUrl} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              {t('joined', { count: state.participants.length })}
            </p>
            {state.participants.length === 0 ? (
              <p className="text-sm text-slate-500">{t('joinedNone')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {state.participants.map((p) => (
                  <span
                    key={p.studentId}
                    className="rounded-md bg-brand-50 px-2 py-1 text-sm text-brand-700"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button size="lg" onClick={() => action.mutate('start')} loading={action.isPending}>
            <Play className="size-5" />
            {t('start')}
          </Button>
        </section>
      )}

      {state.status === 'in_progress' && state.mode === 'paced' && current && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className="text-lg font-semibold text-slate-900">
              {t('questionOf', { index: current.index + 1, total: state.questionCount })}
            </span>
            {closed ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">
                {t('closed')}
              </span>
            ) : (
              openedAt !== null && (
                <Countdown
                  endsAt={openedAt + current.timeLimitSec * 1000}
                  offsetMs={rt.offsetMs}
                  totalMs={current.timeLimitSec * 1000}
                  onExpire={closeNow}
                  className="w-64"
                />
              )
            )}
            <span className="text-sm text-slate-600">
              {t('answered', { count: state.currentAnswerCount, total: state.participants.length })}
            </span>
            <div className="flex gap-2">
              {!closed && (
                <Button
                  variant="secondary"
                  onClick={() => action.mutate('close')}
                  loading={action.isPending}
                >
                  <Square className="size-4" />
                  {t('closeQuestion')}
                </Button>
              )}
              <Button onClick={() => action.mutate('next')} loading={action.isPending}>
                <SkipForward className="size-4" />
                {current.index + 1 >= state.questionCount ? t('finish') : t('nextQuestion')}
              </Button>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <QuestionPanel
                question={current}
                correctOptionIds={closed ? state.currentResult?.correctOptionIds : undefined}
                acceptedAnswers={closed ? state.currentResult?.acceptedAnswers : undefined}
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              {closed && state.currentResult ? (
                <ResultPanel result={state.currentResult} />
              ) : (
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">{t('progress')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {state.participants.map((p) => {
                      const done = run.answers.some(
                        (a) =>
                          a.studentId === p.studentId && a.runQuestionId === current.runQuestionId,
                      );
                      return (
                        <span
                          key={p.studentId}
                          className={cn(
                            'rounded-md px-2 py-1 text-sm',
                            done ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          {p.name}
                        </span>
                      );
                    })}
                    {state.participants.length === 0 && (
                      <span className="text-sm text-slate-500">{t('waitingStudents')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {state.status === 'in_progress' && state.mode === 'self_paced' && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {state.deadlineAt && (
              <Countdown
                endsAt={Date.parse(state.deadlineAt)}
                offsetMs={rt.offsetMs}
                className="w-48"
              />
            )}
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm(t('finishConfirm'))) action.mutate('finish');
              }}
              loading={action.isPending}
            >
              <Square className="size-4" />
              {t('finish')}
            </Button>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">{t('progress')}</p>
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {state.participants.map((p) => (
                <li key={p.studentId} className="flex items-center gap-2 text-sm">
                  <span className="w-32 truncate">{p.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{
                        width: `${(p.answeredCount / Math.max(1, state.questionCount)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right tabular-nums text-slate-500">
                    {p.answeredCount}/{state.questionCount}
                  </span>
                </li>
              ))}
            </ul>
            {state.participants.length === 0 && (
              <p className="text-sm text-slate-500">{t('waitingStudents')}</p>
            )}
          </div>
        </section>
      )}

      {state.status === 'finished' && state.leaderboard && (
        <section className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{t('leaderboard')}</h2>
            <Leaderboard entries={state.leaderboard} totalPoints={state.totalPoints} />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{t('review')}</h2>
            {run.questions.map((q) => (
              <QuestionReview
                key={q.id}
                question={q}
                detail={run}
                busy={override.isPending}
                onOverride={(answerId, isCorrect) => override.mutate({ answerId, isCorrect })}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
