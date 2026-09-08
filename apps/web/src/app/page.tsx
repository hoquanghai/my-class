import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations('Landing');
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        {t('title')}
      </h1>
      <p className="max-w-2xl text-lg text-slate-600">{t('subtitle')}</p>
      <a
        href="/signup"
        className="rounded-lg bg-brand-600 px-6 py-3 text-lg font-semibold text-white shadow hover:bg-brand-700"
      >
        {t('cta')}
      </a>
      <div className="flex aspect-video w-full max-w-2xl items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
        {t('demoPlaceholder')}
      </div>
      <p className="text-sm text-slate-500">{t('contact')}</p>
    </main>
  );
}
