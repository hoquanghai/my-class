'use client';

import {
  PARSE_ISSUE_LABELS,
  parseQuestions,
  QUESTION_TYPE_LABELS,
  type QuestionSource,
} from '@lophoc/shared';
import { ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  type ClipboardEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MarkdownLatex } from '@/components/markdown-latex';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Textarea } from '@/components/ui/input';
import { errorMessage } from '@/lib/api';
import { useBulkCreateQuestions, useUploadImage } from '@/lib/questions';
import { BatchTagsFields } from './batch-tags';
import {
  type BatchTags,
  type EditableQuestion,
  fromParsed,
  newLocalId,
  toInput,
  validateEditable,
} from './editable';

const SOURCE: QuestionSource = 'manual';
const OPTION_LINE = /^\s*\*?\s*\(?([A-Ha-h])\s*[.)]/;
const PLAIN_ENTER_LINE = /^(đáp án|dap an|lời giải|loi giai|giải thích|giai thich|hướng dẫn)/i;

interface Card {
  localId: string;
  text: string;
}

/** Chuyển nội dung một ô soạn thành câu hỏi (dùng lại parser của phần dán). */
function cardToQuestion(text: string): { q: EditableQuestion; issues: string[] } | null {
  if (!text.trim()) return null;
  const body = text.replace(/^\s*(?:câu|bài)\s*\d+\s*[:.)\-]*\s*/i, '');
  const parsed = parseQuestions(`Câu 1. ${body}`).questions[0];
  if (!parsed) return null;
  const q = fromParsed(parsed);
  const issues = [
    ...parsed.issues.filter((i) => i !== 'no_options').map((i) => PARSE_ISSUE_LABELS[i]),
    ...validateEditable(q, SOURCE),
  ];
  return { q, issues: [...new Set(issues)] };
}

function nextOptionLabel(text: string): string {
  const labels = text
    .split('\n')
    .map((l) => OPTION_LINE.exec(l)?.[1]?.toUpperCase())
    .filter((l): l is string => Boolean(l));
  const last = labels.at(-1);
  return last ? String.fromCharCode(last.charCodeAt(0) + 1) : 'A';
}

function currentLineRange(value: string, caret: number): { start: number; end: number } {
  const start = value.lastIndexOf('\n', caret - 1) + 1;
  const nl = value.indexOf('\n', caret);
  return { start, end: nl === -1 ? value.length : nl };
}

function CardEditor({
  card,
  index,
  onChange,
  onRemove,
  onNext,
  onPrev,
  focusRequested,
  onFocused,
}: {
  card: Card;
  index: number;
  onChange: (text: string) => void;
  onRemove: () => void;
  onNext: () => void;
  onPrev: () => void;
  focusRequested: boolean;
  onFocused: () => void;
}) {
  const t = useTranslations('Manual');
  const ref = useRef<HTMLTextAreaElement>(null);
  const caretRef = useRef<number | null>(null);
  const upload = useUploadImage();
  const parsed = useMemo(() => cardToQuestion(card.text), [card.text]);

  useEffect(() => {
    if (focusRequested && ref.current) {
      ref.current.focus();
      onFocused();
    }
  }, [focusRequested, onFocused]);

  useEffect(() => {
    if (caretRef.current !== null && ref.current) {
      ref.current.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  }, [card.text]);

  function insertAt(text: string, start: number, end: number) {
    const value = card.text;
    onChange(value.slice(0, start) + text + value.slice(end));
    caretRef.current = start + text.length;
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    const { selectionStart, selectionEnd, value } = ta;
    const line = currentLineRange(value, selectionStart);
    const currentLine = value.slice(line.start, line.end);

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!OPTION_LINE.test(currentLine)) return;
      const toggled = /^\s*\*/.test(currentLine)
        ? currentLine.replace(/^\s*\*\s*/, '')
        : `*${currentLine.trimStart()}`;
      onChange(value.slice(0, line.start) + toggled + value.slice(line.end));
      caretRef.current = line.start + toggled.length;
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (PLAIN_ENTER_LINE.test(currentLine.trim())) return;
      e.preventDefault();
      insertAt(
        `\n${nextOptionLabel(value.slice(0, selectionStart))}. `,
        selectionStart,
        selectionEnd,
      );
    }
  }

  async function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart, selectionEnd } = ta;
    const result = await upload.mutateAsync(file).catch(() => null);
    if (result) insertAt(`\n![](${result.url})\n`, selectionStart, selectionEnd);
  }

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            {t('question', { n: index + 1 })}
          </span>
          <div className="flex items-center gap-1">
            {upload.isPending && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <ImageIcon className="size-3.5" /> {t('uploading')}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('remove')}
              title={t('remove')}
              className="text-red-600 hover:bg-red-50"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        <Textarea
          ref={ref}
          rows={7}
          value={card.text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={t('placeholder')}
          className="font-mono text-sm"
          aria-label={t('question', { n: index + 1 })}
        />
      </div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
        {parsed ? (
          <>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {QUESTION_TYPE_LABELS[parsed.q.type]}
            </p>
            <MarkdownLatex className="font-medium text-slate-900">
              {parsed.q.stemMd || '_(trống)_'}
            </MarkdownLatex>
            {parsed.q.options.length > 0 && (
              <ul className="mt-2 space-y-1">
                {parsed.q.options.map((o) => (
                  <li
                    key={o.label}
                    className={cn(
                      'flex gap-2 rounded px-2 py-0.5',
                      o.isCorrect && 'bg-green-100 font-medium text-green-900',
                    )}
                  >
                    <span className="w-5 shrink-0 font-semibold">{o.label}.</span>
                    <MarkdownLatex>{o.contentMd || '_(trống)_'}</MarkdownLatex>
                  </li>
                ))}
              </ul>
            )}
            {parsed.q.type === 'short_text' && parsed.q.acceptedAnswers.length > 0 && (
              <p className="mt-2 text-green-800">Đáp án: {parsed.q.acceptedAnswers.join(' / ')}</p>
            )}
            {parsed.issues.length > 0 ? (
              <ul className="mt-2 text-xs text-red-700" role="alert">
                {parsed.issues.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs font-medium text-green-700">{t('valid')}</p>
            )}
          </>
        ) : (
          <p className="text-slate-400">{t('previewEmpty')}</p>
        )}
      </div>
    </div>
  );
}

