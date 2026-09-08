'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CopyButton } from '@/components/copy-button';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Tabs } from '@/components/ui/tabs';
import { useClassDetail, useLimits } from '@/lib/classes';
import { PrintSheet } from './print-sheet';
import { RosterTab } from './roster-tab';
import { SessionsTab } from './sessions-tab';
import { SettingsTab } from './settings-tab';

type TabId = 'roster' | 'sessions' | 'reports' | 'settings';

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Classes');
  const tc = useTranslations('Common');
  const detail = useClassDetail(id);
  const limits = useLimits();
  const [tab, setTab] = useState<TabId>('roster');

  if (detail.isPending) {
    return (
      <div className="flex justify-center py-12 text-slate-400">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{t('notFound')}</Alert>
        <Link href="/app/classes" className="text-brand-700 hover:underline">
          {t('backToList')}
        </Link>
      </div>
    );
  }

  const klass = detail.data;
  const tabs = [
    { id: 'roster' as const, label: t('tabs.roster') },
    { id: 'sessions' as const, label: t('tabs.sessions') },
    { id: 'reports' as const, label: t('tabs.reports') },
    { id: 'settings' as const, label: t('tabs.settings') },
  ];

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div>
          <Link
            href="/app/classes"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="size-4" />
            {t('backToList')}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{klass.name}</h1>
              <p className="text-sm text-slate-500">
                {[klass.subject, klass.grade].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
              <span className="text-xs uppercase tracking-wide text-slate-500">{t('code')}</span>
              <span className="font-mono text-xl font-bold tracking-[0.3em] text-slate-900">
                {klass.code}
              </span>
              <CopyButton text={klass.code} />
            </div>
          </div>
        </div>

        <Tabs tabs={tabs} value={tab} onChange={setTab} />

        {tab === 'roster' && <RosterTab klass={klass} limits={limits.data} />}
        {tab === 'sessions' && <SessionsTab klass={klass} />}
        {tab === 'settings' && <SettingsTab klass={klass} />}
        {tab === 'reports' && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            {tc('comingSoon')}
          </div>
        )}
      </div>
      <PrintSheet klass={klass} />
    </>
  );
}
