'use client';

import type { PublicQuestion } from '@lophoc/shared';
import { Check, X } from 'lucide-react';
import { MarkdownLatex } from '@/components/markdown-latex';
import { cn } from '@/components/ui/cn';
import { Input } from '@/components/ui/input';

export interface QuestionPanelProps {
  question: PublicQuestion;
  /** Phương án đang chọn (học sinh) hoặc đã nộp */
  selected?: string[];
  textAnswer?: string;
  onSelect?: (optionIds: string[]) => void;
  onText?: (text: string) => void;
  disabled?: boolean;
  /** Đáp án đúng để tô màu sau khi công bố */
  correctOptionIds?: string[];
  acceptedAnswers?: string[];
  /** Cỡ chữ lớn cho máy chiếu */
  large?: boolean;
  textPlaceholder?: string;
  className?: string;
}

/** Hiển thị một câu hỏi (đề + phương án); dùng chung cho học sinh, giáo viên và máy chiếu. */
export function QuestionPanel({
  question,
  selected = [],
  textAnswer = '',
  onSelect,
  onText,
  disabled,
  correctOptionIds,
  acceptedAnswers,
  large,
  textPlaceholder,
  className,
}: QuestionPanelProps) {
  const multiple = question.type === 'multiple_choice';
  const revealed = correctOptionIds !== undefined;

  function toggle(id: string) {
    if (!onSelect || disabled) return;
    if (multiple) {
      onSelect(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    } else {
      onSelect([id]);
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <MarkdownLatex
        className={cn('font-medium text-slate-900', large ? 'text-3xl leading-snug' : 'text-lg')}
      >
        {question.stemMd}
      </MarkdownLatex>

      {question.options.length > 0 && (
        <ul className={cn('grid gap-2', large ? 'sm:grid-cols-2' : '')}>
          {question.options.map((o) => {
            const isSelected = selected.includes(o.id);
            const isCorrect = revealed && correctOptionIds.includes(o.id);
            const isWrongPick = revealed && isSelected && !isCorrect;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={disabled || !onSelect}
                  onClick={() => toggle(o.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition',
                    large ? 'text-2xl' : 'text-base',
                    onSelect && !disabled && 'hover:border-brand-500 active:scale-[0.99]',
                    isCorrect
                      ? 'border-green-500 bg-green-50'
                      : isWrongPick
                        ? 'border-red-400 bg-red-50'
                        : isSelected
                          ? 'border-brand-600 bg-brand-50'
                          : 'border-slate-200 bg-white',
                    (disabled || !onSelect) && 'cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg font-bold',
                      isCorrect
                        ? 'bg-green-600 text-white'
                        : isWrongPick
                          ? 'bg-red-500 text-white'
                          : isSelected
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 text-slate-700',
                    )}
                  >
                    {o.label}
                  </span>
                  <MarkdownLatex className="flex-1 pt-1">{o.contentMd}</MarkdownLatex>
                  {isCorrect && <Check className="mt-1 size-5 shrink-0 text-green-600" />}
                  {isWrongPick && <X className="mt-1 size-5 shrink-0 text-red-500" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {question.type === 'short_text' && (
        <div className="space-y-2">
          {onText && (
            <Input
              value={textAnswer}
              onChange={(e) => onText(e.target.value)}
              disabled={disabled}
              placeholder={textPlaceholder}
              autoComplete="off"
              className={cn(large && 'h-14 text-2xl')}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
              }}
            />
          )}
          {!onText && textAnswer && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-slate-800">{textAnswer}</p>
          )}
          {acceptedAnswers && acceptedAnswers.length > 0 && (
            <p className="text-sm text-green-800">Đáp án: {acceptedAnswers.join(' / ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