export function ManualEditor({
  batch,
  onBatchChange,
  facets,
}: {
  batch: BatchTags;
  onBatchChange: (b: BatchTags) => void;
  facets?: { subjects: string[]; grades: string[]; topics: string[] };
}) {
  const t = useTranslations('Manual');
  const ti = useTranslations('Import');
  const [cards, setCards] = useState<Card[]>([{ localId: newLocalId(), text: '' }]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const bulk = useBulkCreateQuestions();

  const parsedCards = cards.map((c) => ({ card: c, parsed: cardToQuestion(c.text) }));
  const valid = parsedCards.filter((p) => p.parsed && p.parsed.issues.length === 0);

  function addCard(afterIndex?: number) {
    const card = { localId: newLocalId(), text: '' };
    setCards((cs) => {
      const i = afterIndex === undefined ? cs.length : afterIndex + 1;
      return [...cs.slice(0, i), card, ...cs.slice(i)];
    });
    setFocusId(card.localId);
  }

  function focusIndex(i: number) {
    const target = cards[i];
    if (target) setFocusId(target.localId);
  }

  async function saveAll() {
    if (valid.length === 0) return;
    const result = await bulk.mutateAsync({
      source: SOURCE,
      questions: valid.map((v) => toInput(v.parsed!.q, SOURCE, batch)),
    });
    const savedIds = new Set(valid.map((v) => v.card.localId));
    const remaining = cards.filter((c) => !savedIds.has(c.localId));
    setCards(remaining.length ? remaining : [{ localId: newLocalId(), text: '' }]);
    setSavedCount(result.created);
  }

  return (
    <div className="space-y-4">
      <Alert variant="info">
        <ul className="space-y-0.5">
          <li>• {t('hintEnter')}</li>
          <li>• {t('hintCtrlEnter')}</li>
          <li>• {t('hintTab')}</li>
          <li>• {t('hintExtra')}</li>
        </ul>
      </Alert>

      <BatchTagsFields batch={batch} onChange={onBatchChange} facets={facets} />

      {savedCount !== null && (
        <Alert variant="success">
          {ti('saved', { count: savedCount })}{' '}
          <Link href="/app/questions" className="font-medium underline">
            {ti('goToBank')}
          </Link>
        </Alert>
      )}

      <div className="space-y-3">
        {cards.map((card, i) => (
          <CardEditor
            key={card.localId}
            card={card}
            index={i}
            onChange={(text) =>
              setCards((cs) => cs.map((c) => (c.localId === card.localId ? { ...c, text } : c)))
            }
            onRemove={() =>
              setCards((cs) =>
                cs.length === 1
                  ? [{ localId: newLocalId(), text: '' }]
                  : cs.filter((c) => c.localId !== card.localId),
              )
            }
            onNext={() => (i === cards.length - 1 ? addCard(i) : focusIndex(i + 1))}
            onPrev={() => focusIndex(Math.max(0, i - 1))}
            focusRequested={focusId === card.localId}
            onFocused={() => setFocusId(null)}
          />
        ))}
      </div>

      {bulk.isError && <Alert variant="error">{errorMessage(bulk.error)}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => addCard()}>
          <Plus className="size-4" />
          {t('add')}
        </Button>
        <Button size="lg" onClick={saveAll} loading={bulk.isPending} disabled={valid.length === 0}>
          {valid.length === 0 ? ti('nothingValid') : ti('saveAll', { count: valid.length })}
        </Button>
      </div>
    </div>
  );
}
