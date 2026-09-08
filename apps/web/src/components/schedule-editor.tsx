'use client';

import type { ScheduleItem } from '@lophoc/shared';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function ScheduleEditor({
  value,
  onChange,
}: {
  value: ScheduleItem[];
  onChange: (items: ScheduleItem[]) => void;
}) {
  const t = useTranslations('Classes');

  function update(index: number, patch: Partial<ScheduleItem>) {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            aria-label={t('weekday')}
            className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm"
            value={item.weekday}
            onChange={(e) => update(i, { weekday: Number(e.target.value) })}
          >
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {t(`weekdays.${d}`)}
              </option>
            ))}
          </select>
          <Input
            type="time"
            aria-label={t('start')}
            value={item.start}
            onChange={(e) => update(i, { start: e.target.value })}
            className="w-auto"
          />
          <span className="text-slate-400">–</span>
          <Input
            type="time"
            aria-label={t('end')}
            value={item.end}
            onChange={(e) => update(i, { end: e.target.value })}
            className="w-auto"
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('addScheduleRow')}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange([...value, { weekday: 1, start: '18:00', end: '19:30' }])}
      >
        <Plus className="size-4" />
        {t('addScheduleRow')}
      </Button>
    </div>
  );
}
