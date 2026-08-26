import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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

// Hero card cascade (canvas "So funktioniert es · Hero" · B, 2026-08-26): the
// dossier card rises onto the Gradient a beat after the copy, then its five
// stage rows build up one after another — the Homebase/Newsletter language.
const cardShell = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const, delay: 0.2, when: 'beforeChildren' as const, staggerChildren: 0.09 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

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
      {/* Hero on the full-bleed Gradient (canvas · Variante B "Split mit
          Routen-Dossier", 2026-08-26): copy standing left on the tint with the
          primary CTA and the quiet meta line, the five stages as a white
          dossier card on the right — the page as an itinerary. */}
      <section className="bg-gradient-stage px-4 pb-16 pt-32 md:px-6 lg:px-10 lg:pb-24 lg:pt-40">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-12 lg:flex-row lg:items-center lg:gap-[76px]">
          <Reveal className="min-w-0 flex-1">
            <SectionEyebrow tone="brand">{t('howItWorks.eyebrow')}</SectionEyebrow>
            <h1 className="mt-3.5 font-serif text-[2.25rem] font-semibold leading-[1.14] tracking-tight text-fg lg:text-[3rem]">
              {t('howItWorks.title.pre')}
              <GoldWord>{t('howItWorks.title.gold')}</GoldWord>
              {t('howItWorks.title.post')}
            </h1>
            <p className="mt-5 max-w-[50ch] text-body-lg leading-relaxed text-fg-secondary">{t('howItWorks.lead')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button size="lg" variant="primary" onClick={startAssessment}>
                {t('hero.cta.start', { ns: 'home', defaultValue: 'Assess My Needs' })}
                <ArrowRight size={17} className="ml-1.5" />
              </Button>
              <span className="text-body-xs font-medium text-fg-tertiary">{t('howItWorks.cta.lead')}</span>
            </div>
          </Reveal>

          <motion.div
            variants={cardShell}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="w-full shrink-0 rounded-xl bg-surface px-7 py-6 shadow-[0_40px_90px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary lg:w-[430px]"
          >
            <motion.p variants={cardItem} className="pb-2 text-body-3xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              {t('howItWorks.heroListTitle')}
            </motion.p>
            {Array.from({ length: STAGE_COUNT }, (_, i) => (
              <motion.div
                key={i}
                variants={cardItem}
                className={`flex items-center gap-4 py-3 ${i < STAGE_COUNT - 1 ? 'border-b border-stroke-subtle' : ''}`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-stroke-brand bg-brand-light text-body-sm font-bold tabular-nums text-fg-brand">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-body-4xs font-semibold uppercase tracking-[0.13em] text-fg-tertiary">
                    {t(`howItWorks.stages.${i}.kicker`)}
                  </span>
                  <span className="mt-0.5 block font-serif text-[1.03rem] font-bold leading-snug text-fg">
                    {t(`howItWorks.stages.${i}.title`)}
                  </span>
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
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
