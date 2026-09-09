'use client';

import { useTranslations } from 'next-intl';
import { ClassifyInputs } from './classify-fields';
import type { BatchTags } from './editable';

/** Khối phân loại áp dụng cho cả đợt nhập (AI hoặc soạn tay): môn, khối, chủ đề bắt buộc; mức độ tùy chọn. */
export function BatchTagsFields({
  batch,
  onChange,
  showErrors,
}: {
  batch: BatchTags;
  onChange: (b: BatchTags) => void;
  showErrors?: boolean;
}) {
  const t = useTranslations('Import');
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-800">{t('classify')}</h2>
      <p className="mb-3 text-xs text-slate-500">{t('classifyHint')}</p>
      <ClassifyInputs value={batch} onChange={onChange} showErrors={showErrors} />
    </section>
  );
}
