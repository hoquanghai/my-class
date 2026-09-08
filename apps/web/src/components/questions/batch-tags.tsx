'use client';

import { DIFFICULTIES, DIFFICULTY_LABELS } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { BatchTags } from './editable';
import { FacetDatalists } from './question-fields';

/** Thẻ (môn/khối/chủ đề/mức độ) áp dụng cho cả đợt nhập. */
export function BatchTagsFields({
  batch,
  onChange,
  facets,
}: {
  batch: BatchTags;
  onChange: (b: BatchTags) => void;
  facets?: { subjects: string[]; grades: string[]; topics: string[] };
}) {
  const t = useTranslations('Import');
  const tq = useTranslations('Questions');
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-sm font-medium text-slate-700">{t('batchTags')}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input
          list="facet-subjects"
          placeholder={tq('subject')}
          value={batch.subject}
          onChange={(e) => onChange({ ...batch, subject: e.target.value })}
        />
        <Input
          list="facet-grades"
          placeholder={tq('grade')}
          value={batch.grade}
          onChange={(e) => onChange({ ...batch, grade: e.target.value })}
        />
        <Input
          list="facet-topics"
          placeholder={tq('topic')}
          value={batch.topic}
          onChange={(e) => onChange({ ...batch, topic: e.target.value })}
        />
        <Select
          aria-label={tq('difficulty')}
          value={batch.difficulty}
          onChange={(e) =>
            onChange({ ...batch, difficulty: e.target.value as BatchTags['difficulty'] })
          }
        >
          <option value="">{tq('difficulty')}</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </Select>
        <FacetDatalists facets={facets} />
      </div>
    </div>
  );
}
