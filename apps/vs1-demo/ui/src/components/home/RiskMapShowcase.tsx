import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { RiskBadge, type RiskLevel } from '../ui/RiskBadge';
import { Stat } from '../ui/Stat';
import { SectionEyebrow, GoldWord } from '../providers/SectionHeading';
import { StateCell, type StateKind } from './RiskMapSection';
import { useInViewOnce } from '../../lib/useInViewOnce';

// ─── S2 — Risk Map showcase (canvas "Das gilt für Sie" · Variante A) ──────────
// Replaces RiskMapSection's stat-strip + inline table ON THE HOMEPAGE ONLY —
// RiskMapSection stays in the tree. The Mercury pattern with the wizard
// showcase's tinted gradient panel: the Risk Map floats as a product frame on
// the panel and is CROPPED at the panel's bottom edge — there is visibly more
// below. The partner preview and the save band carry over unchanged.
//
// Scroll choreography (user spec 2026-08-25): the tinted panel is already
// standing when the section scrolls in; once in view, the frame drives up
// smoothly from below the panel edge (overflow hidden makes it emerge).
// Reduced motion shows the frame in place.

const STAT_INDICES = [0, 1, 2, 3] as const;

// A representative slice of RiskMapSection's eight rows — indices into the
// shared riskMap.rows.* copy, chosen on the canvas: the three critical ones,
// one action row (the petrol CTA), one running confirmed, one more action
// row for the crop to cut through.
const SHOWCASE_ROWS: { row: number; level: RiskLevel; state: StateKind }[] = [
  { row: 0, level: 'critical', state: 'confirmed' },
  { row: 1, level: 'critical', state: 'likely' },
  { row: 2, level: 'critical', state: 'likely' },
  { row: 5, level: 'medium', state: 'action' },
  { row: 4, level: 'high', state: 'confirmed' },
  { row: 6, level: 'medium', state: 'action' },
];

const COLS = 'sm:grid sm:grid-cols-[100px_1fr_92px_92px_168px] sm:items-center sm:gap-3';

export function RiskMapShowcase() {
  const { t } = useTranslation('home');
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-100px');
  const reduced = useReducedMotion();
  const animate = inView || !!reduced;

  return (
    <section id="risk-map" className="bg-surface pt-20 lg:pt-28">
      <Container size="xl">
        {/* Heading */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('riskMap.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
            {t('riskMap.title.pre')}<GoldWord>{t('riskMap.title.gold')}</GoldWord>{t('riskMap.title.post')}
          </h2>
          <p className="text-body text-fg-secondary">
            {t('riskMap.subtitle')}
          </p>
        </div>

        {/* The showcase panel — the wizard showcase's fixed-light gradient
            (see the guard test's colour note); the frame keeps its own
            surface tokens. Fixed height + overflow-hidden only from lg up:
            that is what crops the frame; mobile shows it whole. */}
        <div
          ref={ref}
          className="mt-14 overflow-hidden rounded-xl bg-[linear-gradient(165deg,#EAF3F1_0%,#DDECE8_55%,#E9E4D3_100%)] px-4 pt-10 sm:px-10 lg:h-[560px] lg:px-16 lg:pt-16"
        >
          <motion.div
            initial={reduced ? false : { y: 480, opacity: 0 }}
            animate={animate ? { y: 0, opacity: 1 } : {}}
            transition={{ delay: 0.25, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-[1040px] overflow-hidden rounded-[14px] bg-surface shadow-[0_40px_90px_-30px_rgba(2,22,17,0.4)]"
          >
            {/* Stat strip */}
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b border-stroke-subtle px-6 py-5 sm:px-8">
              {STAT_INDICES.map((i) => (
                <Stat
                  key={i}
                  value={<span className="text-fg-accent-emphasis">{t(`riskMap.stats.${i}.value`)}</span>}
                  label={t(`riskMap.stats.${i}.label`)}
                  size="md"
                />
              ))}
            </div>
            {/* Obligation table */}
            <div className={`hidden px-5 py-3 text-body-4xs font-semibold uppercase tracking-wide text-fg-tertiary sm:px-6 ${COLS} sm:bg-surface-secondary`}>
              <span>{t('risk.table.severity')}</span>
              <span>{t('risk.table.obligation')}</span>
              <span>{t('risk.table.market')}</span>
              <span>{t('risk.table.due')}</span>
              <span>{t('risk.table.state')}</span>
            </div>
            {SHOWCASE_ROWS.map((r) => (
              <div key={r.row} className={`border-t border-stroke px-5 py-4 sm:px-6 ${COLS}`}>
                <span className="mb-2 inline-block sm:mb-0">
                  <RiskBadge level={r.level} size="sm">{t(`risk.severity.${r.level}`)}</RiskBadge>
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-fg">{t(`riskMap.rows.${r.row}.title`)}</p>
                  <p className="mt-0.5 text-body-2xs leading-snug text-fg-brand">{t(`riskMap.rows.${r.row}.detail`)}</p>
                </div>
                <span className="mt-2 block text-body-2xs text-fg-secondary sm:mt-0">{t(`riskMap.rows.${r.row}.market`)}</span>
                <span className="mt-1 block sm:mt-0">
                  <span className="text-body-xs font-semibold text-fg">{t(`riskMap.rows.${r.row}.due`)}</span>{' '}
                  <span className="text-body-3xs text-fg-tertiary sm:block">{t(`riskMap.rows.${r.row}.dueSub`)}</span>
                </span>
                <span className="mt-3 block sm:mt-0">
                  <StateCell kind={r.state} />
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* The partner preview moved into MatchShowcase (the merged
            "Der Unterschied" section directly below). */}
      </Container>

      {/* Save CTA band — unchanged from RiskMapSection */}
      <div className="mt-16 bg-surface-secondary px-6 py-14 text-center lg:py-16">
        <h3 className="font-serif text-[26px] font-bold tracking-tight text-fg">{t('riskMap.save.title')}</h3>
        <p className="mx-auto mt-2 text-body-sm text-fg-secondary">
          {t('riskMap.save.subtitle')}
        </p>
        <Button className="mt-7">
          {t('riskMap.save.cta')} <ArrowRight size={16} className="ml-1.5" />
        </Button>
      </div>
    </section>
  );
}
