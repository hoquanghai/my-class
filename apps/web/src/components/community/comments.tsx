'use client';

import { CheckCircle2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import {
  useAddComment,
  useDeleteComment,
  useResolveComment,
  useSetComments,
} from '@/lib/community';
import { formatDateTime } from '@/lib/format';

/**
 * Góp ý phẳng cho một bộ đề, có thể gắn "câu số N". Tác giả bộ đề đánh dấu "Đã sửa" và xóa
 * được mọi bình luận; người viết xóa được bình luận của mình. Ô "Về câu" do trang cha giữ để
 * nút "Góp ý câu này" ở danh sách câu điền sẵn được.
 */
export function CommentsSection({
  setId,
  questionCount,
  index,
  onIndexChange,
}: {
  setId: string;
  questionCount: number;
  /** '' = cả bộ đề, hoặc số câu (1-based) dạng chuỗi */
  index: string;
  onIndexChange: (value: string) => void;
}) {
  const t = useTranslations('Community');
  const comments = useSetComments(setId);
  const add = useAddComment(setId);
  const remove = useDeleteComment(setId);
  const resolve = useResolveComment(setId);
  const [body, setBody] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await add.mutateAsync({ body, questionIndex: index ? Number(index) : null });
      setBody('');
      onIndexChange('');
    } catch {
      // lỗi hiển thị qua add.error
    }
  }

  const list = comments.data ?? [];

  return (
    <section id="comments" className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        {t('commentsTitle', { count: list.length })}
      </h2>

      {comments.isPending ? (
        <div className="flex justify-center py-4 text-slate-400">
          <Spinner className="size-5" />
        </div>
      ) : comments.isError ? (
        <Alert variant="error">{errorMessage(comments.error)}</Alert>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500">{t('commentEmpty')}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((c) => (
            <li key={c.id} className="flex gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-800">{c.author.name}</span>
                  {c.author.school && <span>· {c.author.school}</span>}
                  <span>· {formatDateTime(c.createdAt)}</span>
                  {c.questionIndex !== null && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                      {t('questionN', { n: c.questionIndex })}
                    </span>
                  )}
                  {c.resolvedAt && (
                    <span className="flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-800">
                      <CheckCircle2 className="size-3" />
                      {t('resolved')}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-1 text-sm whitespace-pre-wrap text-slate-800',
                    c.resolvedAt && 'text-slate-500',
                  )}
                >
                  {c.body}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                {c.viewer.canModerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title={c.resolvedAt ? t('unmarkResolved') : t('markResolved')}
                    onClick={() => resolve.mutate(c.id)}
                    disabled={resolve.isPending}
                  >
                    <CheckCircle2
                      className={cn('size-4', c.resolvedAt ? 'text-green-600' : 'text-slate-400')}
                    />
                  </Button>
                )}
                {(c.viewer.isMine || c.viewer.canModerate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    aria-label={t('deleteComment')}
                    title={t('deleteComment')}
                    onClick={() => remove.mutate(c.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <Textarea
          id="comment-body"
          rows={3}
          maxLength={1000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('commentPlaceholder')}
          aria-label={t('commentPlaceholder')}
        />
        {add.isError && <Alert variant="error">{errorMessage(add.error)}</Alert>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            {t('commentQuestion')}
            <Select value={index} onChange={(e) => onIndexChange(e.target.value)}>
              <option value="">{t('commentWhole')}</option>
              {Array.from({ length: questionCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {t('questionN', { n })}
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit" disabled={!body.trim()} loading={add.isPending}>
            {t('commentSend')}
          </Button>
        </div>
      </form>
    </section>
  );
}
