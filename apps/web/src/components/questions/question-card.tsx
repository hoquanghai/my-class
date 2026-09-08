'use client';

import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS, type QuestionDto } from '@lophoc/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MarkdownLatex } from '@/components/markdown-latex';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';

export function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
}: {
  question: QuestionDto;
  index?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations('Questions');
  const tags = [
    question.subject,
    question.grade && `Khối ${question.grade}`,
    question.topic,
  ].filter(Boolean);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {index !== undefined && <span className="font-semibold text-slate-500">#{index}</span>}
        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
          {QUESTION_TYPE_LABELS[question.type]}
        </span>
        {question.difficulty && (
          <span className="rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
            {DIFFICULTY_LABELS[question.difficulty]}
          </span>
        )}
        {tags.map((tag) => (
          <span
            key={tag as string}
            className="rounded-md border border-slate-200 px-2 py-0.5 text-slate-600"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto flex gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              aria-label={t('edit')}
              title={t('edit')}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label="Xóa"
              title="Xóa"
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </span>
      </div>
      <MarkdownLatex className="font-medium text-slate-900">{question.stemMd}</MarkdownLatex>
      {question.options.length > 0 && (
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {question.options.map((o) => (
            <li
              key={o.id}
              className={cn(
                'flex gap-2 rounded-md px-2 py-1 text-sm',
                o.isCorrect ? 'bg-green-50 font-medium text-green-900' : 'text-slate-700',
              )}
            >
              <span className="w-5 shrink-0 font-semibold">{o.label}.</span>
              <MarkdownLatex>{o.contentMd}</MarkdownLatex>
            </li>
          ))}
        </ul>
      )}
      {question.type === 'short_text' && (
        <p className="mt-2 text-sm text-green-800">
          {t('answer')}: {question.acceptedAnswers.join(' / ')}
        </p>
      )}
      {question.explanationMd && (
        <details className="mt-2 text-sm text-slate-600">
          <summary className="cursor-pointer select-none">{t('explanation')}</summary>
          <MarkdownLatex>{question.explanationMd}</MarkdownLatex>
        </details>
      )}
    </article>
  );
}
