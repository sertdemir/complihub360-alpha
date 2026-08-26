import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Container } from '../ui/Container';
import { RiskBadge, type RiskLevel } from '../ui/RiskBadge';
import { SectionEyebrow, GoldWord } from '../providers/SectionHeading';
import { StateCell, type StateKind } from './RiskMapSection';
import { useInViewOnce } from '../../lib/useInViewOnce';

// ─── S2 — Risk Map showcase (canvas "Das gilt für Sie" · Split, 2026-08-25) ───
// Replaces RiskMapSection's centred layout ON THE HOMEPAGE ONLY —
// RiskMapSection stays in the tree. The mirrored counterpart to the wizard
// showcase: copy on the LEFT, the Gradient panel (CLAUDE.md) with a compact,
// fully visible Risk-Map card on the RIGHT — panel left there, panel right
// here, that is the page's rhythm.
//
// The card's head is the reviewed "bare numbers" variant: gold serif numbers
// with single-line labels in a calm 2×2 grid (riskMap.statsCompact.*), all
// four values on steady lines — the older label-over-value strip wrapped and
// pushed the numbers off line.
//
// Scroll choreography (user spec): the tinted panel is already standing when
// the section scrolls in; once in view the card drives up smoothly from below
// the panel edge and settles centred. Reduced motion shows it in place.

const STAT_INDICES = [0, 1, 2, 3] as const;

// The reviewed five-row slice of the shared riskMap.rows.* copy: the three
// critical ones, the DSFA action row (petrol CTA), the running confirmed one.
const SHOWCASE_ROWS: { row: number; level: RiskLevel; state: StateKind }[] = [
  { row: 0, level: 'critical', state: 'confirmed' },
  { row: 1, level: 'critical', state: 'likely' },
  { row: 2, level: 'critical', state: 'likely' },
  { row: 5, level: 'medium', state: 'action' },
  { row: 4, level: 'high', state: 'confirmed' },
];

export function RiskMapShowcase() {
  const { t } = useTranslation('home');
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-100px');
  const reduced = useReducedMotion();
  const animate = inView || !!reduced;

  return (
    <section id="risk-map" className="bg-surface py-20 lg:py-24">
      <Container size="2xl" bleed className="px-4 md:px-6 lg:px-10">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-[88px]">
          {/* The pitch, left-aligned */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="w-full min-w-0 lg:max-w-[440px] lg:flex-1"
          >
            <SectionEyebrow tone="brand">{t('riskMap.eyebrow')}</SectionEyebrow>
            <h2 className="mt-4 font-serif text-[2rem] font-semibold leading-[1.15] tracking-tight text-fg lg:text-[2.5rem]">
              {t('riskMap.title.pre')}<GoldWord>{t('riskMap.title.gold')}</GoldWord>{t('riskMap.title.post')}
            </h2>
            <p className="mt-5 max-w-[44ch] text-body-lg leading-relaxed text-fg-secondary">{t('riskMap.subtitle')}</p>
          </motion.div>

          {/* The Gradient panel; the card drives up from below its edge. */}
          <div
            ref={ref}
            className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-stage px-4 py-10 lg:h-[640px] lg:w-[720px] lg:shrink-0 lg:px-0 lg:py-0"
          >
            <motion.div
              initial={reduced ? false : { y: 480, opacity: 0 }}
              animate={animate ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.25, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[620px] overflow-hidden rounded-[14px] bg-surface shadow-[0_40px_90px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary"
            >
              {/* Head: bare gold numbers, single-line labels, 2×2 */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-b border-stroke-subtle px-5 py-4 sm:grid-cols-2">
                {STAT_INDICES.map((i) => (
                  <div key={i} className="flex min-w-0 items-center gap-2.5">
                    <span className="min-w-6 shrink-0 text-center font-serif text-[19px] font-bold text-fg-accent-emphasis">
                      {t(`riskMap.statsCompact.${i}.value`)}
                    </span>
                    <span className="truncate text-body-4xs font-semibold uppercase tracking-[0.06em] text-fg-secondary">
                      {t(`riskMap.statsCompact.${i}.label`)}
                    </span>
                  </div>
                ))}
              </div>
              {/* Condensed obligation rows */}
              {SHOWCASE_ROWS.map((r) => (
                <div key={r.row} className="grid grid-cols-[88px_1fr] items-center gap-3.5 border-t border-stroke px-5 py-3.5 sm:grid-cols-[88px_1fr_auto]">
                  <span>
                    <RiskBadge level={r.level} size="sm">{t(`risk.severity.${r.level}`)}</RiskBadge>
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-xs font-bold text-fg">{t(`riskMap.rows.${r.row}.title`)}</p>
                    <p className="mt-0.5 text-body-3xs leading-snug text-fg-accent-emphasis">
                      {t(`riskMap.rows.${r.row}.market`)} · {t('risk.table.due')} {t(`riskMap.rows.${r.row}.due`)}
                    </p>
                  </div>
                  <span className="col-start-2 mt-2 justify-self-start sm:col-start-3 sm:mt-0 sm:justify-self-end">
                    <StateCell kind={r.state} />
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
