import {
  ArrowRight,
  Check,
  FileText,
  Smartphone,
  ChartColumn,
  CalendarDays,
  BookOpen,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Footer } from '@/components/marketing/footer';
import { Showcase } from '@/components/marketing/showcase';
import { AttendanceMock } from '@/components/marketing/mocks';
import { Eyebrow, PillLink } from '@/components/marketing/primitives';
import { PricingTable } from '@/components/pricing/pricing-table';
import { TopNav } from '@/components/marketing/top-nav';

const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';
export default function LandingPage() {
  const t = useTranslations('Landing');
  const tp = useTranslations('Pricing');
  const icons = [FileText, Smartphone, ChartColumn];
  return (
    <>
      <a
        href="#noi-dung"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        {t('skip')}
      </a>
      <TopNav />
      <main id="noi-dung" className="flex-1">
        <section className={`${container} pb-12 pt-14 sm:pt-20 lg:pt-24`}>
          <div className="mx-auto max-w-4xl text-center">
            <Eyebrow className="text-ink-muted">{t('hero.eyebrow')}</Eyebrow>
            <h1 className="type-display mx-auto mt-6 max-w-3xl">
              {t('hero.prefix')}
              <br />
              <span className="text-accent">{t('hero.headline')}</span>
            </h1>
            <p className="type-lead mx-auto mt-6 max-w-2xl text-ink">{t('hero.subtitle')}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <PillLink href="/signup">
                {t('hero.cta')}
                <ArrowRight className="size-4" aria-hidden="true" />
              </PillLink>
              <PillLink href="#cach-dung" variant="secondary">
                {t('hero.secondary')}
              </PillLink>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">{t('hero.note')}</p>
          </div>
          <div id="cach-dung" className="scroll-mt-24 pt-12 sm:pt-16">
            <Showcase />
          </div>
        </section>
        <section id="tinh-nang" className={`${container} scroll-mt-24 py-14 sm:py-20`}>
          <Eyebrow className="text-ink-muted">{t('workflow.eyebrow')}</Eyebrow>
          <h2 className="type-h2 mt-3 max-w-2xl">{t('workflow.title')}</h2>
          <p className="type-lead mt-4 max-w-2xl text-ink">{t('workflow.subtitle')}</p>
          <ol className="mt-9 grid gap-5 md:grid-cols-3">
            {icons.map((Icon, i) => (
              <li key={i} className="flex flex-col rounded-card border border-hairline p-6">
                <div className="flex items-center justify-between">
                  <Icon
                    className="size-10 rounded-xl bg-accent-soft p-2 text-accent"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-sm text-ink-muted">0{i + 1}</span>
                </div>
                <Eyebrow className="mt-7 text-ink-muted">{t(`workflow.steps.${i}.label`)}</Eyebrow>
                <h3 className="type-h3 mt-3">{t(`workflow.steps.${i}.title`)}</h3>
                <p className="type-body mb-6 mt-3 flex-1 text-ink">
                  {t(`workflow.steps.${i}.body`)}
                </p>
                <div className="rounded-field bg-surface-soft p-4 text-sm font-medium leading-relaxed">
                  {t(`workflow.steps.${i}.detail`)}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="bg-surface-soft">
          <div className={`${container} py-14 sm:py-20`}>
            <Eyebrow className="text-ink-muted">{t('extras.eyebrow')}</Eyebrow>
            <h2 className="type-h2 mt-3">{t('extras.title')}</h2>
            <div className="mt-9 grid gap-6 md:grid-cols-2">
              <article className="rounded-card border border-hairline bg-canvas p-6 sm:p-8">
                <CalendarDays className="size-6 text-accent" aria-hidden="true" />
                <h3 className="type-h3 mt-4">{t('extras.attendanceTitle')}</h3>
                <p className="type-body mb-6 mt-3 text-ink">{t('extras.attendanceBody')}</p>
                <AttendanceMock />
                <p className="mt-3 text-xs text-ink-muted">{t('showcase.sample')}</p>
              </article>
              <article className="flex flex-col rounded-card border border-hairline bg-canvas p-6 sm:p-8">
                <BookOpen className="size-6 text-accent" aria-hidden="true" />
                <h3 className="type-h3 mt-4">{t('extras.historyTitle')}</h3>
                <p className="type-body mt-3 text-ink">{t('extras.historyBody')}</p>
                <div className="mt-6 flex-1 space-y-3 rounded-field bg-surface-soft p-5">
                  {['Toán 12A1 · Ôn tập hàm số', 'Toán 12A1 · Hàm số', 'Toán 12A1 · Đạo hàm'].map(
                    (name, i) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 rounded-lg border border-hairline bg-white p-3 text-sm"
                      >
                        <span className="rounded-lg bg-accent-soft p-2 font-mono text-accent">
                          0{3 - i}
                        </span>
                        <span className="font-medium">{name}</span>
                        <Check
                          className="ml-auto size-4 shrink-0 text-success"
                          aria-hidden="true"
                        />
                      </div>
                    ),
                  )}
                  <p className="text-xs text-ink-muted">{t('showcase.sample')}</p>
                </div>
                <p className="mt-4 text-sm text-ink-muted">{t('extras.historyNote')}</p>
              </article>
            </div>
          </div>
        </section>
        <section id="mien-phi" className={`${container} scroll-mt-24 py-16 sm:py-24`}>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="text-ink-muted">{tp('eyebrow')}</Eyebrow>
            <h2 className="type-h2 mt-3">{tp('title')}</h2>
            <p className="type-lead mt-4 text-ink-muted">{tp('body')}</p>
          </div>
          <PricingTable variant="marketing" className="mt-10" />
        </section>
        <section id="faq" className={`${container} scroll-mt-24 pb-16 sm:pb-24`}>
          <div className="mx-auto max-w-3xl">
            <Eyebrow className="text-ink-muted">{t('faq.eyebrow')}</Eyebrow>
            <h2 className="type-h2 mt-3">{t('faq.title')}</h2>
            <div className="mt-8 divide-y divide-hairline border-y border-hairline">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <details key={n} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold sm:text-lg">
                    {t(`faq.q${n}`)}
                    <span className="text-2xl font-normal group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="type-body mt-3 text-ink">{t(`faq.a${n}`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className={`${container} pb-20 text-center`}>
          <h2 className="type-h2 mx-auto max-w-2xl">{t('final.title')}</h2>
          <PillLink href="/signup" className="mt-7">
            {t('final.cta')}
            <ArrowRight className="size-4" aria-hidden="true" />
          </PillLink>
          <p className="mt-4 text-sm text-ink-muted">{t('pricing.unit')}</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
