'use client';

import {
  DIFFICULTY_LABELS,
  type PublicQuestion,
  QUESTION_TYPE_LABELS,
  type SharedSetDetailDto,
  type SharedSetQuestionDto,
} from '@lophoc/shared';
import {
  ArrowLeft,
  Copy,
  Download,
  Flag,
  Heart,
  Link2,
  MessageSquare,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { CommentsSection } from '@/components/community/comments';
import { SetMeta, SetStatusBadge } from '@/components/community/set-card';
import { CloneDialog, EditSetDialog, ReportDialog } from '@/components/community/set-dialogs';
import { MarkdownLatex } from '@/components/markdown-latex';
import { QuestionPanel } from '@/components/runs/question-panel';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { useDeleteSet, useLikeSet, useRepublishSet, useSharedSet } from '@/lib/community';
import { formatDate } from '@/lib/format';

/** Bản chụp → dạng QuestionPanel hiểu, kèm id các phương án đúng để tô màu. */
function toPanel(q: SharedSetQuestionDto): { question: PublicQuestion; correctIds: string[] } {
  const s = q.snapshot;
  const options = s.options.map((o, i) => ({
    id: `q${q.index}-${i}`,
    label: o.label,
    contentMd: o.contentMd,
  }));
  return {
    question: {
      runQuestionId: `q${q.index}`,
      index: q.index - 1,
      type: s.type,
      stemMd: s.stemMd,
      options,
      timeLimitSec: 0,
      points: 1,
    },
    correctIds: options.filter((_, i) => s.options[i]?.isCorrect).map((o) => o.id),
  };
}

function SetDetail({ set }: { set: SharedSetDetailDto }) {
  const t = useTranslations('Community');
  const router = useRouter();
  const like = useLikeSet(set.id);
  const republish = useRepublishSet(set.id);
  const remove = useDeleteSet();
  const [dialog, setDialog] = useState<'clone' | 'report' | 'edit' | null>(null);
  const [copied, setCopied] = useState(false);
  const [commentIndex, setCommentIndex] = useState('');
  const originIds = set.questions
    .map((q) => q.originQuestionId)
    .filter((id): id is string => id !== null);
  const missingOrigins = set.questions.length - originIds.length;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // trình duyệt chặn clipboard: bỏ qua
    }
  }

  function commentOn(index: number) {
    setCommentIndex(String(index));
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('comment-body')?.focus({ preventScroll: true });
  }

  const usage = set.usage;
  const actionError = like.error ?? republish.error ?? remove.error;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/app/community"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          {t('back')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{set.title}</h1>
              {set.viewer.isAuthor && <SetStatusBadge status={set.status} hidden={set.hidden} />}
              {set.featured && (
                <span className="flex items-center gap-1 rounded-md bg-block-lime px-2 py-0.5 text-xs font-semibold text-slate-900">
                  <Star className="size-3" />
                  {t('featured')}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              <SetMeta set={set} /> · {t('questions', { count: set.questionCount })} ·{' '}
              {t('version', { version: set.version })}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t('author')} <span className="font-medium text-slate-700">{set.author.name}</span>
              {set.author.school && ` · ${set.author.school}`}
              {set.publishedAt && ` · ${t('publishedAt', { date: formatDate(set.publishedAt) })}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {set.viewer.isAuthor ? (
              <>
                <Button variant="secondary" onClick={() => setDialog('edit')}>
                  <Pencil className="size-4" />
                  {t('edit')}
                </Button>
                <Button
                  variant="secondary"
                  loading={republish.isPending}
                  disabled={originIds.length === 0}
                  title={t('republishHint', { count: originIds.length })}
                  onClick={() => {
                    if (window.confirm(t('republishHint', { count: originIds.length }))) {
                      republish.mutate({ questionIds: originIds });
                    }
                  }}
                >
                  <RefreshCw className="size-4" />
                  {t('republish')}
                </Button>
                <Button
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => {
                    if (window.confirm(t('deleteConfirm', { title: set.title }))) {
                      remove.mutateAsync(set.id).then(() => router.push('/app/community'));
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                  {t('delete')}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                disabled={set.viewer.reported}
                onClick={() => setDialog('report')}
              >
                <Flag className="size-4" />
                {set.viewer.reported ? t('reported') : t('report')}
              </Button>
            )}
            <Button variant="secondary" onClick={copyLink}>
              <Link2 className="size-4" />
              {copied ? t('copied') : t('copyLink')}
            </Button>
            <Button
              variant="secondary"
              loading={like.isPending}
              onClick={() => like.mutate(!set.viewer.liked)}
              aria-pressed={set.viewer.liked}
            >
              <Heart className={cn('size-4', set.viewer.liked && 'fill-red-500 text-red-500')} />
              {set.viewer.liked ? t('unlike') : t('like')} · {set.likeCount}
            </Button>
            <Button onClick={() => setDialog('clone')}>
              <Download className="size-4" />
              {set.viewer.cloned ? t('cloneAgain') : t('clone')}
            </Button>
          </div>
        </div>
      </div>

      {set.hidden && set.viewer.isAuthor && (
        <Alert variant="warning">{t('hiddenHint', { count: set.reportCount })}</Alert>
      )}
      {missingOrigins > 0 && set.viewer.isAuthor && (
        <Alert variant="info">{t('republishMissing', { count: missingOrigins })}</Alert>
      )}
      {actionError && <Alert variant="error">{errorMessage(actionError)}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {t('statInteractions')}
          </p>
          <p className="mt-1 flex flex-wrap gap-4 text-sm text-slate-800 tabular-nums">
            <span className="flex items-center gap-1">
              <Heart className="size-4 text-slate-400" /> {t('likes', { count: set.likeCount })}
            </span>
            <span className="flex items-center gap-1">
              <Copy className="size-4 text-slate-400" /> {t('clones', { count: set.cloneCount })}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-4 text-slate-400" />{' '}
              {t('commentsCount', { count: set.commentCount })}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {t('statUsage')}
          </p>
          <p className="mt-1 text-sm text-slate-800">
            {usage.runs === 0
              ? t('usageNone')
              : t('usage', {
                  runs: usage.runs,
                  answers: usage.answers,
                  percent: usage.correctPercent ?? 0,
                })}
          </p>
        </div>
      </div>

      {(set.description || set.source) && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-sm">
          {set.description && (
            <p className="whitespace-pre-wrap text-slate-800">{set.description}</p>
          )}
          {set.source && (
            <p className="text-slate-500">
              {t('source')}: <span className="text-slate-700">{set.source}</span>
            </p>
          )}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('questionsTitle', { count: set.questionCount })}
        </h2>
        {set.questions.map((q) => {
          const { question, correctIds } = toPanel(q);
          return (
            <article key={q.index} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {t('questionN', { n: q.index })}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5">
                  {QUESTION_TYPE_LABELS[q.snapshot.type]}
                </span>
                {q.snapshot.difficulty && (
                  <span className="rounded border border-slate-200 px-1.5 py-0.5">
                    {DIFFICULTY_LABELS[q.snapshot.difficulty]}
                  </span>
                )}
                <button
                  type="button"
                  className="ml-auto text-brand-700 hover:underline"
                  onClick={() => commentOn(q.index)}
                >
                  {t('commentOnQuestion')}
                </button>
              </div>
              <QuestionPanel
                question={question}
                correctOptionIds={correctIds}
                acceptedAnswers={q.snapshot.acceptedAnswers}
              />
              {q.snapshot.explanationMd && (
                <details className="mt-3 text-sm text-slate-700">
                  <summary className="cursor-pointer font-medium">{t('explanation')}</summary>
                  <MarkdownLatex className="mt-1">{q.snapshot.explanationMd}</MarkdownLatex>
                </details>
              )}
            </article>
          );
        })}
      </section>

      <CommentsSection
        setId={set.id}
        questionCount={set.questionCount}
        index={commentIndex}
        onIndexChange={setCommentIndex}
      />

      {dialog === 'clone' && <CloneDialog set={set} onClose={() => setDialog(null)} />}
      {dialog === 'report' && <ReportDialog setId={set.id} onClose={() => setDialog(null)} />}
      {dialog === 'edit' && <EditSetDialog set={set} onClose={() => setDialog(null)} />}
    </div>
  );
}

export default function SharedSetPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Community');
  const set = useSharedSet(id);

  if (set.isPending) {
    return (
      <div className="flex justify-center py-12 text-slate-400">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (set.isError || !set.data) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{t('notFound')}</Alert>
        <Link href="/app/community" className="text-brand-700 hover:underline">
          {t('back')}
        </Link>
      </div>
    );
  }
  return <SetDetail set={set.data} />;
}
