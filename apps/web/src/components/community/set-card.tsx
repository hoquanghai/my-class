'use client';

import {
  SHARED_SET_STATUS_LABELS,
  type SharedSetStatus,
  type SharedSetSummaryDto,
  subjectLabel,
} from '@lophoc/shared';
import { Copy, Heart, MessageSquare, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';

const STATUS_STYLE: Record<SharedSetStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-green-100 text-green-800',
  unlisted: 'bg-amber-100 text-amber-800',
  archived: 'bg-slate-200 text-slate-600',
};

/** Nhãn trạng thái bài đăng (chỉ tác giả thấy); bị ẩn do báo cáo thì đỏ. */
export function SetStatusBadge({ status, hidden }: { status: SharedSetStatus; hidden: boolean }) {
  const t = useTranslations('Community');
  return (
    <span
      className={cn(
        'shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold',
        hidden ? 'bg-red-100 text-red-800' : STATUS_STYLE[status],
      )}
    >
      {hidden ? t('hidden') : SHARED_SET_STATUS_LABELS[status]}
    </span>
  );
}

/** Dòng "Toán · Lớp 12 · Đạo hàm" dùng chung cho thẻ và trang chi tiết. */
export function SetMeta({
  set,
}: {
  set: Pick<SharedSetSummaryDto, 'subject' | 'grade' | 'topic'>;
}) {
  const t = useTranslations('Community');
  return (
    <>
      {[subjectLabel(set.subject), t('gradeLabel', { grade: set.grade }), set.topic]
        .filter(Boolean)
        .join(' · ')}
    </>
  );
}

export function SetCard({
  set,
  showStatus,
}: {
  set: SharedSetSummaryDto;
  /** Tab "Bài của tôi": hiện trạng thái thay vì nhãn nổi bật */
  showStatus?: boolean;
}) {
  const t = useTranslations('Community');
  return (
    <Link
      href={`/app/community/${set.id}`}
      className="flex h-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-500 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-semibold text-slate-900">{set.title}</h3>
        {showStatus ? (
          <SetStatusBadge status={set.status} hidden={set.hidden} />
        ) : (
          set.featured && (
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-block-lime px-2 py-0.5 text-xs font-semibold text-slate-900">
              <Star className="size-3" />
              {t('featured')}
            </span>
          )
        )}
      </div>
      <p className="text-sm text-slate-500">
        <SetMeta set={set} />
      </p>
      {set.description && <p className="line-clamp-2 text-sm text-slate-600">{set.description}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-500">
        <span className="min-w-0 truncate">
          {set.author.name}
          {set.author.school && ` · ${set.author.school}`}
        </span>
        <span className="flex shrink-0 items-center gap-3 tabular-nums">
          <span>{t('questions', { count: set.questionCount })}</span>
          <span className="flex items-center gap-1" title={t('likes', { count: set.likeCount })}>
            <Heart className={cn('size-3.5', set.viewer.liked && 'fill-red-500 text-red-500')} />
            {set.likeCount}
          </span>
          <span className="flex items-center gap-1" title={t('clones', { count: set.cloneCount })}>
            <Copy className="size-3.5" />
            {set.cloneCount}
          </span>
          <span
            className="flex items-center gap-1"
            title={t('commentsCount', { count: set.commentCount })}
          >
            <MessageSquare className="size-3.5" />
            {set.commentCount}
          </span>
        </span>
      </div>
    </Link>
  );
}
