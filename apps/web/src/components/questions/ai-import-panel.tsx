'use client';

import type { AiJobDto, ParseResult } from '@lophoc/shared';
import { Sparkles, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api';
import { useAiImport, useAiQuota } from '@/lib/questions';
import { FacetDatalists } from './question-fields';

const MAX_IMAGES = 10;

export function AiImportPanel({ onResult }: { onResult: (result: ParseResult) => void }) {
  const t = useTranslations('Ai');
  const tq = useTranslations('Questions');
  const quota = useAiQuota();
  const run = useAiImport();
  const [files, setFiles] = useState<File[]>([]);
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [progress, setProgress] = useState<{ status: AiJobDto['status']; seconds: number } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const pdf = files.find((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
  const invalidMix = pdf !== undefined && files.length > 1;
  const tooMany = files.length > MAX_IMAGES;
  const estimatedPages = pdf ? null : files.length;

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, MAX_IMAGES + 1));
    if (fileRef.current) fileRef.current.value = '';
  }

  async function start() {
    if (files.length === 0 || invalidMix || tooMany) return;
    setProgress({ status: 'pending', seconds: 0 });
    try {
      const job = await run.mutateAsync({
        files,
        subject,
        grade,
        onProgress: (status, elapsed) =>
          setProgress({ status, seconds: Math.round(elapsed / 1000) }),
      });
      if (job.result) onResult(job.result);
      setFiles([]);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      {quota.data && (
        <p className="text-sm text-slate-600">
          {quota.data.enabled
            ? t('quota', {
                remaining: quota.data.remaining,
                limit: quota.data.limit,
                month: quota.data.month,
              })
            : t('disabled')}
        </p>
      )}
      {quota.data?.enabled === false && <Alert variant="warning">{t('disabledHint')}</Alert>}

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={run.isPending}
        >
          <Upload className="size-4" />
          {t('select')}
        </Button>
        <span className="text-xs text-slate-500">{t('selectHint')}</span>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
            >
              {f.name}
              <button
                type="button"
                aria-label={`Bỏ ${f.name}`}
                className="rounded p-0.5 hover:bg-slate-200"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {invalidMix && <Alert variant="error">{t('mixError')}</Alert>}
      {tooMany && <Alert variant="error">{t('tooMany', { max: MAX_IMAGES })}</Alert>}

      <div className="grid max-w-md grid-cols-2 gap-2">
        <Input
          list="facet-subjects"
          placeholder={`${tq('subject')} (gợi ý cho AI)`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Input
          list="facet-grades"
          placeholder={`${tq('grade')} (gợi ý cho AI)`}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        />
        <FacetDatalists />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={start}
          loading={run.isPending}
          disabled={files.length === 0 || invalidMix || tooMany || quota.data?.enabled === false}
        >
          <Sparkles className="size-4" />
          {t('extract')}
        </Button>
        {estimatedPages !== null && estimatedPages > 0 && !run.isPending && (
          <span className="text-xs text-slate-500">
            {t('pagesNote', { count: estimatedPages })}
          </span>
        )}
        {progress && (
          <span className="text-sm text-brand-700">
            {t('processing', { seconds: progress.seconds })}
          </span>
        )}
      </div>

      {run.isError && <Alert variant="error">{errorMessage(run.error)}</Alert>}
      <p className="text-xs text-slate-500">{t('reviewNote')}</p>
    </div>
  );
}
