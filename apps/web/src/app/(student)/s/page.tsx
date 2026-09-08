'use client';

import type { PublicQuestion, StudentAnswerView, StudentRunViewDto } from '@lophoc/shared';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CloudOff, Trophy, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Countdown } from '@/components/runs/countdown';
import { QuestionPanel } from '@/components/runs/question-panel';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Spinner } from '@/components/ui/spinner';
import { ApiError, errorMessage } from '@/lib/api';
import { useSessionSocket } from '@/lib/socket';
import {
  getStudentToken,
  setStudentToken,
  type SubmitOutcome,
  useAnswerQueue,
  useStudentMe,
  useStudentRunView,
} from '@/lib/student';

/** Một câu hỏi: chọn → nộp; sau khi nộp khóa lại; công bố đáp án khi có `revealed`. */
function AnswerCard({
  question,
  mine,
  revealed,
  pending,
  deadline,
  offsetMs,
  onSubmit,
  outcome,
}: {
  question: PublicQuestion;
  mine: StudentAnswerView | undefined;
  revealed: StudentRunViewDto['revealed'][number] | undefined;
  pending: boolean;
  /** Hạn nộp câu này (ms epoch server) nếu có */
  deadline: number | null;
  offsetMs: number;
  onSubmit: (input: {
    selectedOptionIds?: string[];
    textAnswer?: string;
    responseMs: number;
  }) => Promise<SubmitOutcome>;
  outcome: SubmitOutcome | null;
}) {
  const t = useTranslations('Student');
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const submitted = mine !== undefined || pending;
  const canSubmit = question.type === 'short_text' ? text.trim().length > 0 : selected.length > 0;

  async function submit() {
    if (!canSubmit || sending) return;
    setSending(true);
    const responseMs = Math.max(0, Date.now() - openedAt);
    await onSubmit(
      question.type === 'short_text'
        ? { textAnswer: text.trim(), responseMs }
        : { selectedOptionIds: selected, responseMs },
    );
    setSending(false);
  }

  const shownSelected = mine?.selectedOptionIds ?? selected;
  const shownText = mine?.textAnswer ?? text;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {deadline !== null && !submitted && (
        <Countdown endsAt={deadline} offsetMs={offsetMs} totalMs={question.timeLimitSec * 1000} />
      )}
      <QuestionPanel
        question={question}
        selected={shownSelected}
        textAnswer={shownText}
        onSelect={submitted ? undefined : setSelected}
        onText={submitted ? undefined : setText}
        disabled={submitted}
        correctOptionIds={revealed?.correctOptionIds}
        acceptedAnswers={revealed?.acceptedAnswers}
        textPlaceholder={t('textPlaceholder')}
      />
      {!submitted ? (
        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit} loading={sending}>
          {t('submit')}
        </Button>
      ) : pending ? (
        <Alert variant="warning">
          <span className="flex items-center gap-2">
            <CloudOff className="size-4" />
            {t('queued')}
          </span>
        </Alert>
      ) : revealed && mine ? (
        <Alert variant={mine.isCorrect ? 'success' : 'error'}>
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4" />
            {mine.isCorrect ? t('correct') : t('wrong')}
          </span>
        </Alert>
      ) : outcome?.kind === 'closed' ? (
        <Alert variant="warning">{t('closedLate')}</Alert>
      ) : (
        <Alert variant="info">{t('submitted')}</Alert>
      )}
      {revealed?.explanationMd && mine && (
        <details className="text-sm text-slate-700">
          <summary className="cursor-pointer font-medium">Lời giải</summary>
          <div className="mt-1 whitespace-pre-wrap">{revealed.explanationMd}</div>
        </details>
      )}
    </form>
  );
}

