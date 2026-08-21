import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Lock, Wallet } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { SiteFooter } from '../components/home';
import { SectionEyebrow, GoldWord, Reveal } from '../components/providers/SectionHeading';

// ─── /how-it-works · Brand & Marketing Map V1 §6 ─────────────────────────────
// The five-stage frame the report asks for — Understand, Assess, Decide, Match,
// Act — plus the two blocks agreed alongside it: what it costs (free for the
// user, the model explained, no amounts named) and what happens to the data
// (EU hosting, anonymous until registration).
//
// Two report positions are load-bearing here and are stated in the open rather
// than implied: §15 "if you already have everything covered, we say so", and
// "ranking is never for sale". Both live in the Decide and Match stages.
//
// Copy: common.json → howItWorks.* (en/de/es/tr).

const STAGE_COUNT = 5;

function Stage({ index }: { index: number }) {
  const { t } = useTranslation('common');
  const last = index === STAGE_COUNT - 1;

  return (
    <Reveal className="relative grid gap-x-8 gap-y-3 pb-14 last:pb-0 sm:grid-cols-[auto_1fr]">
      {/* Rail: numbered node with the connector running to the next stage. The
          connector stops at the last node so the sequence reads as finished. */}
      <div className="flex flex-col items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-stroke-brand bg-brand-light text-body-md font-bold tabular-nums text-fg-brand">
          {index + 1}
        </span>
        {!last && <span aria-hidden className="mt-2 hidden w-px flex-1 bg-stroke-subtle sm:block" />}
      </div>

      <div className="min-w-0">
        <span className="text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
          {t(`howItWorks.stages.${index}.kicker`)}
        </span>
        <h3 className="mt-1.5 font-serif text-[1.5rem] font-bold leading-snug text-fg">
          {t(`howItWorks.stages.${index}.title`)}
        </h3>
        <p className="mt-2.5 max-w-[62ch] text-body leading-relaxed text-fg-secondary">
          {t(`howItWorks.stages.${index}.body`)}
        </p>
      </div>
    </Reveal>
  );
}

function InfoBlock({ base, icon }: { base: 'cost' | 'privacy'; icon: React.ReactNode }) {
  const { t } = useTranslation('common');
  return (
    <div className="rounded-xl border border-stroke-subtle bg-surface p-8">
      <span className="inline-flex items-center gap-2 text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {icon}
        {t(`howItWorks.${base}.kicker`)}
      </span>
      <p className="mt-3 font-serif text-[1.5rem] font-bold leading-snug text-fg">
        {t(`howItWorks.${base}.title`)}
      </p>
      <p className="mt-2.5 text-body-sm leading-relaxed text-fg-secondary">
        {t(`howItWorks.${base}.body`)}
      </p>
    </div>
  );
}

export function HowItWorksPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { locale } = useParams();


  // Single CTA on purpose: the report's secondary entry ("Ask a Compliance
  // Question") belongs to the search page, which is not on this branch yet.
  const startAssessment = () => navigate(`/${locale ?? 'en'}/wizard`);

  return (
    <main className="bg-surface">
      {/* The site header is fixed and ~113px tall at lg (97px below it), and
          there is no global spacer — each page clears it itself. pt-32/pt-40
          buys real breathing room instead of the 1px the section padding alone
          was leaving between the header and the eyebrow. */}
      <section className="border-b border-stroke-subtle bg-surface-secondary pb-20 pt-32 lg:pb-28 lg:pt-40">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow tone="brand">{t('howItWorks.eyebrow')}</SectionEyebrow>
            <h1 className="font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-fg lg:text-[3rem]">
              {t('howItWorks.title.pre')}
              <GoldWord>{t('howItWorks.title.gold')}</GoldWord>
              {t('howItWorks.title.post')}
            </h1>
            <p className="text-body-lg leading-relaxed text-fg-secondary">{t('howItWorks.lead')}</p>
          </Reveal>
        </Container>
      </section>

      <section className="py-20 lg:py-24">
        <Container size="xl">
          <div className="mx-auto max-w-[820px]">
            {Array.from({ length: STAGE_COUNT }, (_, i) => (
              <Stage key={i} index={i} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-surface-secondary py-16 lg:py-20">
        <Container size="xl">
          <div className="mx-auto grid max-w-[980px] gap-5 md:grid-cols-2">
            <InfoBlock base="cost" icon={<Wallet size={14} />} />
            <InfoBlock base="privacy" icon={<Lock size={14} />} />
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-24">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
            <h2 className="font-serif text-[1.875rem] font-semibold leading-tight text-fg">
              {t('howItWorks.cta.title')}
            </h2>
            <p className="text-body leading-relaxed text-fg-secondary">{t('howItWorks.cta.lead')}</p>
            <Button size="lg" variant="primary" className="mt-2" onClick={startAssessment}>
              {t('hero.cta.start', { ns: 'home', defaultValue: 'Assess My Needs' })}
              <ArrowRight size={17} className="ml-1.5" />
            </Button>
          </Reveal>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
