'use client';

import {
  type ParseResult,
  type QuestionSource,
  SUBJECT_LABELS,
  type Subject,
} from '@lophoc/shared';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { AiImportPanel } from '@/components/questions/ai-import-panel';
import { BatchTagsFields } from '@/components/questions/batch-tags';
import { isClassified } from '@/components/questions/classify-fields';
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
import { Tabs } from '@/components/ui/tabs';
import { errorMessage } from '@/lib/api';
import { useBulkCreateQuestions } from '@/lib/questions';

type TabId = 'ai' | 'manual';

/** Nhập câu hỏi: phân loại (môn, khối, chủ đề) một lần cho cả đợt, rồi tạo bằng AI hoặc soạn tay. */
export default function ImportQuestionsPage() {
  const t = useTranslations('Import');
  const tq = useTranslations('Questions');
  const [tab, setTab] = useState<TabId>('ai');
  const [rows, setRows] = useState<EditableQuestion[]>([]);
  const [meta, setMeta] = useState<{ answerKeyFound: boolean; skipped: number } | null>(null);
  const [source, setSource] = useState<QuestionSource>('image_ai');
  const [batch, setBatch] = useState<BatchTags>({
    subject: '',
    grade: '',
    topic: '',
    difficulty: '',
  });
  const [showClassifyErrors, setShowClassifyErrors] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const bulk = useBulkCreateQuestions();

  const classified = isClassified(batch);

  function applyResult(result: ParseResult, src: QuestionSource) {
    setRows(result.questions.map(fromParsed));
    setSource(src);
    setSavedCount(null);
    setMeta({ answerKeyFound: result.answerKeyFound, skipped: result.skippedLines });
  }

  const validRows = rows.filter((r) => validateEditable(r, source, batch).length === 0);
  const invalidCount = rows.length - validRows.length;
  const markedCount = rows.filter(
    (r) => r.options.some((o) => o.isCorrect) || r.acceptedAnswers.length > 0,
  ).length;

  async function saveAll() {
    if (!classified) {
      setShowClassifyErrors(true);
      return;
    }
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
    { id: 'ai' as const, label: t('tabs.ai') },
    { id: 'manual' as const, label: t('tabs.manual') },
  ];
  const showGrid = tab === 'ai' && rows.length > 0 && meta !== null;

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

      <BatchTagsFields batch={batch} onChange={setBatch} showErrors={showClassifyErrors} />
      {showClassifyErrors && !classified && (
        <Alert variant="warning">{t('classifyRequired')}</Alert>
      )}

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'ai' && (
        <AiImportPanel
          hints={{
            subject: batch.subject ? SUBJECT_LABELS[batch.subject as Subject] : '',
            grade: batch.grade,
          }}
          ready={classified}
          onBlocked={() => setShowClassifyErrors(true)}
          onResult={(r) => applyResult(r, 'image_ai')}
        />
      )}

      {tab === 'manual' && (
        <ManualEditor
          batch={batch}
          ready={classified}
          onBlocked={() => setShowClassifyErrors(true)}
        />
      )}

      {tab === 'ai' && savedCount !== null && (
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
            <span className={markedCount > 0 ? 'text-green-700' : 'text-amber-700'}>
              {markedCount > 0
                ? t('aiAnswersMarked', { marked: markedCount, count: rows.length })
                : t('aiAnswersMissing')}
            </span>
            {meta.skipped > 0 && (
              <span className="text-slate-500">{t('skipped', { count: meta.skipped })}</span>
            )}
          </div>

          <QuestionGrid rows={rows} onChange={setRows} batch={batch} source={source} />

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
