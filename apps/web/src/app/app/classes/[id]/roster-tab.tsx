'use client';

import {
  type ClassDetailDto,
  ErrorCodes,
  type LimitsDto,
  parseNameLines,
  type RosterImportResultDto,
  type StudentDto,
  type StudentLimitDetails,
} from '@lophoc/shared';
import {
  ArrowDown,
  ArrowUp,
  ArrowDownAZ,
  FileDown,
  History,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { type KeyboardEvent, useMemo, useRef, useState } from 'react';
import { AttendanceHistoryDialog } from '@/components/attendance-history-dialog';
import { isStudentLimitDetails, RosterLimitDialog } from '@/components/classes/roster-limit-dialog';
import { StudentDetailDialog } from '@/components/classes/student-detail-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { ApiError, downloadFile, errorMessage } from '@/lib/api';
import {
  useImportExcel,
  useImportNames,
  useRemoveStudent,
  useReorderStudents,
  useUpdateStudent,
} from '@/lib/classes';

type EditField = 'name' | 'parentPhone';

interface Editing {
  id: string;
  field: EditField;
  value: string;
}

export function RosterTab({ klass, limits }: { klass: ClassDetailDto; limits?: LimitsDto }) {
  const t = useTranslations('Roster');
  const ta = useTranslations('Attendance');
  const [historyStudent, setHistoryStudent] = useState<StudentDto | null>(null);
  const [detailStudent, setDetailStudent] = useState<StudentDto | null>(null);
  const importNames = useImportNames(klass.id);
  const importExcel = useImportExcel(klass.id);
  const updateStudent = useUpdateStudent(klass.id);
  const removeStudent = useRemoveStudent(klass.id);
  const reorder = useReorderStudents(klass.id);

  const [text, setText] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [limitPrompt, setLimitPrompt] = useState<{
    details: StudentLimitDetails;
    retry: () => Promise<RosterImportResultDto>;
  } | null>(null);
  const [fitting, setFitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pendingNames = useMemo(() => parseNameLines(text), [text]);
  const students = klass.students;
  const error =
    importNames.error ??
    importExcel.error ??
    updateStudent.error ??
    removeStudent.error ??
    reorder.error;

  function afterImport(result: RosterImportResultDto) {
    setText('');
    setNotice(
      result.skipped > 0
        ? t('addedSkipped', { count: result.added, skipped: result.skipped })
        : t('added', { count: result.added }),
    );
  }

  /** Chạy nhập; vượt giới hạn gói thì mở hộp thoại chọn nâng cấp hoặc chỉ nhập phần còn chỗ. */
  async function runImport(
    run: (fit: boolean) => Promise<RosterImportResultDto>,
    reset: () => void,
  ) {
    try {
      afterImport(await run(false));
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.code === ErrorCodes.LIMIT_STUDENTS &&
        isStudentLimitDetails(err.details)
      ) {
        reset();
        setLimitPrompt({ details: err.details, retry: () => run(true) });
      }
      // lỗi khác hiển thị qua mutation.error
    }
  }

  function addNames() {
    if (pendingNames.length === 0) return;
    const names = pendingNames;
    void runImport(
      (fit) => importNames.mutateAsync({ names, fit }),
      () => importNames.reset(),
    );
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';
    void runImport(
      (fit) => importExcel.mutateAsync({ file, fit }),
      () => importExcel.reset(),
    );
  }

  async function fitImport() {
    if (!limitPrompt) return;
    setFitting(true);
    try {
      afterImport(await limitPrompt.retry());
    } catch {
      // lỗi hiển thị qua mutation.error
    } finally {
      setFitting(false);
      setLimitPrompt(null);
    }
  }

  async function downloadTemplate() {
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadFile(
        `/classes/${klass.id}/students/template.xlsx`,
        `lophoc-mau-danh-sach-${klass.code}.xlsx`,
      );
    } catch {
      setDownloadError(t('downloadFailed'));
    } finally {
      setDownloading(false);
    }
  }

  function startEdit(s: StudentDto, field: EditField) {
    setEditing({ id: s.id, field, value: field === 'name' ? s.name : (s.parentPhone ?? '') });
  }

  async function commitEdit() {
    if (!editing) return;
    const current = students.find((s) => s.id === editing.id);
    const value = editing.value.trim();
    setEditing(null);
    if (!current) return;
    if (editing.field === 'name') {
      if (!value || value === current.name) return;
      await updateStudent.mutateAsync({ studentId: current.id, input: { name: value } });
    } else if (value !== (current.parentPhone ?? '')) {
      await updateStudent.mutateAsync({ studentId: current.id, input: { parentPhone: value } });
    }
  }

  function onEditKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commitEdit();
    } else if (e.key === 'Escape') {
      setEditing(null);
    }
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= students.length) return;
    const ids = students.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target] as string, ids[index] as string];
    reorder.mutate(ids);
  }

  function sortAz() {
    const ids = [...students].sort((a, b) => a.name.localeCompare(b.name, 'vi')).map((s) => s.id);
    reorder.mutate(ids);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-700">
              {t('capacity', { count: students.length })}
            </p>
            {limits && (
              <p className="text-xs text-slate-500">
                {t('teacherCapacity', {
                  count: limits.usage.students,
                  max: limits.maxStudentsPerTeacher,
                })}
                {limits.usage.students >= limits.maxStudentsPerTeacher * 0.8 && (
                  <>
                    {' · '}
                    <Link href="/app/upgrade" className="font-medium text-accent hover:underline">
                      {t('upgradeLink')}
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={sortAz} disabled={students.length < 2}>
              <ArrowDownAZ className="size-4" />
              {t('sortAz')}
            </Button>
          </div>
        </div>

        {klass.rosterLocked && <Alert variant="info">{t('locked')}</Alert>}
        {notice && (
          <Alert variant="success" className="flex items-center justify-between">
            {notice}
          </Alert>
        )}
        {error && <Alert variant="error">{errorMessage(error)}</Alert>}

        {students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            {t('empty')}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-12 px-3 py-2">{t('colIndex')}</th>
                  <th className="px-3 py-2">{t('colName')}</th>
                  <th className="w-40 px-3 py-2">{t('colPhone')}</th>
                  <th className="w-52 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s, i) => {
                  const meta = [s.studentCode, s.school].filter(Boolean).join(' · ');
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-1.5">
                        {editing?.id === s.id && editing.field === 'name' ? (
                          <Input
                            autoFocus
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onKeyDown={onEditKey}
                            onBlur={() => setEditing(null)}
                            className="h-8"
                          />
                        ) : (
                          <button
                            type="button"
                            className="w-full rounded px-1 py-1 text-left hover:bg-brand-50"
                            onClick={() => startEdit(s, 'name')}
                          >
                            <span className="block font-medium text-slate-900">{s.name}</span>
                            {meta && <span className="block text-xs text-slate-500">{meta}</span>}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {editing?.id === s.id && editing.field === 'parentPhone' ? (
                          <Input
                            autoFocus
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onKeyDown={onEditKey}
                            onBlur={() => setEditing(null)}
                            className="h-8"
                            inputMode="tel"
                          />
                        ) : (
                          <button
                            type="button"
                            className="w-full rounded px-1 py-1 text-left text-slate-600 hover:bg-brand-50"
                            onClick={() => startEdit(s, 'parentPhone')}
                          >
                            {s.parentPhone || <span className="text-slate-300">—</span>}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t('edit')}
                            title={t('edit')}
                            onClick={() => setDetailStudent(s)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={ta('history')}
                            title={ta('history')}
                            onClick={() => setHistoryStudent(s)}
                          >
                            <History className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t('moveUp')}
                            disabled={i === 0 || reorder.isPending}
                            onClick={() => move(i, -1)}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t('moveDown')}
                            disabled={i === students.length - 1 || reorder.isPending}
                            onClick={() => move(i, 1)}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t('remove')}
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (window.confirm(t('removeConfirm', { name: s.name }))) {
                                removeStudent.mutate(s.id);
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
              {t('editHint')}
            </p>
          </div>
        )}
        <AttendanceHistoryDialog
          classId={klass.id}
          student={historyStudent}
          onClose={() => setHistoryStudent(null)}
        />
        <StudentDetailDialog
          classId={klass.id}
          student={detailStudent}
          onClose={() => setDetailStudent(null)}
        />
        <RosterLimitDialog
          details={limitPrompt?.details ?? null}
          fitting={fitting}
          onFit={() => void fitImport()}
          onClose={() => setLimitPrompt(null)}
        />
      </section>

      <aside className="space-y-4">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <label htmlFor="paste-names" className="block text-sm font-medium text-slate-700">
            {t('pasteLabel')}
          </label>
          <Textarea
            id="paste-names"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('pastePlaceholder')}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-500">
              {t('pasteCount', { count: pendingNames.length })}
            </span>
            <Button
              onClick={addNames}
              disabled={pendingNames.length === 0}
              loading={importNames.isPending}
            >
              {t('add')}
            </Button>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            variant="secondary"
            className="w-full"
            loading={importExcel.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            {t('excel')}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            loading={downloading}
            onClick={downloadTemplate}
          >
            <FileDown className="size-4" />
            {t('template')}
          </Button>
          <p className="text-xs text-slate-500">{t('excelHint')}</p>
          {downloadError && <Alert variant="error">{downloadError}</Alert>}
        </div>

        <p className="text-xs leading-relaxed text-slate-500">{t('consent')}</p>
      </aside>
    </div>
  );
}
