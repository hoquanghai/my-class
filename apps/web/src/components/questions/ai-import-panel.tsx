'use client';

import {
  AI_IMPORT_ACCEPT,
  aiFileKindByName,
  type AiJobDto,
  isWordFileName,
  type ParseResult,
} from '@lophoc/shared';
import { Sparkles, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { useAiImport, useAiQuota } from '@/lib/questions';

const MAX_IMAGES = 10;

/**
 * Tải đề (ảnh, PDF, Word, LaTeX, văn bản) và gọi trích xuất AI. Môn/khối lấy từ khối phân loại
 * của trang (gợi ý cho AI); chưa phân loại đủ thì `onBlocked` được gọi để trang hiện lỗi.
 */
export function AiImportPanel({
  hints,
  ready,
  onBlocked,
  onResult,
}: {
  hints: { subject: string; grade: string };
  ready: boolean;
  onBlocked: () => void;
  onResult: (result: ParseResult) => void;
}) {
  const t = useTranslations('Ai');
  const quota = useAiQuota();
  const run = useAiImport();
  const [files, setFiles] = useState<File[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ status: AiJobDto['status']; seconds: number } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const kinds = files.map((f) => aiFileKindByName(f.name));
  const images = kinds.filter((k) => k === 'image').length;
  const docs = files.length - images;
  const unsupported = files.filter((_, i) => kinds[i] === null).map((f) => f.name);
  const invalidMix = docs > 1 || (docs === 1 && images > 0);
  const tooMany = images > MAX_IMAGES;
  const hasWord = files.some((f) => isWordFileName(f.name));
  const estimatedPages = docs === 0 ? images : null;

  function addFiles(list: FileList | null) {
    if (!list) return;
    // Sao chép ngay: FileList gắn với input sẽ rỗng sau khi reset value bên dưới
    const added = Array.from(list);
    setFiles((prev) => [...prev, ...added].slice(0, MAX_IMAGES + 1));
    if (fileRef.current) fileRef.current.value = '';
  }

  async function start() {
    if (files.length === 0 || invalidMix || tooMany || unsupported.length > 0) return;
    if (!ready) {
      onBlocked();
      return;
    }
    setProgress({ status: 'pending', seconds: 0 });
    setWarnings([]);
    try {
      const job = await run.mutateAsync({
        files,
        subject: hints.subject,
        grade: hints.grade,
        onProgress: (status, elapsed) =>
          setProgress({ status, seconds: Math.round(elapsed / 1000) }),
      });
      setWarnings(job.warnings);
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
        accept={AI_IMPORT_ACCEPT}
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
      </div>
      <p className="text-xs text-slate-500">{t('selectHint')}</p>

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
      {unsupported.length > 0 && (
        <Alert variant="error">{t('unsupported', { names: unsupported.join(', ') })}</Alert>
      )}
      {invalidMix && <Alert variant="error">{t('mixError')}</Alert>}
      {tooMany && <Alert variant="error">{t('tooMany', { max: MAX_IMAGES })}</Alert>}
      {hasWord && <Alert variant="warning">{t('wordHint')}</Alert>}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={start}
          loading={run.isPending}
          disabled={
            files.length === 0 ||
            invalidMix ||
            tooMany ||
            unsupported.length > 0 ||
            quota.data?.enabled === false
          }
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
      {warnings.length > 0 && (
        <Alert variant="warning">
          <ul className="space-y-1">
            {warnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </Alert>
      )}
      <p className="text-xs text-slate-500">{t('reviewNote')}</p>
    </div>
  );
}
