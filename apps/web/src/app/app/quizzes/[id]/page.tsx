'use client';

import { QUESTION_TYPE_LABELS, type QuizItemDto } from '@lophoc/shared';
import { ArrowDown, ArrowLeft, ArrowUp, Globe, Plus, Shuffle, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { MarkdownLatex } from '@/components/markdown-latex';
import { AddFromBankDialog } from '@/components/quizzes/add-from-bank-dialog';
import { AddRandomDialog } from '@/components/quizzes/add-random-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import {
  useQuiz,
  useRemoveQuizItem,
  useReorderQuizItems,
  useUpdateQuiz,
  useUpdateQuizItem,
} from '@/lib/quizzes';

/** Ô nhập số lưu khi blur/Enter, giữ nguyên nếu không đổi. */
function NumberCell({
  value,
  placeholder,
  min,
  max,
  onCommit,
  label,
}: {
  value: number | null;
  placeholder?: string;
  min: number;
  max: number;
  onCommit: (v: number | null) => void;
  label: string;
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  function commit() {
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (next !== null && (Number.isNaN(next) || next < min || next > max)) {
      setDraft(value === null ? '' : String(value));
      return;
    }
    if (next !== value) onCommit(next);
  }
  return (
    <Input
      aria-label={label}
      type="number"
      min={min}
      max={max}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className="h-9 w-20 px-2 text-center"
    />
  );
}

function ItemRow({
  item,
  index,
  total,
  defaultTime,
  onMove,
  onRemove,
  onUpdate,
  busy,
}: {
  item: QuizItemDto;
  index: number;
  total: number;
  defaultTime: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (patch: { timeLimitSec?: number | null; points?: number }) => void;
  busy: boolean;
}) {
  const t = useTranslations('Quizzes');
  const q = item.question;
  return (
    <li className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold text-slate-500">{index + 1}</span>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('moveUp')}
          disabled={index === 0 || busy}
          onClick={() => onMove(-1)}
          className="h-7 px-1"
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('moveDown')}
          disabled={index === total - 1 || busy}
          onClick={() => onMove(1)}
          className="h-7 px-1"
        >
          <ArrowDown className="size-4" />
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap gap-1 text-xs text-slate-500">
          <span className="rounded bg-slate-100 px-1.5 py-0.5">{QUESTION_TYPE_LABELS[q.type]}</span>
          {q.topic && (
            <span className="rounded border border-slate-200 px-1.5 py-0.5">{q.topic}</span>
          )}
        </div>
        <MarkdownLatex className="text-slate-900">{q.stemMd}</MarkdownLatex>
        {q.options.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-600">
            {q.options.map((o) => (
              <li
                key={o.id}
                className={cn('flex gap-1', o.isCorrect && 'font-medium text-green-800')}
              >
                <span>{o.label}.</span>
                <MarkdownLatex>{o.contentMd}</MarkdownLatex>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          {t('timeSec')}
          <NumberCell
            label={t('timeSec')}
            value={item.timeLimitSec}
            placeholder={String(defaultTime)}
            min={5}
            max={600}
            onCommit={(v) => onUpdate({ timeLimitSec: v })}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          {t('points')}
          <NumberCell
            label={t('points')}
            value={item.points}
            min={1}
            max={100}
            onCommit={(v) => onUpdate({ points: v ?? 1 })}
          />
        </label>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('remove')}
          title={t('remove')}
          disabled={busy}
          onClick={onRemove}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

export default function QuizBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Quizzes');
  const quiz = useQuiz(id);
  const update = useUpdateQuiz(id);
  const updateItem = useUpdateQuizItem(id);
  const removeItem = useRemoveQuizItem(id);
  const reorder = useReorderQuizItems(id);
  const [addOpen, setAddOpen] = useState(false);
  const [randomOpen, setRandomOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);

  if (quiz.isPending) {
    return (
      <div className="flex justify-center py-12 text-slate-400">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (quiz.isError || !quiz.data) return <Alert variant="error">{errorMessage(quiz.error)}</Alert>;

  const data = quiz.data;
  const busy = updateItem.isPending || removeItem.isPending || reorder.isPending;
  const mutationError = [update, updateItem, removeItem, reorder].find((m) => m.isError)?.error;

  function move(index: number, dir: -1 | 1) {
    const ids = data.items.map((i) => i.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorder.mutate(ids);
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/app/quizzes"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          {t('back')}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              aria-label={t('name')}
              value={titleDraft ?? data.title}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                const next = (titleDraft ?? data.title).trim();
                if (next && next !== data.title) update.mutate({ title: next });
                setTitleDraft(null);
              }}
              maxLength={150}
              className="h-auto border-transparent px-1 text-2xl font-bold hover:border-slate-300 focus:border-brand-500"
            />
            <div className="flex flex-wrap items-center gap-3 px-1 text-sm text-slate-600">
              <span>
                {t('questionsCount', { count: data.questionCount, points: data.totalPoints })}
              </span>
              <label className="flex items-center gap-1.5">
                {t('defaultTime')}
                <Input
                  aria-label={t('defaultTime')}
                  type="number"
                  min={5}
                  max={600}
                  value={timeDraft ?? String(data.defaultTimeLimitSec)}
                  onChange={(e) => setTimeDraft(e.target.value)}
                  onBlur={() => {
                    const n = Number(timeDraft);
                    if (
                      timeDraft !== null &&
                      n >= 5 &&
                      n <= 600 &&
                      n !== data.defaultTimeLimitSec
                    ) {
                      update.mutate({ defaultTimeLimitSec: n });
                    }
                    setTimeDraft(null);
                  }}
                  className="h-8 w-20 px-2 text-center"
                />
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.items.length > 0 && (
              <Link
                href={`/app/community?publish=${data.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <Globe className="size-4" />
                {t('shareToCommunity')}
              </Link>
            )}
            <Button variant="secondary" onClick={() => setRandomOpen(true)}>
              <Shuffle className="size-4" />
              {t('addRandom')}
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              {t('addFromBank')}
            </Button>
          </div>
        </div>
      </div>

      {mutationError && <Alert variant="error">{errorMessage(mutationError)}</Alert>}

      {data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          {t('noItems')}
        </div>
      ) : (
        <ul className="space-y-2">
          {data.items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              index={index}
              total={data.items.length}
              defaultTime={data.defaultTimeLimitSec}
              busy={busy}
              onMove={(dir) => move(index, dir)}
              onRemove={() => removeItem.mutate(item.id)}
              onUpdate={(patch) => updateItem.mutate({ itemId: item.id, ...patch })}
            />
          ))}
        </ul>
      )}

      <p className="text-sm text-slate-500">{t('launchHint')}</p>

      {addOpen && <AddFromBankDialog quiz={data} open onClose={() => setAddOpen(false)} />}
      {randomOpen && <AddRandomDialog quizId={id} open onClose={() => setRandomOpen(false)} />}
    </div>
  );
}
