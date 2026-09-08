'use client';

import { type ParseResult, parseQuestions, type QuestionSource } from '@lophoc/shared';
import { ArrowLeft, FileText, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  type BatchTags,
  type EditableQuestion,
  fromParsed,
  toInput,
  validateEditable,
} from '@/components/questions/editable';
import { ManualEditor } from '@/components/questions/manual-editor';
import { QuestionGrid } from '@/components/questions/question-grid';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { errorMessage } from '@/lib/api';
import { useBulkCreateQuestions, useImportDocx, useQuestionFacets } from '@/lib/questions';

type TabId = 'paste' | 'docx' | 'ai' | 'manual';

export default function ImportQuestionsPage() {
  const t = useTranslations('Import');
  const tq = useTranslations('Questions');
  const [tab, setTab] = useState<TabId>('paste');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<EditableQuestion[]>([]);
  const [meta, setMeta] = useState<{ answerKeyFound: boolean; skipped: number } | null>(null);
  const [source, setSource] = useState<QuestionSource>('paste');
  const [batch, setBatch] = useState<BatchTags>({
    subject: '',
    grade: '',
    topic: '',
    difficulty: '',
  });
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const facets = useQuestionFacets();
  const importDocx = useImportDocx();
  const bulk = useBulkCreateQuestions();

  function applyResult(result: ParseResult, src: QuestionSource) {
    setRows(result.questions.map(fromParsed));
    setSource(src);
    setSavedCount(null);
    setMeta({ answerKeyFound: result.answerKeyFound, skipped: result.skippedLines });
  }

  async function onDocx(file: File | undefined) {
    if (!file) return;
    const result = await importDocx.mutateAsync(file).catch(() => null);
    if (fileRef.current) fileRef.current.value = '';
    if (result) applyResult(result, 'docx');
  }

  const validRows = rows.filter((r) => validateEditable(r, source).length === 0);
  const invalidCount = rows.length - validRows.length;

  async function saveAll() {
    if (validRows.length === 0) return;
    const result = await bulk.mutateAsync({
      source,
      questions: validRows.map((r) => toInput(r, source, batch)),
    });
    const savedIds = new Set(validRows.map((r) => r.localId));
    setRows(rows.filter((r) => !savedIds.has(r.localId)));
    setSavedCount(result.created);
  }

  const tabs = [
    { id: 'paste' as const, label: t('tabs.paste') },
    { id: 'docx' as const, label: t('tabs.docx') },
    { id: 'ai' as const, label: t('tabs.ai') },
    { id: 'manual' as const, label: t('tabs.manual') },
  ];
  const showGrid = tab !== 'manual' && rows.length > 0 && meta !== null;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/app/questions"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          {tq('title')}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'paste' && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <label htmlFor="paste-text" className="block text-sm font-medium text-slate-700">
            {t('pasteLabel')}
          </label>
          <Textarea
            id="paste-text"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('pastePlaceholder')}
            className="font-mono text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{t('pasteHint')}</p>
            <Button
              onClick={() => applyResult(parseQuestions(text), 'paste')}
              disabled={text.trim().length === 0}
            >
              <FileText className="size-4" />
              {t('parse')}
            </Button>
          </div>
        </div>
      )}

      {tab === 'docx' && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <input
            ref={fileRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => onDocx(e.target.files?.[0])}
          />
          <Button
            variant="secondary"
            size="lg"
            loading={importDocx.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            {t('docxLabel')}
          </Button>
          <p className="text-xs text-slate-500">{t('docxHint')}</p>
          {importDocx.isError && <Alert variant="error">{errorMessage(importDocx.error)}</Alert>}
        </div>
      )}

      {tab === 'ai' && <Alert variant="info">{t('aiSoon')}</Alert>}

      {tab === 'manual' && (
        <ManualEditor batch={batch} onBatchChange={setBatch} facets={facets.data} />
      )}

      {tab !== 'manual' && savedCount !== null && (
        <Alert variant="success">
          {t('saved', { count: savedCount })}{' '}
          {rows.length > 0 && t('remaining', { count: rows.length })}{' '}
          <Link href="/app/questions" className="font-medium underline">
            {t('goToBank')}
          </Link>
        </Alert>
      )}

      {showGrid && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-slate-800">
              {t('parsed', { count: rows.length, invalid: invalidCount })}
            </span>
            <span className={meta.answerKeyFound ? 'text-green-700' : 'text-amber-700'}>
              {meta.answerKeyFound ? t('answerKeyFound') : t('answerKeyMissing')}
            </span>
            {meta.skipped > 0 && (
              <span className="text-slate-500">{t('skipped', { count: meta.skipped })}</span>
            )}
          </div>

          <QuestionGrid
            rows={rows}
            onChange={setRows}
            batch={batch}
            onBatchChange={setBatch}
            source={source}
            facets={facets.data}
          />

          {bulk.isError && <Alert variant="error">{errorMessage(bulk.error)}</Alert>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setRows([]);
                setMeta(null);
                setSavedCount(null);
              }}
            >
              {t('clear')}
            </Button>
            <Button
              size="lg"
              onClick={saveAll}
              loading={bulk.isPending}
              disabled={validRows.length === 0}
            >
              {validRows.length === 0
                ? t('nothingValid')
                : t('saveAll', { count: validRows.length })}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
