'use client';

import {
  type AttendanceRecordDto,
  type AttendanceStatus,
  type AttendanceUpdateItem,
  nextAttendanceStatus,
} from '@lophoc/shared';
import { ArrowLeft, MessageSquare, Star, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { STATUS_ORDER, STATUS_STYLES } from '@/components/attendance-status';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import {
  useEndSession,
  useSessionDetail,
  useSessionFeedback,
  useUpdateAttendance,
} from '@/lib/sessions';

function NoteDialog({
  record,
  onClose,
  onSave,
  saving,
}: {
  record: AttendanceRecordDto | null;
  onClose: () => void;
  onSave: (note: string) => void;
  saving: boolean;
}) {
  const t = useTranslations('Attendance');
  const tc = useTranslations('Common');
  const [note, setNote] = useState(record?.note ?? '');
  return (
    <Dialog
      open={record !== null}
      onClose={onClose}
      title={t('noteFor', { name: record?.name ?? '' })}
    >
      <div className="space-y-4">
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('notePlaceholder')}
          maxLength={200}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => onSave(note)} loading={saving}>
            {tc('save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function FeedbackDialog({
  open,
  onClose,
  onSubmit,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  saving: boolean;
}) {
  const t = useTranslations('Attendance');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  return (
    <Dialog open={open} onClose={onClose} title={t('feedbackTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{t('feedbackHint')}</p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} sao`}
              onClick={() => setRating(n)}
              className="rounded p-1 transition hover:scale-110"
            >
              <Star
                className={cn(
                  'size-9',
                  n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
                )}
              />
            </button>
          ))}
        </div>
        <Textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('feedbackComment')}
          maxLength={500}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('feedbackSkip')}
          </Button>
          <Button
            disabled={rating === 0}
            loading={saving}
            onClick={() => onSubmit(rating, comment)}
          >
            {t('feedbackSend')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Attendance');
  const detail = useSessionDetail(id);
  const update = useUpdateAttendance(id);
  const end = useEndSession(id);
  const feedback = useSessionFeedback(id);

  const [undoStack, setUndoStack] = useState<AttendanceUpdateItem[][]>([]);
  const [noteFor, setNoteFor] = useState<AttendanceRecordDto | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [thanks, setThanks] = useState(false);

  if (detail.isPending) {
    return (
      <div className="flex justify-center py-12 text-slate-400">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    return <Alert variant="error">{errorMessage(detail.error)}</Alert>;
  }

  const session = detail.data;
  const active = session.status === 'active';

  function snapshot(ids: string[]): AttendanceUpdateItem[] {
    return session.records
      .filter((r) => ids.includes(r.studentId))
      .map((r) => ({ studentId: r.studentId, status: r.status, note: r.note }));
  }

  function apply(updates: AttendanceUpdateItem[]) {
    setUndoStack((stack) => [...stack, snapshot(updates.map((u) => u.studentId))]);
    update.mutate(updates);
  }

  function cycle(record: AttendanceRecordDto) {
    apply([{ studentId: record.studentId, status: nextAttendanceStatus(record.status) }]);
  }

  function markAll(status: AttendanceStatus) {
    apply(session.records.map((r) => ({ studentId: r.studentId, status })));
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setUndoStack((stack) => stack.slice(0, -1));
    update.mutate(previous);
  }

  async function endSession() {
    if (!window.confirm(t('endConfirm'))) return;
    await end.mutateAsync();
    if (!session.hasFeedback) setFeedbackOpen(true);
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/app/classes/${session.classId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          {t('backToClass')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{session.className}</h1>
            <p className="text-sm text-slate-500">
              {t('title')} · {formatDateTime(session.startedAt)}
              {!active && (
                <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {t('ended')}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled title={t('quizSoon')}>
              {t('quizSoon')}
            </Button>
            {active && (
              <Button variant="danger" onClick={endSession} loading={end.isPending}>
                {t('endSession')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {thanks && <Alert variant="success">{t('feedbackThanks')}</Alert>}
      {(update.isError || end.isError) && (
        <Alert variant="error">{errorMessage(update.error ?? end.error)}</Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_ORDER.map((s) => (
          <span
            key={s}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', STATUS_STYLES[s].chip)}
          >
            {t(`status.${s}`)}: {session.summary[s]}
          </span>
        ))}
        <span className="text-sm text-slate-500">/ {session.summary.total}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => markAll('present')}>
          {t('allPresent')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => markAll('absent')}>
          {t('allAbsent')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={undo}
          disabled={undoStack.length === 0 || update.isPending}
        >
          <Undo2 className="size-4" />
          {t('undo')}
        </Button>
      </div>

      <p className="text-xs text-slate-500">{t('tapHint')}</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {session.records.map((r) => (
          <div key={r.studentId} className="relative">
            <button
              type="button"
              onClick={() => cycle(r)}
              disabled={update.isPending}
              className={cn(
                'flex min-h-20 w-full flex-col items-start justify-between rounded-xl border-2 p-3 text-left transition disabled:opacity-70',
                STATUS_STYLES[r.status].tile,
              )}
            >
              <span className="pr-8 font-semibold leading-tight">{r.name}</span>
              <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                {t(`status.${r.status}`)}
              </span>
              {r.note && <span className="mt-1 line-clamp-1 text-xs opacity-80">{r.note}</span>}
            </button>
            <button
              type="button"
              aria-label={t('noteFor', { name: r.name })}
              onClick={() => setNoteFor(r)}
              className={cn(
                'absolute right-2 top-2 rounded-md p-1 hover:bg-white/70',
                r.note ? 'text-brand-700' : 'text-slate-400',
              )}
            >
              <MessageSquare className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {noteFor && (
        <NoteDialog
          key={noteFor.studentId}
          record={noteFor}
          onClose={() => setNoteFor(null)}
          saving={update.isPending}
          onSave={(note) => {
            apply([
              { studentId: noteFor.studentId, status: noteFor.status, note: note.trim() || null },
            ]);
            setNoteFor(null);
          }}
        />
      )}

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        saving={feedback.isPending}
        onSubmit={async (rating, comment) => {
          await feedback.mutateAsync({ rating, comment: comment.trim() || null });
          setFeedbackOpen(false);
          setThanks(true);
        }}
      />
    </div>
  );
}
