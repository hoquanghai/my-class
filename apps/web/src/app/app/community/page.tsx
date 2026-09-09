'use client';

import {
  type CommunitySort,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  GRADES,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  SUBJECT_LABELS,
  SUBJECTS,
} from '@lophoc/shared';
import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { PublishSetDialog } from '@/components/community/publish-set-dialog';
import { SetCard } from '@/components/community/set-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tabs } from '@/components/ui/tabs';
import { errorMessage } from '@/lib/api';
import { useMe } from '@/lib/auth';
import {
  type CommunityListInput,
  useCommunityFacets,
  useCommunitySets,
  useMySets,
} from '@/lib/community';

const PAGE_SIZE = 18;
type View = 'browse' | 'mine';

function CommunityPageInner() {
  const t = useTranslations('Community');
  const router = useRouter();
  const searchParams = useSearchParams();
  const publishQuiz = searchParams.get('publish');
  const me = useMe();

  const [view, setView] = useState<View>('browse');
  const [publishOpen, setPublishOpen] = useState(Boolean(publishQuiz));
  const [subjectChoice, setSubjectChoice] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    grade: '',
    topic: '',
    type: '',
    difficulty: '',
    q: '',
    sort: 'new' as CommunitySort,
    page: 1,
  });

  // Mặc định mở môn đầu tiên trong hồ sơ giáo viên; '' = tất cả môn
  const subject = subjectChoice ?? me.data?.subjects[0] ?? '';

  const query: CommunityListInput = {
    subject: (subject || undefined) as CommunityListInput['subject'],
    grade: (filter.grade || undefined) as CommunityListInput['grade'],
    topic: filter.topic || undefined,
    type: (filter.type || undefined) as CommunityListInput['type'],
    difficulty: (filter.difficulty || undefined) as CommunityListInput['difficulty'],
    q: filter.q || undefined,
    sort: filter.sort,
    page: filter.page,
    pageSize: PAGE_SIZE,
  };
  const sets = useCommunitySets(query);
  const mine = useMySets();
  const facets = useCommunityFacets({
    subject: (subject || undefined) as CommunityListInput['subject'],
    grade: (filter.grade || undefined) as CommunityListInput['grade'],
  });
  const set = (patch: Partial<typeof filter>) => setFilter({ ...filter, ...patch, page: 1 });
  const pages = Math.max(1, Math.ceil((sets.data?.total ?? 0) / PAGE_SIZE));

  function closePublish() {
    setPublishOpen(false);
    if (publishQuiz) router.replace('/app/community');
  }

  const subjectTabs = [
    { id: '', label: t('allSubjects') },
    ...SUBJECTS.map((s) => ({ id: s as string, label: SUBJECT_LABELS[s] })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setPublishOpen(true)}>
          <Plus className="size-4" />
          {t('publish')}
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'browse' as View, label: t('tabBrowse') },
          { id: 'mine' as View, label: t('tabMine', { count: mine.data?.length ?? 0 }) },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'browse' ? (
        <>
          <div className="overflow-x-auto">
            <Tabs
              tabs={subjectTabs}
              value={subject}
              onChange={(s) => {
                setSubjectChoice(s);
                set({ topic: '' });
              }}
              className="min-w-max"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.6fr)_repeat(5,minmax(0,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                className="pl-9"
                placeholder={t('search')}
                aria-label={t('search')}
                value={filter.q}
                onChange={(e) => set({ q: e.target.value })}
              />
            </div>
            <Select
              className="w-full"
              aria-label={t('filterGrade')}
              value={filter.grade}
              onChange={(e) => set({ grade: e.target.value, topic: '' })}
            >
              <option value="">{t('allGrades')}</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {t('gradeLabel', { grade: g })}
                </option>
              ))}
            </Select>
            <Select
              className="w-full"
              aria-label={t('filterTopic')}
              value={filter.topic}
              onChange={(e) => set({ topic: e.target.value })}
            >
              <option value="">{t('allTopics')}</option>
              {(facets.data?.topics ?? []).map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </Select>
            <Select
              className="w-full"
              aria-label={t('filterType')}
              value={filter.type}
              onChange={(e) => set({ type: e.target.value })}
            >
              <option value="">{t('allTypes')}</option>
              {QUESTION_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {QUESTION_TYPE_LABELS[ty]}
                </option>
              ))}
            </Select>
            <Select
              className="w-full"
              aria-label={t('filterDifficulty')}
              value={filter.difficulty}
              onChange={(e) => set({ difficulty: e.target.value })}
            >
              <option value="">{t('allDifficulties')}</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </Select>
            <Select
              className="w-full"
              aria-label={t('sort')}
              value={filter.sort}
              onChange={(e) => set({ sort: e.target.value as CommunitySort })}
            >
              <option value="new">{t('sortNew')}</option>
              <option value="liked">{t('sortLiked')}</option>
              <option value="cloned">{t('sortCloned')}</option>
            </Select>
          </div>

          {sets.isPending ? (
            <div className="flex justify-center py-12 text-slate-400">
              <Spinner className="size-6" />
            </div>
          ) : sets.isError ? (
            <Alert variant="error">{errorMessage(sets.error)}</Alert>
          ) : sets.data.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              {t('empty')}
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">{t('count', { count: sets.data.total })}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sets.data.items.map((item) => (
                  <SetCard key={item.id} set={item} />
                ))}
              </div>
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={filter.page <= 1}
                    onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
                  >
                    {t('prev')}
                  </Button>
                  <span className="tabular-nums">{t('page', { page: filter.page, pages })}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={filter.page >= pages}
                    onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
                  >
                    {t('next')}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      ) : mine.isPending ? (
        <div className="flex justify-center py-12 text-slate-400">
          <Spinner className="size-6" />
        </div>
      ) : mine.isError ? (
        <Alert variant="error">{errorMessage(mine.error)}</Alert>
      ) : mine.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {t('mineEmpty')}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mine.data.map((item) => (
            <SetCard key={item.id} set={item} showStatus />
          ))}
        </div>
      )}

      {publishOpen && (
        <PublishSetDialog
          initialQuizId={publishQuiz}
          onClose={closePublish}
          onPublished={(published) => router.push(`/app/community/${published.id}`)}
        />
      )}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12 text-slate-400">
          <Spinner className="size-6" />
        </div>
      }
    >
      <CommunityPageInner />
    </Suspense>
  );
}
