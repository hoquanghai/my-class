'use client';

import { QUESTION_TYPE_LABELS, QUESTION_TYPES } from '@lophoc/shared';
import { Eye, Pencil, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MarkdownLatex } from '@/components/markdown-latex';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ClassifyInputs } from './classify-fields';
import { applyType, type EditableQuestion, nextLabel, relabel, toggleCorrect } from './editable';

export interface QuestionFieldsProps {
  value: EditableQuestion;
  onChange: (q: EditableQuestion) => void;
  /** Hiện các ô thẻ (môn/khối/chủ đề/mức độ) — dùng trong hộp thoại sửa. */
  showTags?: boolean;
  compact?: boolean;
}

export function QuestionFields({ value, onChange, showTags, compact }: QuestionFieldsProps) {
  const t = useTranslations('Questions');
  const [preview, setPreview] = useState(false);
  const isChoice = value.type !== 'short_text';

  return (
    <div className={cn('space-y-3', compact && 'text-sm')}>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label={t('type')}
          value={value.type}
          onChange={(e) => onChange(applyType(value, e.target.value as EditableQuestion['type']))}
          className={compact ? 'h-8 text-xs' : undefined}
        >
          {QUESTION_TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {QUESTION_TYPE_LABELS[tp]}
            </option>
          ))}
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
          title={preview ? 'Sửa' : 'Xem trước'}
        >
          {preview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
          {preview ? 'Sửa' : 'Xem trước'}
        </Button>
      </div>

      {preview ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <MarkdownLatex className="font-medium">{value.stemMd || '_(trống)_'}</MarkdownLatex>
          {isChoice && (
            <ul className="mt-2 space-y-1">
              {value.options.map((o) => (
                <li
                  key={o.label}
                  className={cn(
                    'flex gap-2 rounded px-2 py-1',
                    o.isCorrect && 'bg-green-100 font-medium',
                  )}
                >
                  <span className="w-5 shrink-0 font-semibold">{o.label}.</span>
                  <MarkdownLatex>{o.contentMd || '_(trống)_'}</MarkdownLatex>
                </li>
              ))}
            </ul>
          )}
          {!isChoice && value.acceptedAnswers.length > 0 && (
            <p className="mt-2 text-sm text-green-800">
              {t('answer')}: {value.acceptedAnswers.join(' / ')}
            </p>
          )}
          {value.explanationMd && (
            <div className="mt-2 border-t border-slate-200 pt-2 text-sm text-slate-600">
              <MarkdownLatex>{value.explanationMd}</MarkdownLatex>
            </div>
          )}
        </div>
      ) : (
        <>
          <Textarea
            aria-label={t('stem')}
            rows={compact ? 2 : 3}
            value={value.stemMd}
            onChange={(e) => onChange({ ...value, stemMd: e.target.value })}
            placeholder={t('stem')}
            className={compact ? 'text-sm' : undefined}
          />

          {isChoice ? (
            <div className="space-y-1.5">
              {value.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    title={t('correctHint')}
                    aria-pressed={o.isCorrect}
                    onClick={() => onChange(toggleCorrect(value, i))}
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition',
                      o.isCorrect
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-green-500',
                    )}
                  >
                    {o.label}
                  </button>
                  <Input
                    aria-label={`${t('options')} ${o.label}`}
                    value={o.contentMd}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        options: value.options.map((x, j) =>
                          j === i ? { ...x, contentMd: e.target.value } : x,
                        ),
                      })
                    }
                    className={cn('h-8', compact && 'text-sm')}
                  />
                  {value.type !== 'true_false' && value.options.length > 2 && (
                    <button
                      type="button"
                      aria-label={`Bỏ phương án ${o.label}`}
                      onClick={() =>
                        onChange({
                          ...value,
                          options: relabel(value.options.filter((_, j) => j !== i)),
                        })
                      }
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {value.type !== 'true_false' && value.options.length < 8 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange({
                      ...value,
                      options: [
                        ...value.options,
                        { label: nextLabel(value.options), contentMd: '', isCorrect: false },
                      ],
                    })
                  }
                >
                  <Plus className="size-4" />
                  {t('addOption')}
                </Button>
              )}
            </div>
          ) : (
            <Textarea
              aria-label={t('acceptedAnswers')}
              rows={2}
              value={value.acceptedAnswers.join('\n')}
              onChange={(e) => onChange({ ...value, acceptedAnswers: e.target.value.split('\n') })}
              placeholder={t('acceptedAnswers')}
              className={compact ? 'text-sm' : undefined}
            />
          )}

          {!compact && (
            <Textarea
              aria-label={t('explanation')}
              rows={2}
              value={value.explanationMd}
              onChange={(e) => onChange({ ...value, explanationMd: e.target.value })}
              placeholder={t('explanation')}
            />
          )}
        </>
      )}

      {showTags && (
        <ClassifyInputs
          value={{
            subject: value.subject,
            grade: value.grade,
            topic: value.topic,
            difficulty: value.difficulty,
          }}
          onChange={(c) => onChange({ ...value, ...c })}
          showErrors
        />
      )}
    </div>
  );
}
