'use client';

import {
  type ClassDetailDto,
  ErrorCodes,
  formatDateVi,
  type LimitsDto,
  normalizeText,
  type RosterImportResultDto,
  type StudentDto,
  type StudentLimitDetails,
} from '@lophoc/shared';
import { ArrowDownAZ, FileDown, History, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { type KeyboardEvent, useMemo, useRef, useState } from 'react';
import { AttendanceHistoryDialog } from '@/components/attendance-history-dialog';
import { AddStudentsDialog } from '@/components/classes/add-students-dialog';
import { isStudentLimitDetails, RosterLimitDialog } from '@/components/classes/roster-limit-dialog';
import { StudentDetailDialog } from '@/components/classes/student-detail-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, downloadFile, errorMessage } from '@/lib/api';
import {
  useImportExcel,
  useImportNames,
  useRemoveStudent,
  useReorderStudents,
  useUpdateStudent,
} from '@/lib/classes';

/** Sửa nhanh SĐT phụ huynh ngay trên bảng; tên và các trường khác sửa trong hộp thoại. */
interface Editing {
  id: string;
  value: string;
}

/** Lọc theo tên hoặc mã học sinh, bỏ dấu và hoa thường ("nam" khớp "Bùi Hải Nam"). */
function matches(s: StudentDto, q: string): boolean {
  return (
    normalizeText(s.name).includes(q) ||
    (s.studentCode !== null && normalizeText(s.studentCode).includes(q))
  );
}

export function RosterTab({ klass, limits }: { klass: ClassDetailDto; limits?: LimitsDto }) {
  const t = useTranslations('Roster');
  const ta = useTranslations('Attendance');
  const [historyStudent, setHistoryStudent] = useState<StudentDto | null>(null);
  const [detailStudent, setDetailStudent] = useState<StudentDto | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const importNames = useImportNames(klass.id);
  const importExcel = useImportExcel(klass.id);
  const updateStudent = useUpdateStudent(klass.id);
  const removeStudent = useRemoveStudent(klass.id);
  const reorder = useReorderStudents(klass.id);

  const [query, setQuery] = useState('');
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

  const students = klass.students;
  const q = normalizeText(query);
  const visible = useMemo(
    () => (q ? students.filter((s) => matches(s, q)) : students),
    [students, q],
  );
  const indexOf = useMemo(() => new Map(students.map((s, i) => [s.id, i + 1])), [students]);
  const error = importExcel.error ?? updateStudent.error ?? removeStudent.error ?? reorder.error;

  function afterImport(result: RosterImportResultDto) {
    setNotice(
      result.skipped > 0
        ? t('addedSkipped', { count: result.added, skipped: result.skipped })
        : t('added', { count: result.added }),
    );
  }

  /**
   * Chạy nhập; vượt giới hạn gói thì đóng hộp thoại thêm và mở hộp thoại chọn nâng cấp
   * hoặc chỉ nhập phần còn chỗ. Trả true khi đã thêm xong.
   */
  async function runImport(
    run: (fit: boolean) => Promise<RosterImportResultDto>,
    reset: () => void,
  ): Promise<boolean> {
    try {
      afterImport(await run(false));
      return true;
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.code === ErrorCodes.LIMIT_STUDENTS &&
        isStudentLimitDetails(err.details)
      ) {
        reset();
        setAddOpen(false);
        setLimitPrompt({ details: err.details, retry: () => run(true) });
      }
      // lỗi khác hiển thị qua mutation.error
      return false;
    }
  }

  const addNames = (names: string[]) =>
    runImport(
      (fit) => importNames.mutateAsync({ names, fit }),
      () => importNames.reset(),
    );

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

  function startEdit(s: StudentDto) {
    setEditing({ id: s.id, value: s.parentPhone ?? '' });
  }

  async function commitEdit() {
    if (!editing) return;
    const current = students.find((s) => s.id === editing.id);
    const value = editing.value.trim();
    setEditing(null);
    if (!current || value === (current.parentPhone ?? '')) return;
    await updateStudent.mutateAsync({ studentId: current.id, input: { parentPhone: value } });
  }

  function onEditKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commitEdit();
    } else if (e.key === 'Escape') {
      setEditing(null);
    }
  }

  function sortAz() {
    const ids = [...students].sort((a, b) => a.name.localeCompare(b.name, 'vi')).map((s) => s.id);
    reorder.mutate(ids);
  }

  return (
    <section className="min-w-0 space-y-4">
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

      {/* Thanh công cụ trên đầu bảng: tìm kiếm bên trái, nhập liệu bên phải */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            aria-label={t('search')}
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={sortAz} disabled={students.length < 2}>
          <ArrowDownAZ className="size-4" />
          {t('sortAz')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button
          variant="secondary"
          loading={importExcel.isPending}
          onClick={() => fileRef.current?.click()}
          title={t('excelHint')}
        >
          <Upload className="size-4" />
          {t('excel')}
        </Button>
        <Button variant="ghost" loading={downloading} onClick={downloadTemplate}>
          <FileDown className="size-4" />
          {t('template')}
        </Button>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          {t('addStudent')}
        </Button>
      </div>

      {klass.rosterLocked && <Alert variant="info">{t('locked')}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {error && <Alert variant="error">{errorMessage(error)}</Alert>}
      {downloadError && <Alert variant="error">{downloadError}</Alert>}

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
                <th className="hidden w-28 px-3 py-2 md:table-cell">{t('colBirth')}</th>
                <th className="hidden px-3 py-2 lg:table-cell">{t('colSchool')}</th>
                <th className="w-40 px-3 py-2">{t('colPhone')}</th>
                <th className="w-32 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-500">{indexOf.get(s.id)}</td>
                  <td className="px-3 py-1.5">
                    <Link
                      href={`/app/classes/${klass.id}/students/${s.id}`}
                      className="block rounded px-1 py-1 hover:bg-brand-50"
                      title={t('openProfile')}
                    >
                      <span className="block font-medium text-slate-900 hover:underline">
                        {s.name}
                      </span>
                      {s.studentCode && (
                        <span className="block text-xs text-slate-500">{s.studentCode}</span>
                      )}
                    </Link>
                  </td>
                  <td className="hidden px-3 py-1.5 text-slate-600 tabular-nums md:table-cell">
                    {s.dateOfBirth ? formatDateVi(s.dateOfBirth) : '—'}
                  </td>
                  <td className="hidden px-3 py-1.5 text-slate-600 lg:table-cell">
                    {s.school ?? '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    {editing?.id === s.id ? (
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
                        onClick={() => startEdit(s)}
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
                        aria-label={t('remove')}
                        title={t('remove')}
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
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    {t('noMatch', { query })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
            {t('editHint')}
          </p>
        </div>
      )}

      <p className="text-xs leading-relaxed text-slate-500">{t('consent')}</p>

      {addOpen && (
        <AddStudentsDialog
          classId={klass.id}
          onClose={() => {
            setAddOpen(false);
            importNames.reset();
          }}
          onAddNames={addNames}
          addingNames={importNames.isPending}
          addNamesError={importNames.error}
          onCreated={(name) => setNotice(t('createdOne', { name }))}
        />
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
  );
}
