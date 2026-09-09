'use client';

import type {
  PublicQuestion,
  RunPublicStateDto,
  StudentAnswerView,
  StudentRunViewDto,
  SubmitAnswerInput,
} from '@lophoc/shared';
import { CheckCircle2, CloudOff, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Countdown } from '@/components/runs/countdown';
import { QuestionPanel } from '@/components/runs/question-panel';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Dialog } from '@/components/ui/dialog';
import type { SubmitOutcome } from '@/lib/student';

/** Lựa chọn tại máy, hiện ngay khi bấm; server nhận sau (hàng đợi chịu mất mạng). */
type Draft = { selectedOptionIds?: string[]; textAnswer?: string };

const TEXT_SAVE_DELAY_MS = 700;
const MAX_RESPONSE_MS = 3_600_000;

function hasContent(d: Draft | undefined): boolean {
  return Boolean(d?.selectedOptionIds?.length || d?.textAnswer?.trim());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Bài kiểm tra "tự làm" trên điện thoại học sinh: thấy cả đề, chọn đáp án là lưu ngay và được đổi
 * tới khi bấm **Nộp bài** (một lần duy nhất). Hết giờ thì tự nộp; server đồng thời chốt lượt và
 * trang cha chuyển sang màn hình kết quả khi trạng thái lượt đổi thành `finished`.
 */
export function SelfPacedQuiz({
  state,
  data,
  offsetMs,
  pending,
  saveAnswer,
  submitRun,
  submitting,
  submitError,
}: {
  state: RunPublicStateDto;
  data: StudentRunViewDto;
  offsetMs: number;
  /** runQuestionId đang chờ gửi lại vì mất mạng */
  pending: string[];
  saveAnswer: (input: SubmitAnswerInput) => Promise<SubmitOutcome>;
  submitRun: () => Promise<unknown>;
  submitting: boolean;
  submitError: string | null;
}) {
  const t = useTranslations('Student');
  const questions = data.questions;
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const textTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const dirtyText = useRef(new Map<string, string>());
  const autoSubmitted = useRef(false);

  const mineOf = useCallback(
    (rqId: string): StudentAnswerView | undefined =>
      data.myAnswers.find((a) => a.runQuestionId === rqId),
    [data.myAnswers],
  );
  const isAnswered = useCallback(
    (rqId: string) => hasContent(drafts[rqId]) || mineOf(rqId) !== undefined,
    [drafts, mineOf],
  );
  const answeredCount = useMemo(
    () => questions.filter((q) => isAnswered(q.runQuestionId)).length,
    [questions, isAnswered],
  );
  const unanswered = useMemo(
    () => questions.map((q, i) => (isAnswered(q.runQuestionId) ? null : i + 1)).filter(Boolean),
    [questions, isAnswered],
  );

  const responseMs = () => Math.min(MAX_RESPONSE_MS, Math.max(0, Date.now() - openedAt));

  function selectOptions(q: PublicQuestion, ids: string[]) {
    setDrafts((d) => ({ ...d, [q.runQuestionId]: { selectedOptionIds: ids } }));
    // Bỏ chọn hết (câu nhiều đáp án) thì giữ bản đã lưu trên server, không gửi rỗng
    if (ids.length === 0) return;
    void saveAnswer({
      runQuestionId: q.runQuestionId,
      selectedOptionIds: ids,
      responseMs: responseMs(),
    });
  }

  const saveText = useCallback(
    (rqId: string) => {
      const timer = textTimers.current.get(rqId);
      if (timer) clearTimeout(timer);
      textTimers.current.delete(rqId);
      const text = dirtyText.current.get(rqId)?.trim();
      dirtyText.current.delete(rqId);
      if (!text) return Promise.resolve(null);
      return saveAnswer({ runQuestionId: rqId, textAnswer: text, responseMs: responseMs() });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- responseMs chỉ đọc mốc mở đề
    [saveAnswer],
  );

  function typeText(q: PublicQuestion, text: string) {
    setDrafts((d) => ({ ...d, [q.runQuestionId]: { textAnswer: text } }));
    dirtyText.current.set(q.runQuestionId, text);
    const prev = textTimers.current.get(q.runQuestionId);
    if (prev) clearTimeout(prev);
    textTimers.current.set(
      q.runQuestionId,
      setTimeout(() => void saveText(q.runQuestionId), TEXT_SAVE_DELAY_MS),
    );
  }

  /** Gửi nốt câu tự luận đang gõ dở rồi nộp bài. */
  const doSubmit = useCallback(async () => {
    setConfirmOpen(false);
    await Promise.all([...dirtyText.current.keys()].map((id) => saveText(id)));
    await submitRun();
  }, [saveText, submitRun]);

  const onTimeUp = useCallback(() => {
    if (autoSubmitted.current) return;
    autoSubmitted.current = true;
    setTimeUp(true);
    void doSubmit().catch(() => {
      // server tự chốt lượt khi hết giờ; trang sẽ chuyển sang kết quả khi nhận trạng thái mới
    });
  }, [doSubmit]);

  useEffect(() => {
    const timers = textTimers.current;
    return () => timers.forEach((tm) => clearTimeout(tm));
  }, []);

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(total - 1, i)));
  const deadline = state.deadlineAt ? Date.parse(state.deadlineAt) : null;

  // ---------- Đã nộp: chờ kết quả ----------
  if (data.submittedAt) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-10 text-green-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t('submittedRun')}</h2>
          <p className="mt-1 text-sm text-slate-700">
            {t('submittedAt', {
              time: formatTime(data.submittedAt),
              done: data.myAnswers.length,
              total,
            })}
          </p>
          <p className="mt-3 text-sm text-slate-600">{t('waitingResult')}</p>
        </div>
        {deadline !== null && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <span>{t('timeLeftLabel')}</span>
            <Countdown endsAt={deadline} offsetMs={offsetMs} className="text-slate-700" />
          </div>
        )}
      </div>
    );
  }

  const q = questions[Math.min(index, total - 1)]!;
  const draft = drafts[q.runQuestionId];
  const mine = mineOf(q.runQuestionId);
  const shownSelected = draft?.selectedOptionIds ?? mine?.selectedOptionIds ?? [];
  const shownText = draft?.textAnswer ?? mine?.textAnswer ?? '';
  const busy = submitting || timeUp;

  return (
    <div className="space-y-3">
      {/* Thanh tiến độ + đồng hồ */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
        <span className="text-sm font-medium text-slate-700" aria-live="polite">
          {t('answeredCount', { done: answeredCount, total })}
        </span>
        {deadline !== null && (
          <Countdown endsAt={deadline} offsetMs={offsetMs} onExpire={onTimeUp} />
        )}
      </div>

      {/* Danh sách câu: màu theo trạng thái */}
      <nav aria-label={t('questionList')} className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {questions.map((item, i) => {
            const answered = isAnswered(item.runQuestionId);
            const current = i === index;
            return (
              <button
                key={item.runQuestionId}
                type="button"
                onClick={() => goTo(i)}
                aria-current={current ? 'step' : undefined}
                aria-label={`${t('questionN', { n: i + 1 })}: ${answered ? t('legendAnswered') : t('legendUnanswered')}`}
                className={cn(
                  'relative size-11 rounded-lg border-2 text-base font-semibold tabular-nums transition',
                  current
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : answered
                      ? 'border-green-400 bg-green-100 text-green-900'
                      : 'border-slate-300 bg-white text-slate-600',
                )}
              >
                {i + 1}
                {answered && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -top-1 -right-1 size-3 rounded-full border-2 border-white',
                      current ? 'bg-green-400' : 'bg-green-500',
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-2 border-brand-600 bg-brand-600" />
            {t('legendCurrent')}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-2 border-green-400 bg-green-100" />
            {t('legendAnswered')}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-2 border-slate-300 bg-white" />
            {t('legendUnanswered')}
          </li>
        </ul>
      </nav>

      {/* Câu đang xem */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-slate-500">
          {t('questionN', { n: index + 1 })}/{total}
        </p>
        <QuestionPanel
          key={q.runQuestionId}
          question={q}
          selected={shownSelected}
          textAnswer={shownText}
          onSelect={busy ? undefined : (ids) => selectOptions(q, ids)}
          onText={busy ? undefined : (text) => typeText(q, text)}
          disabled={busy}
          textPlaceholder={t('textPlaceholder')}
        />
        <p className="mt-3 text-xs text-slate-500">{t('changeHint')}</p>
      </div>

      {pending.length > 0 && (
        <Alert variant="warning">
          <span className="flex items-center gap-2">
            <CloudOff className="size-4" />
            {t('queued')}
          </span>
        </Alert>
      )}
      {timeUp && !submitError && <Alert variant="info">{t('timeUpSubmitting')}</Alert>}
      {submitError && <Alert variant="error">{submitError}</Alert>}

      {/* Điều hướng + nộp bài */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={index === 0 || busy}
          onClick={() => goTo(index - 1)}
        >
          {t('prev')}
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={index >= total - 1 || busy}
          onClick={() => goTo(index + 1)}
        >
          {t('next')}
        </Button>
      </div>
      <Button
        size="lg"
        className="w-full"
        loading={submitting}
        disabled={busy}
        onClick={() => (unanswered.length > 0 ? setConfirmOpen(true) : void doSubmit())}
      >
        <Send className="size-5" />
        {t('submitRun')}
        <span className="rounded-md bg-white/20 px-2 py-0.5 font-mono text-sm tabular-nums">
          {answeredCount}/{total}
        </span>
      </Button>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('submitConfirmTitle')}
      >
        <div className="space-y-3 text-slate-700">
          <p>
            {t('submitIncomplete', {
              count: unanswered.length,
              list: unanswered.map((n) => t('questionN', { n: n as number })).join(', '),
            })}
          </p>
          <p className="font-medium text-slate-900">{t('submitOnce')}</p>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" onClick={() => setConfirmOpen(false)}>
            {t('keepWorking')}
          </Button>
          <Button size="lg" onClick={() => void doSubmit()} loading={submitting}>
            {t('submitAnyway')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
