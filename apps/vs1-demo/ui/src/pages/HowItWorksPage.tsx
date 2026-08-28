import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Wallet } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { SiteFooter } from '../components/home';
import { StagesShowcase } from '../components/home/StagesShowcase';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../components/providers/SectionHeading';

// ─── /how-it-works · Brand & Marketing Map V1 §6 ─────────────────────────────
// The five-stage frame the report asks for — Understand, Assess, Decide, Match,
// Act — plus the two blocks agreed alongside it: what it costs (free for the
// user, the model explained, no amounts named) and what happens to the data
// (anonymous until registration; deliberately NO hosting-location promise —
// the hoster may change, user decision 2026-08-26).
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

// Closing band (canvas "So funktioniert es · Abschluss-Band", 2026-08-26):
// the two info blocks as white cards on the Gradient — pure 44px brand icons,
// no chip box — replacing both the grey info section and the bare CTA section.
function InfoCard({ base, icon }: { base: 'cost' | 'privacy'; icon: React.ReactNode }) {
  const { t } = useTranslation('common');
  return (
    <StaggerItem className="rounded-xl border border-stroke-subtle bg-surface p-7 shadow-[0_18px_44px_-30px_rgba(2,22,17,0.25)] dark:bg-surface-secondary">
      <span className="flex items-center gap-3.5">
        {icon}
        <span className="text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-brand">
          {t(`howItWorks.${base}.kicker`)}
        </span>
      </span>
      <p className="mt-3.5 font-serif text-[1.375rem] font-bold leading-snug text-fg">
        {t(`howItWorks.${base}.title`)}
      </p>
      <p className="mt-2.5 text-body-xs leading-relaxed text-fg-secondary">
        {t(`howItWorks.${base}.body`)}
      </p>
    </StaggerItem>
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
      {/* The site header is fixed and 81px tall at lg (65px below it), and
          there is no global spacer — each page clears it itself. pt-32/pt-40
          buys real breathing room instead of the 1px the section padding alone
          was leaving between the header and the eyebrow. */}
      {/* Hero on the full-bleed Gradient (canvas · Variante B "Split mit
          Routen-Dossier", 2026-08-26): copy standing left on the tint with the
          primary CTA and the quiet meta line, the five stages as a white
          dossier card on the right — the page as an itinerary. */}
      {/* Bottom padding trimmed to land this hero on the shared 613px desktop
          height of every marketing hero (user ask 2026-08-28, hub = reference);
          the min-h floor keeps it there if the copy ever shortens. */}
      <section className="flex flex-col justify-center bg-gradient-stage px-4 pb-16 pt-32 md:px-6 lg:min-h-[38.3125rem] lg:px-10 lg:pb-[3.25rem] lg:pt-40">
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

      {/* The five stages as the zigzag showcase route (canvas Variante A) —
          replaces the plain numbered list. */}
      <section className="py-20 lg:py-24">
        <Container size="2xl" bleed className="px-4 md:px-6 lg:px-10">
          <StagesShowcase />
        </Container>
      </section>

      {/* Closing band — replaces the grey info section AND the bare CTA
          section: header, the two info cards (cascade), hairline, then the
          page CTA row. On white since 2026-08-28 (user ask): the Gradient
          already carries this page's hero and the stages showcase directly
          above, and a third tinted band in a row read as one long wash. */}
      <section className="bg-surface px-4 py-16 md:px-6 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[1180px]">
          <Reveal className="max-w-[720px]">
            <SectionEyebrow tone="brand">{t('howItWorks.closing.eyebrow')}</SectionEyebrow>
            <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
              {t('howItWorks.closing.title')}
            </h2>
          </Reveal>
          <Stagger stagger={0.16} className="mt-8 grid gap-4 md:grid-cols-2">
            <InfoCard base="cost" icon={<Wallet size={44} strokeWidth={1.6} className="shrink-0 text-fg-brand" aria-hidden />} />
            <InfoCard base="privacy" icon={<Lock size={44} strokeWidth={1.6} className="shrink-0 text-fg-brand" aria-hidden />} />
          </Stagger>
          <Reveal
            delay={0.2}
            className="mt-10 flex flex-col gap-6 border-t border-stroke-subtle pt-8 md:flex-row md:items-center md:justify-between md:gap-10"
          >
            <div>
              <h3 className="font-serif text-[1.375rem] font-bold leading-snug text-fg">
                {t('howItWorks.cta.title')}
              </h3>
              <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{t('howItWorks.cta.lead')}</p>
            </div>
            <Button size="lg" variant="primary" className="shrink-0" onClick={startAssessment}>
              {t('hero.cta.start', { ns: 'home', defaultValue: 'Assess My Needs' })}
              <ArrowRight size={17} className="ml-1.5" />
            </Button>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
