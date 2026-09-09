'use client';

import {
  formatDateVi,
  GENDER_LABELS,
  type StudentProfileDto,
  type StudentRunHistoryItemDto,
} from '@lophoc/shared';
import { ArrowLeft, CalendarCheck, ClipboardList, Pencil, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { STATUS_ORDER, STATUS_STYLES } from '@/components/attendance-status';
import { StudentDetailDialog } from '@/components/classes/student-detail-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { useStudentProfile } from '@/lib/classes';
import { formatDate, formatDateTime, percent } from '@/lib/format';

/** Hai chữ cái đầu của họ và tên (từ đầu + từ cuối). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
        <dd className="text-xl font-bold text-slate-900 tabular-nums">{value}</dd>
        {hint && <dd className="text-xs text-slate-500">{hint}</dd>}
      </div>
    </div>
  );
}

function ScoreCell({ item }: { item: StudentRunHistoryItemDto }) {
  const t = useTranslations('StudentProfile');
  const tone =
    item.percent === null
      ? 'text-slate-500'
      : item.percent >= 80
        ? 'text-green-700'
        : item.percent >= 50
          ? 'text-slate-900'
          : 'text-red-600';
  return (
    <span className={cn('font-semibold tabular-nums', tone)}>
      {t('scoreOf', { score: item.score, total: item.totalPoints })}
      {item.percent !== null && (
        <span className="ml-1 text-xs font-normal text-slate-500">({item.percent}%)</span>
      )}
    </span>
  );
}

function Profile({ data, classId }: { data: StudentProfileDto; classId: string }) {
  const t = useTranslations('StudentProfile');
  const ti = useTranslations('StudentInfo');
  const ta = useTranslations('Attendance');
  const tr = useTranslations('Runs');
  const [editing, setEditing] = useState(false);
  const { student, attendance, quizzes } = data;
  const meta = [student.studentCode, student.school].filter(Boolean).join(' · ');

  const info: { label: string; value: string | null }[] = [
    { label: ti('studentCode'), value: student.studentCode },
    { label: ti('dateOfBirth'), value: student.dateOfBirth && formatDateVi(student.dateOfBirth) },
    { label: ti('gender'), value: student.gender && GENDER_LABELS[student.gender] },
    { label: ti('phone'), value: student.phone },
    { label: ti('email'), value: student.email },
    { label: ti('school'), value: student.school },
    { label: ti('parentName'), value: student.parentName },
    { label: ti('parentPhone'), value: student.parentPhone },
    { label: ti('note'), value: student.note },
  ];
  const pct = (v: number | null) => (v === null ? t('none') : t('percentValue', { percent: v }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/classes/${classId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          {t('backToClass', { name: data.className })}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-block-mint text-lg font-bold text-slate-900"
            >
              {initials(student.name)}
            </span>
            <div>
              <p className="type-eyebrow text-slate-500">{t('title')}</p>
              <h1 className="text-2xl font-bold text-slate-900">{student.name}</h1>
              {meta && <p className="text-sm text-slate-500">{meta}</p>}
            </div>
          </div>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            {t('edit')}
          </Button>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<CalendarCheck className="size-5" />}
          label={t('statAttendance')}
          value={t('percentValue', {
            percent: percent(attendance.rate.present, attendance.rate.total),
          })}
          hint={t('attendanceOf', {
            present: attendance.rate.present,
            total: attendance.rate.total,
          })}
        />
        <StatTile
          icon={<ClipboardList className="size-5" />}
          label={t('statQuizzes')}
          value={String(quizzes.count)}
          hint={t('quizzesHint')}
        />
        <StatTile
          icon={<Trophy className="size-5" />}
          label={t('statAverage')}
          value={pct(quizzes.averagePercent)}
          hint={t('averageHint')}
        />
        <StatTile
          icon={<Trophy className="size-5" />}
          label={t('statBest')}
          value={pct(quizzes.bestPercent)}
          hint={t('bestHint')}
        />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <section className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t('infoTitle')}</h2>
          <dl className="divide-y divide-slate-100">
            {info.map((row) => (
              <div key={row.label} className="flex gap-3 py-2 text-sm">
                <dt className="w-32 shrink-0 text-slate-500">{row.label}</dt>
                <dd
                  className={cn('min-w-0 flex-1', row.value ? 'text-slate-900' : 'text-slate-300')}
                >
                  {row.value || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white">
            <h2 className="px-5 pt-5 pb-3 text-lg font-semibold text-slate-900">
              {t('quizTitle')}
            </h2>
            {quizzes.items.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-500">{t('quizEmpty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-2">{t('colDate')}</th>
                      <th className="px-3 py-2">{t('colQuiz')}</th>
                      <th className="px-3 py-2">{t('colScore')}</th>
                      <th className="px-3 py-2 text-right">{t('colCorrect')}</th>
                      <th className="px-5 py-2 text-right">{t('colRank')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quizzes.items.map((item) => (
                      <tr key={item.runId} className="hover:bg-slate-50">
                        <td className="px-5 py-2 whitespace-nowrap text-slate-600">
                          {formatDate(item.endedAt)}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/app/runs/${item.runId}`}
                            className="font-medium text-slate-900 hover:underline"
                          >
                            {item.quizTitle}
                          </Link>
                          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                            {tr(`modeLabel.${item.mode}`)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <ScoreCell item={item} />
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 tabular-nums">
                          {t('correctOf', {
                            correct: item.correctCount,
                            total: item.questionCount,
                          })}
                        </td>
                        <td className="px-5 py-2 text-right text-slate-700 tabular-nums">
                          {item.rank === null
                            ? '—'
                            : t('rankOf', { rank: item.rank, count: item.participants })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{ta('historyTitle')}</h2>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.map((status) => (
                  <span
                    key={status}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums',
                      STATUS_STYLES[status].chip,
                    )}
                  >
                    {ta(`status.${status}`)} {attendance.summary[status]}
                  </span>
                ))}
              </div>
            </div>
            {attendance.items.length === 0 ? (
              <p className="text-sm text-slate-500">{ta('historyEmpty', { days: 30 })}</p>
            ) : (
              <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                {attendance.items.map((item) => (
                  <li
                    key={item.sessionId}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <Link
                      href={`/app/sessions/${item.sessionId}`}
                      className="text-slate-700 hover:underline"
                    >
                      {formatDateTime(item.startedAt)}
                    </Link>
                    <span className="flex items-center gap-2">
                      {item.note && <span className="text-xs text-slate-500">{item.note}</span>}
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-xs font-semibold',
                          STATUS_STYLES[item.status].chip,
                        )}
                      >
                        {ta(`status.${item.status}`)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {attendance.hiddenCount > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {ta('historyHidden', { count: attendance.hiddenCount })}
              </p>
            )}
          </section>
        </div>
      </div>

      <StudentDetailDialog
        classId={classId}
        student={editing ? student : null}
        onClose={() => setEditing(false)}
      />
    </div>
  );
}

export default function StudentProfilePage() {
  const { id, studentId } = useParams<{ id: string; studentId: string }>();
  const t = useTranslations('StudentProfile');
  const profile = useStudentProfile(id, studentId);

  if (profile.isPending) {
    return (
      <div className="flex justify-center py-12 text-slate-400">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (profile.isError || !profile.data) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{errorMessage(profile.error) || t('notFound')}</Alert>
        <Link href={`/app/classes/${id}`} className="text-brand-700 hover:underline">
          {t('backToClass', { name: '' })}
        </Link>
      </div>
    );
  }
  return <Profile data={profile.data} classId={id} />;
}