export default function StudentHomePage() {
  const t = useTranslations('Student');
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useStudentMe({ pollMs: 10_000 });
  const sessionId = me.data?.session?.id ?? null;
  const auth = useMemo(() => {
    const token = getStudentToken();
    return { role: 'student' as const, token: token ?? undefined };
  }, []);
  const rt = useSessionSocket(sessionId, auth);
  const runState = rt.runState;
  const runId = runState?.id ?? me.data?.run?.id ?? null;
  const version = runState
    ? `${runState.status}:${runState.currentIndex}:${runState.questionClosedAt ?? ''}`
    : `${me.data?.run?.status ?? ''}`;
  const view = useStudentRunView(runId, version);
  const queue = useAnswerQueue(rt.connectCount);
  const [selfIndex, setSelfIndex] = useState(0);

  // Token hỏng/bị gỡ → về trang nhập mã
  useEffect(() => {
    if (me.isError && me.error instanceof ApiError && me.error.status === 401) {
      setStudentToken(null);
      router.replace('/join');
    }
  }, [me.isError, me.error, router]);

  // Sau khi nộp thành công / hàng đợi gửi xong → tải lại góc nhìn để có myAnswers
  const pendingCount = queue.pending.length;
  useEffect(() => {
    if (runId) void queryClient.invalidateQueries({ queryKey: ['student', 'runs', runId] });
  }, [pendingCount, runId, queryClient]);

  if (me.isPending) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (me.isError || !me.data) {
    return <Alert variant="error">{errorMessage(me.error)}</Alert>;
  }

  const student = me.data.student;
  const header = (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-slate-500">{student.className}</p>
        <p className="text-lg font-semibold text-slate-900">{t('hello', { name: student.name })}</p>
      </div>
      <div className="flex items-center gap-2">
        {sessionId && !rt.connected && (
          <span className="flex items-center gap-1 text-xs text-amber-700">
            <WifiOff className="size-4" />
            {t('reconnecting')}
          </span>
        )}
        <button
          type="button"
          className="text-xs text-slate-500 underline"
          onClick={() => {
            setStudentToken(null);
            queryClient.clear();
            router.replace('/join');
          }}
        >
          {t('leave')}
        </button>
      </div>
    </div>
  );

  if (!sessionId) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          {t('waitingSession')}
        </div>
      </div>
    );
  }

  if (!runState || !view.data) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <Spinner className="size-5" />
          {rt.sessionState?.status === 'ended' ? t('sessionEnded') : t('waitingRun')}
        </div>
      </div>
    );
  }

  const data = view.data;
  const answerFor = (rqId: string) => data.myAnswers.find((a) => a.runQuestionId === rqId);
  const revealedFor = (rqId: string) => data.revealed.find((r) => r.runQuestionId === rqId);
  const submitFor =
    (rqId: string) =>
    (input: { selectedOptionIds?: string[]; textAnswer?: string; responseMs: number }) =>
      queue.submit(runState.id, { runQuestionId: rqId, ...input }).then((o) => {
        void queryClient.invalidateQueries({ queryKey: ['student', 'runs', runState.id] });
        return o;
      });

  return (
    <div className="space-y-5">
      {header}
      <p className="text-sm text-slate-500">{t('quiz', { title: runState.quizTitle })}</p>

      {runState.status === 'lobby' && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <Spinner className="size-5" />
          {t('waitingRun')}
        </div>
      )}

      {runState.status === 'in_progress' &&
        runState.mode === 'paced' &&
        (runState.currentQuestion ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-500">
              Câu {runState.currentQuestion.index + 1}/{runState.questionCount}
            </p>
            <AnswerCard
              key={runState.currentQuestion.runQuestionId}
              question={runState.currentQuestion}
              mine={answerFor(runState.currentQuestion.runQuestionId)}
              revealed={revealedFor(runState.currentQuestion.runQuestionId)}
              pending={queue.pending.includes(runState.currentQuestion.runQuestionId)}
              deadline={
                runState.questionOpenedAt && !runState.questionClosedAt
                  ? Date.parse(runState.questionOpenedAt) +
                    runState.currentQuestion.timeLimitSec * 1000
                  : null
              }
              offsetMs={rt.offsetMs}
              onSubmit={submitFor(runState.currentQuestion.runQuestionId)}
              outcome={queue.lastOutcome}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            {t('waitingReveal')}
          </div>
        ))}

      {runState.status === 'in_progress' &&
        runState.mode === 'self_paced' &&
        data.questions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
              <span className="text-sm text-slate-600">
                {t('done', { done: data.myAnswers.length, total: data.questions.length })}
              </span>
              {runState.deadlineAt && (
                <Countdown endsAt={Date.parse(runState.deadlineAt)} offsetMs={rt.offsetMs} />
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {data.questions.map((q, i) => (
                <button
                  key={q.runQuestionId}
                  type="button"
                  onClick={() => setSelfIndex(i)}
                  className={cn(
                    'size-9 rounded-lg border text-sm font-semibold',
                    i === selfIndex
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : answerFor(q.runQuestionId)
                        ? 'border-green-300 bg-green-50 text-green-800'
                        : 'border-slate-200 bg-white text-slate-700',
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            {(() => {
              const q = data.questions[Math.min(selfIndex, data.questions.length - 1)]!;
              return (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <AnswerCard
                    key={q.runQuestionId}
                    question={q}
                    mine={answerFor(q.runQuestionId)}
                    revealed={revealedFor(q.runQuestionId)}
                    pending={queue.pending.includes(q.runQuestionId)}
                    deadline={null}
                    offsetMs={rt.offsetMs}
                    onSubmit={submitFor(q.runQuestionId)}
                    outcome={queue.lastOutcome}
                  />
                </div>
              );
            })()}
            <div className="flex justify-between">
              <Button
                variant="secondary"
                disabled={selfIndex === 0}
                onClick={() => setSelfIndex((i) => i - 1)}
              >
                {t('prev')}
              </Button>
              <Button
                variant="secondary"
                disabled={selfIndex >= data.questions.length - 1}
                onClick={() => setSelfIndex((i) => i + 1)}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        )}

      {runState.status === 'finished' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
            <Trophy className="mx-auto mb-2 size-10 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">{t('resultTitle')}</h2>
            {data.myResult ? (
              <>
                <p className="mt-2 text-3xl font-bold text-brand-700">
                  {t('yourScore', { score: data.myResult.score, total: runState.totalPoints })}
                </p>
                <p className="mt-1 text-slate-700">
                  {t('yourRank', {
                    rank: data.myResult.rank,
                    count: runState.leaderboard?.length ?? data.myResult.rank,
                  })}
                </p>
              </>
            ) : (
              <p className="mt-2 text-slate-600">{t('notRanked')}</p>
            )}
          </div>
          {data.revealed.length > 0 && data.myAnswers.length > 0 && (
            <ul className="space-y-2">
              {data.revealed.map((r, i) => {
                const mine = answerFor(r.runQuestionId);
                if (!mine) return null;
                return (
                  <li
                    key={r.runQuestionId}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                      mine.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
                    )}
                  >
                    <span>Câu {i + 1}</span>
                    <span className="font-semibold">
                      {mine.isCorrect ? t('correct') : t('wrong')}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
