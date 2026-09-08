'use client';

import type { QuestionDto } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/api';
import { useQuestionFacets, useUpdateQuestion } from '@/lib/questions';
import { fromDto, toInput, validateEditable } from './editable';
import { QuestionFields } from './question-fields';

export function QuestionEditorDialog({
  question,
  onClose,
}: {
  question: QuestionDto | null;
  onClose: () => void;
}) {
  const t = useTranslations('Questions');
  const tc = useTranslations('Common');
  const update = useUpdateQuestion();
  const facets = useQuestionFacets();
  const [draft, setDraft] = useState(() => (question ? fromDto(question) : null));
  const errors = draft ? validateEditable(draft, question?.source ?? 'manual') : [];

  async function save() {
    if (!question || !draft || errors.length) return;
    const input = toInput(draft, question.source);
    await update.mutateAsync({
      id: question.id,
      input: {
        type: input.type,
        stemMd: input.stemMd,
        explanationMd: input.explanationMd,
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        difficulty: input.difficulty,
        options: input.options,
        acceptedAnswers: input.acceptedAnswers,
      },
    });
    onClose();
  }

  return (
    <Dialog open={question !== null} onClose={onClose} title={t('editTitle')} className="max-w-2xl">
      {draft && (
        <div className="space-y-4">
          <QuestionFields value={draft} onChange={setDraft} showTags facets={facets.data} />
          {errors.length > 0 && (
            <Alert variant="warning">
              <ul>
                {errors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            </Alert>
          )}
          {update.isError && <Alert variant="error">{errorMessage(update.error)}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button onClick={save} loading={update.isPending} disabled={errors.length > 0}>
              {tc('save')}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
