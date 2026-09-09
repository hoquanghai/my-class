'use client';

import type { QuestionSource } from '@lophoc/shared';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { type BatchTags, type EditableQuestion, validateEditable } from './editable';
import { QuestionFields } from './question-fields';

export interface QuestionGridProps {
  rows: EditableQuestion[];
  onChange: (rows: EditableQuestion[]) => void;
  /** Phân loại của cả đợt (môn/khối/chủ đề), dùng khi kiểm tra hợp lệ từng hàng. */
  batch: BatchTags;
  source: QuestionSource;
}

/** Lưới xem trước và sửa: mỗi hàng một câu, hàng lỗi tô đỏ, sửa tại chỗ. */
export function QuestionGrid({ rows, onChange, batch, source }: QuestionGridProps) {
  const t = useTranslations('Import');

  const update = (localId: string, q: EditableQuestion) =>
    onChange(rows.map((r) => (r.localId === localId ? q : r)));
  const remove = (localId: string) => onChange(rows.filter((r) => r.localId !== localId));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-2">{t('colNo')}</th>
            <th className="px-3 py-2">{t('colContent')}</th>
            <th className="w-44 px-3 py-2">{t('colIssues')}</th>
            <th className="w-12 px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => {
            const errors = validateEditable(row, source, batch);
            const invalid = errors.length > 0;
            return (
              <tr key={row.localId} className={cn('align-top', invalid && 'bg-red-50/60')}>
                <td className="px-3 py-3 font-semibold text-slate-500">{i + 1}</td>
                <td className="px-3 py-3">
                  <QuestionFields value={row} onChange={(q) => update(row.localId, q)} compact />
                </td>
                <td className="px-3 py-3">
                  {invalid ? (
                    <ul className="space-y-1 text-xs text-red-700" role="alert">
                      {errors.map((e) => (
                        <li key={e}>• {e}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                      <CheckCircle2 className="size-4" />
                      {t('ok')}
                    </span>
                  )}
                </td>
                <td className="px-2 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t('removeRow')}
                    title={t('removeRow')}
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => remove(row.localId)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
