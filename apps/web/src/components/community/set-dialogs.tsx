'use client';

import {
  type CloneSetResultDto,
  ErrorCodes,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReason,
  SHARED_SET_STATUS_LABELS,
  SHARED_SET_STATUSES,
  type SharedSetDetailDto,
  type SharedSetStatus,
  updateSetSchema,
} from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { SubjectGradeFields } from '@/components/classes/subject-grade-fields';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiError, errorMessage } from '@/lib/api';
import { useCloneSet, useReportSet, useUpdateSet } from '@/lib/community';
import { type FieldErrors, validate } from '@/lib/forms';

/** Lấy bộ đề về ngân hàng, tùy chọn tạo luôn đề; xong thì hiện link mở ngân hàng / đề. */
export function CloneDialog({ set, onClose }: { set: SharedSetDetailDto; onClose: () => void }) {
  const t = useTranslations('Community');
  const tc = useTranslations('Common');
  const [createQuiz, setCreateQuiz] = useState(true);
  const [result, setResult] = useState<CloneSetResultDto | null>(null);
  const clone = useCloneSet(set.id);
  const limited =
    clone.error instanceof ApiError && clone.error.code === ErrorCodes.LIMIT_COMMUNITY_CLONES;

  return (
    <Dialog open onClose={onClose} title={t('cloneTitle')}>
      {result ? (
        <div className="space-y-4">
          <Alert variant="success">{t('cloneDone', { count: result.added })}</Alert>
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/app/questions"
              className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              {t('openBank')}
            </Link>
            {result.quizId && (
              <Link
                href={`/app/quizzes/${result.quizId}`}
                className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong"
              >
                {t('openQuiz')}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">{t('cloneHint', { count: set.questionCount })}</p>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-accent"
              checked={createQuiz}
              onChange={(e) => setCreateQuiz(e.target.checked)}
            />
            <span>{t('cloneCreateQuiz')}</span>
          </label>
          {clone.isError && (
            <Alert variant="error">{limited ? t('cloneLimit') : errorMessage(clone.error)}</Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button
              loading={clone.isPending}
              onClick={() =>
                clone
                  .mutateAsync({ createQuiz })
                  .then(setResult)
                  .catch(() => undefined)
              }
            >
              {t('clone')}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function ReportDialog({ setId, onClose }: { setId: string; onClose: () => void }) {
  const t = useTranslations('Community');
  const tc = useTranslations('Common');
  const [reason, setReason] = useState<ReportReason>('wrong_answer');
  const [detail, setDetail] = useState('');
  const [done, setDone] = useState(false);
  const report = useReportSet(setId);

  return (
    <Dialog open onClose={onClose} title={t('reportTitle')}>
      {done ? (
        <div className="space-y-4">
          <Alert variant="success">{t('reportDone')}</Alert>
          <div className="flex justify-end">
            <Button onClick={onClose}>{tc('close')}</Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            report
              .mutateAsync({ reason, detail })
              .then(() => setDone(true))
              .catch(() => undefined);
          }}
        >
          <Field label={t('reportReason')} htmlFor="report-reason">
            <Select
              className="w-full"
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REPORT_REASON_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('reportDetail')} htmlFor="report-detail">
            <Textarea
              id="report-detail"
              rows={3}
              maxLength={500}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </Field>
          {report.isError && <Alert variant="error">{errorMessage(report.error)}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button type="submit" variant="danger" loading={report.isPending}>
              {t('reportSend')}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/** Tác giả sửa tiêu đề, mô tả, môn/khối, chủ đề, nguồn và trạng thái. */
export function EditSetDialog({ set, onClose }: { set: SharedSetDetailDto; onClose: () => void }) {
  const t = useTranslations('Community');
  const tc = useTranslations('Common');
  const [form, setForm] = useState({
    title: set.title,
    description: set.description ?? '',
    subject: set.subject,
    grade: set.grade,
    topic: set.topic ?? '',
    source: set.source ?? '',
    status: set.status as SharedSetStatus,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const update = useUpdateSet(set.id);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate(updateSetSchema, form);
    if (v.errors) return setErrors(v.errors);
    setErrors({});
    try {
      await update.mutateAsync(v.data);
      onClose();
    } catch {
      // lỗi hiển thị qua update.error
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('editTitle')} size="lg">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {update.isError && <Alert variant="error">{errorMessage(update.error)}</Alert>}
        <Field label={t('setTitle')} htmlFor="edit-title" error={errors.title}>
          <Input
            id="edit-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={120}
          />
        </Field>
        <SubjectGradeFields
          idPrefix="edit-set"
          subject={form.subject}
          grade={form.grade}
          onSubjectChange={(v) => setForm({ ...form, subject: v })}
          onGradeChange={(v) => setForm({ ...form, grade: v })}
          errors={{ subject: errors.subject ?? '', grade: errors.grade ?? '' }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('topic')} htmlFor="edit-topic" error={errors.topic}>
            <Input
              id="edit-topic"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              maxLength={80}
            />
          </Field>
          <Field label={t('sourceField')} htmlFor="edit-source" error={errors.source}>
            <Input
              id="edit-source"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              maxLength={200}
            />
          </Field>
        </div>
        <Field label={t('description')} htmlFor="edit-description" error={errors.description}>
          <Textarea
            id="edit-description"
            rows={3}
            maxLength={2000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label={t('status')} htmlFor="edit-status" hint={t(`statusHint.${form.status}`)}>
          <Select
            className="w-full"
            id="edit-status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as SharedSetStatus })}
          >
            {SHARED_SET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SHARED_SET_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" loading={update.isPending}>
            {tc('save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
