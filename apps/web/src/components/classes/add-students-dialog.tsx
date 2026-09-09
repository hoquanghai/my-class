'use client';

import { createStudentSchema, ErrorCodes, parseNameLines } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { type FormEvent, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { ApiError, errorMessage } from '@/lib/api';
import { useCreateStudent } from '@/lib/classes';
import { type FieldErrors, validate } from '@/lib/forms';
import { emptyStudentForm, StudentFields, type StudentFormState } from './student-form';

type Mode = 'one' | 'many';

/**
 * Hộp thoại thêm học sinh: nhập đầy đủ thông tin một em, hoặc dán danh sách tên (mỗi dòng một tên).
 * Cha render có điều kiện (`{open && <AddStudentsDialog …/>}`) để mỗi lần mở là form trống.
 */
export function AddStudentsDialog({
  classId,
  onClose,
  onAddNames,
  addingNames,
  addNamesError,
  onCreated,
}: {
  classId: string;
  onClose: () => void;
  /** Dán danh sách: tab Danh sách lo giới hạn gói; trả true khi đã thêm để đóng hộp thoại. */
  onAddNames: (names: string[]) => Promise<boolean>;
  addingNames: boolean;
  addNamesError: unknown;
  onCreated: (name: string) => void;
}) {
  const t = useTranslations('Roster');
  const tc = useTranslations('Common');
  const [mode, setMode] = useState<Mode>('one');
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [text, setText] = useState('');
  const create = useCreateStudent(classId);
  const pendingNames = useMemo(() => parseNameLines(text), [text]);
  const limitHit =
    create.error instanceof ApiError && create.error.code === ErrorCodes.LIMIT_STUDENTS;

  async function submitOne(e: FormEvent) {
    e.preventDefault();
    const v = validate(createStudentSchema, form);
    if (v.errors) return setErrors(v.errors);
    setErrors({});
    try {
      const result = await create.mutateAsync(v.data);
      // Học sinh mới nằm cuối danh sách; tên có thể đã được thêm hậu tố nếu trùng
      onCreated(result.students.at(-1)?.name ?? v.data.name);
      onClose();
    } catch {
      // lỗi hiển thị qua create.error
    }
  }

  async function submitMany() {
    if (pendingNames.length === 0) return;
    if (await onAddNames(pendingNames)) onClose();
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setMode(value)}
      className={cn(
        'h-9 flex-1 rounded-md px-3 text-sm font-medium transition',
        mode === value
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900',
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog open onClose={onClose} title={t('addStudent')} size="lg">
      <div role="tablist" className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        {tab('one', t('addOne'))}
        {tab('many', t('addMany'))}
      </div>

      {mode === 'one' ? (
        <form onSubmit={submitOne} className="space-y-4" noValidate>
          {create.isError && (
            <Alert variant="error">
              {errorMessage(create.error)}
              {limitHit && (
                <>
                  {' '}
                  <Link href="/app/upgrade" className="font-medium underline">
                    {t('upgradeLink')}
                  </Link>
                </>
              )}
            </Alert>
          )}
          <StudentFields
            idPrefix="new"
            form={form}
            errors={errors}
            onChange={(key, value) => {
              setForm((f) => ({ ...f, [key]: value }));
              setErrors((er) => (er[key] ? { ...er, [key]: '' } : er));
            }}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t('add')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <label htmlFor="paste-names" className="block text-sm font-medium text-slate-700">
            {t('pasteLabel')}
          </label>
          <Textarea
            id="paste-names"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('pastePlaceholder')}
            autoFocus
          />
          <p className="text-xs text-slate-500">{t('pasteHint')}</p>
          {Boolean(addNamesError) && <Alert variant="error">{errorMessage(addNamesError)}</Alert>}
          <div className="flex items-center justify-between gap-2 pt-2">
            <span className="text-sm text-slate-500">
              {t('pasteCount', { count: pendingNames.length })}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                {tc('cancel')}
              </Button>
              <Button
                onClick={() => void submitMany()}
                disabled={pendingNames.length === 0}
                loading={addingNames}
              >
                {t('add')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
