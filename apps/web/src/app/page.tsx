import { Camera, ClipboardCheck, FileText, MonitorPlay, Smartphone, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { Footer } from '@/components/marketing/footer';
import {
  AttendanceMock,
  ClassCodeMock,
  ImportGridMock,
  LeaderboardMock,
  PhoneQuizMock,
} from '@/components/marketing/mocks';
import { ColorBlock, Eyebrow, PillLink, StickyNote } from '@/components/marketing/primitives';
import { Reveal } from '@/components/marketing/reveal';
import { TopNav } from '@/components/marketing/top-nav';

const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2 size-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export default function LandingPage() {
  const t = useTranslations('Landing');

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
        {/* Hero */}
        <section className={`${container} grid items-center gap-10 py-14 lg:grid-cols-12 lg:py-24`}>
          <div className="lg:col-span-6">
            <Eyebrow className="text-ink-muted">{t('hero.eyebrow')}</Eyebrow>
            <h1 className="type-display mt-4 max-w-[16ch] text-ink">{t('hero.title')}</h1>
            <p className="type-lead mt-5 max-w-xl text-ink">{t('hero.subtitle')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PillLink href="/signup">{t('hero.cta')}</PillLink>
              <PillLink href="#cach-dung" variant="secondary">
                {t('hero.secondary')}
              </PillLink>
            </div>
            <p className="mt-5 text-sm text-ink-muted">{t('hero.note')}</p>
          </div>

          <div className="relative lg:col-span-6">
            <div className="relative aspect-[3/2] overflow-hidden rounded-block bg-surface-soft">
              <Image
                src="/img/hero-classroom.webp"
                alt={t('imgAlt.hero')}
                fill
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
            </div>
            <StickyNote
              tone="lime"
              rotate={-3}
              className="absolute -bottom-6 -left-2 w-56 sm:left-6"
            >
              <LeaderboardMock />
            </StickyNote>
            <StickyNote
              tone="cream"
              rotate={2}
              className="absolute -right-2 -top-4 hidden w-44 sm:block"
            >
              <p className="mb-2 type-eyebrow text-[11px]">{t('hero.noteAttendance')}</p>
              <div className="flex flex-wrap gap-1.5 text-xs font-medium">
                <span className="rounded-md bg-block-mint px-2 py-1 text-success">
                  {t('hero.present')}: 27
                </span>
                <span className="rounded-md bg-block-cream px-2 py-1 text-warning ring-1 ring-ink/10">
                  {t('hero.late')}: 2
                </span>
                <span className="rounded-md bg-block-pink px-2 py-1 text-danger">
                  {t('hero.absent')}: 1
                </span>
              </div>
            </StickyNote>
          </div>
        </section>

        {/* Dải bằng chứng */}
        <section className="bg-surface-soft">
          <ul className={`${container} grid gap-4 py-6 sm:grid-cols-3`}>
            {[
              [Smartphone, t('proof.join')],
              [FileText, t('proof.import')],
              [MonitorPlay, t('proof.project')],
            ].map(([Icon, text]) => {
              const I = Icon as typeof Smartphone;
              return (
                <li
                  key={String(text)}
                  className="flex items-center gap-3 text-sm font-medium text-ink"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-canvas">
                    <I className="size-5" aria-hidden="true" />
                  </span>
                  {String(text)}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Cách dùng */}
        <section id="cach-dung" className={`${container} py-16 lg:py-24`}>
          <Reveal>
            <Eyebrow className="text-ink-muted">{t('how.eyebrow')}</Eyebrow>
            <h2 className="type-h2 mt-3 max-w-2xl text-ink">{t('how.title')}</h2>
          </Reveal>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {([1, 2, 3] as const).map((n, i) => (
              <Reveal
                key={n}
                as="li"
                delayMs={i * 80}
                className="rounded-card border border-hairline p-6"
              >
                <span className="type-eyebrow text-ink-muted">0{n}</span>
                <h3 className="type-h3 mt-3 text-ink">{t(`how.step${n}Title`)}</h3>
                <p className="type-body mt-2 text-ink">{t(`how.step${n}Body`)}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Kiểm tra đầu giờ — lime */}
        <div id="tinh-nang" className={`${container}`}>
          <Reveal>
            <ColorBlock tone="lime" className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <Eyebrow>{t('quiz.eyebrow')}</Eyebrow>
                <h2 className="type-h2 mt-3">{t('quiz.title')}</h2>
                <p className="type-lead mt-4">{t('quiz.body')}</p>
                <ul className="type-body mt-5 space-y-2">
                  <Bullet>{t('quiz.b1')}</Bullet>
                  <Bullet>{t('quiz.b2')}</Bullet>
                  <Bullet>{t('quiz.b3')}</Bullet>
                </ul>
                <PillLink href="/signup" className="mt-8">
                  {t('quiz.cta')}
                </PillLink>
              </div>
              <div className="relative flex justify-center py-6 lg:col-span-6 lg:justify-start lg:pl-6">
                <PhoneQuizMock revealed className="lg:mx-0" />
                <StickyNote
                  tone="white"
                  rotate={3}
                  className="absolute -right-1 bottom-2 w-52 sm:right-4 lg:bottom-10 lg:right-2"
                >
                  <LeaderboardMock />
                </StickyNote>
              </div>
            </ColorBlock>
          </Reveal>
        </div>

        {/* Ngân hàng câu hỏi — lilac */}
        <div className={`${container} mt-16 lg:mt-24`}>
          <Reveal>
            <ColorBlock tone="lilac" className="grid items-center gap-10 lg:grid-cols-12">
              <div className="order-2 lg:order-1 lg:col-span-5">
                <div className="relative mx-auto max-w-sm">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-canvas/40">
                    <Image
                      src="/img/bank-photo.webp"
                      alt={t('imgAlt.bank')}
                      fill
                      loading="lazy"
                      sizes="(min-width: 1024px) 420px, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <StickyNote
                    tone="white"
                    rotate={-2}
                    className="absolute -bottom-5 -right-2 w-60 sm:right-[-24px]"
                  >
                    <ImportGridMock />
                  </StickyNote>
                </div>
              </div>
              <div className="order-1 lg:order-2 lg:col-span-7">
                <Eyebrow>{t('bank.eyebrow')}</Eyebrow>
                <h2 className="type-h2 mt-3">{t('bank.title')}</h2>
                <p className="type-lead mt-4">{t('bank.body')}</p>
                <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    [FileText, t('bank.b1')],
                    [Camera, t('bank.b2')],
                    [ClipboardCheck, t('bank.b3')],
                  ].map(([Icon, text]) => {
                    const I = Icon as typeof FileText;
                    return (
                      <li
                        key={String(text)}
                        className="rounded-field bg-canvas/60 p-4 text-sm font-medium"
                      >
                        <I className="mb-2 size-5" aria-hidden="true" />
                        {String(text)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </ColorBlock>
          </Reveal>
        </div>

        {/* Điểm danh — cream */}
        <div className={`${container} mt-16 lg:mt-24`}>
          <Reveal>
            <ColorBlock tone="cream" className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <Eyebrow>{t('attendance.eyebrow')}</Eyebrow>
                <h2 className="type-h2 mt-3">{t('attendance.title')}</h2>
                <p className="type-lead mt-4">{t('attendance.body')}</p>
                <ul className="type-body mt-5 space-y-2">
                  <Bullet>{t('attendance.b1')}</Bullet>
                  <Bullet>{t('attendance.b2')}</Bullet>
                  <Bullet>{t('attendance.b3')}</Bullet>
                </ul>
              </div>
              <div className="lg:col-span-6">
                <div className="mx-auto max-w-sm rounded-card bg-canvas p-4 shadow-soft">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">{t('attendance.mockTitle')}</span>
                    <span className="font-mono text-xs text-ink-muted">19:02</span>
                  </div>
                  <AttendanceMock />
                </div>
              </div>
            </ColorBlock>
          </Reveal>
        </div>

        {/* Dành cho học sinh — navy */}
        <div id="hoc-sinh" className={`${container} mt-16 lg:mt-24`}>
          <Reveal>
            <ColorBlock tone="navy" className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <Eyebrow className="text-white/80">{t('students.eyebrow')}</Eyebrow>
                <h2 className="type-h2 mt-3">{t('students.title')}</h2>
                <p className="type-lead mt-4 max-w-xl text-white/90">{t('students.body')}</p>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <ClassCodeMock />
                  <span className="text-sm text-white/80">{t('students.codeHint')}</span>
                </div>
                <p className="mt-6 max-w-xl text-sm text-white/70">{t('students.hostNote')}</p>
              </div>
              <div className="lg:col-span-5">
                <div className="relative mx-auto aspect-[4/5] max-w-xs overflow-hidden rounded-card bg-white/10">
                  <Image
                    src="/img/student-phone.webp"
                    alt={t('imgAlt.students')}
                    fill
                    loading="lazy"
                    sizes="(min-width: 1024px) 320px, 80vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </ColorBlock>
          </Reveal>
        </div>

        {/* FAQ */}
        <section id="faq" className={`${container} py-16 lg:py-24`}>
          <Reveal>
            <Eyebrow className="text-ink-muted">{t('faq.eyebrow')}</Eyebrow>
            <h2 className="type-h2 mt-3 text-ink">{t('faq.title')}</h2>
          </Reveal>
          <div className="mt-8 divide-y divide-hairline border-y border-hairline">
            {([1, 2, 3, 4] as const).map((n) => (
              <details key={n} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-ink">
                  {t(`faq.q${n}`)}
                  <span
                    className="text-2xl font-normal leading-none text-ink-muted transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink">
                  {t(`faq.a${n}`)}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA cuối */}
        <section className={`${container} pb-20 lg:pb-28`}>
          <Reveal className="text-center">
            <Trophy className="mx-auto size-8 text-ink" aria-hidden="true" />
            <h2 className="type-h2 mx-auto mt-4 max-w-2xl text-ink">{t('final.title')}</h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PillLink href="/signup">{t('final.cta')}</PillLink>
              <Link
                href="/login"
                className="text-base font-medium text-ink underline-offset-4 hover:underline"
              >
                {t('final.login')}
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </>
  );
}
