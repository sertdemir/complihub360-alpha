import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';
import type { MarketProfile } from '../../lib/marketProfiles';

interface Props {
  profile: MarketProfile;
}

// ─── The market page's spine (canvas "Marktseite · Gewichtung" · Variante B,
// 2026-08-28) ─────────────────────────────────────────────────────────────────
// The transpose of AreaMarketHeatmap, and the section that carries the whole
// division of labour: every row LINKS to that area's page. This is where the
// market page hands over — it says which areas weigh most here, and the area
// page then explains what any single duty requires.
//
// In the Gradient-pair dress now: ONE white card of quiet rows on the tinted
// panel LEFT, the copy right — and the rows animate the way the obligations
// explorer's rail does (user ask 2026-08-28): each row carries its own
// staggered entrance, the bars ease to their width in view, and the top area
// stands out with the gold edge instead of a louder column.
//
// The per-row coverage column retired with the redesign: what it said row by
// row, the card's foot now says once — own sources in N of M areas, the rest
// is EU law applying directly. Same honesty, one sentence.
export function MarketWeights({ profile }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';
  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-100px');

  const score = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const areaName = (slug: string) =>
    t(`compliance.${slug}.title`, DOMAIN_BY_SLUG[slug as never]?.label ?? slug);

  // Named from the data, not written: the heaviest area against the runner-up,
  // with a separate phrasing when the top is a tie rather than letting the sort
  // order crown one.
  const lead = useMemo(() => {
    const [first, second] = profile.weights;
    if (!first || !second) return null;
    const tied = profile.weights.filter((w) => w.weight === first.weight);
    if (tied.length > 1) {
      return t('markets.country.weightsLeadTied', {
        defaultValue:
          '{{count}} areas weigh equally heavily here ({{weight}} out of 10). Each one leads to its own page.',
        count: tied.length,
        weight: score.format(first.weight),
      });
    }
    return t('markets.country.weightsLead', {
      defaultValue:
        '{{top}} weighs heaviest here — {{topWeight}} out of 10, against {{second}} at {{secondWeight}}. Each area leads to its own page; that is where what a single duty requires is set out.',
      top: areaName(first.domainSlug),
      topWeight: score.format(first.weight),
      second: areaName(second.domainSlug),
      secondWeight: score.format(second.weight),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, t, i18n.language]);

  // The gold edge marks every area sharing the top weight — a tie must not
  // let the sort order crown one of them.
  const topWeight = profile.weights[0]?.weight;

  return (
    // row-reverse on desktop: the card stands left, the copy right — the
    // mirror of the calendar thread below, so the page keeps alternating
    // sides. DOM order stays copy-first so mobile leads with the heading.
    <div
      ref={ref}
      className="flex flex-col gap-10 desktop-s:flex-row-reverse desktop-s:items-center desktop-s:gap-14"
    >
      <AreaSectionHeading
        className="shrink-0 desktop-s:w-[360px]"
        eyebrow={eyebrows.weighting}
        title={t('markets.country.weightsTitle', 'What weighs heaviest here')}
        lead={lead}
      />

      <div className="min-w-0 flex-1 rounded-xl bg-gradient-stage p-5 sm:p-7">
        <div className="overflow-hidden rounded-xl bg-surface shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary">
          <ul className="divide-y divide-stroke-subtle">
            {profile.weights.map((w, i) => {
              const severity = severityFromRiskWeight(w.weight);
              const top = w.weight === topWeight;
              return (
                // The explorer rail's entrance verbatim: each row its own
                // staggered reveal — never parent variant propagation, which
                // strips later-mounted rows (the vanishing-list bug).
                <motion.li
                  key={w.domainSlug}
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  animate={inView || reduced ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: i * 0.06 }}
                >
                  <Link
                    to={`${localePrefix}/compliance/${w.domainSlug}`}
                    className={`group flex items-center gap-4 py-3.5 pr-5 transition-colors sm:gap-5 ${
                      top
                        ? 'border-l-[3px] border-accent-500 bg-brand-light/50 pl-[calc(1.375rem-3px)] dark:bg-white/[0.05]'
                        : 'pl-[1.375rem] hover:bg-surface-secondary dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <span
                      className={`w-[10.5rem] shrink-0 text-body-sm leading-snug ${
                        top ? 'font-bold text-fg-brand' : 'font-semibold text-fg'
                      }`}
                    >
                      {areaName(w.domainSlug)}
                    </span>
                    {/* Petrol measures (doctrine 2026-08-27): high and up full,
                        medium and low the lighter weight — the min-w keeps the
                        track from being squeezed out of existence. On the top
                        row the track goes white for contrast on the tint. */}
                    <span
                      className={`h-1.5 min-w-[3rem] flex-1 overflow-hidden rounded-full ${
                        top ? 'bg-surface dark:bg-white/10' : 'bg-brand/10'
                      }`}
                    >
                      <span
                        className={`block h-full rounded-full transition-[width] duration-700 ease-out ${
                          severity === 'medium' || severity === 'low' ? 'bg-brand/45' : 'bg-brand'
                        }`}
                        style={{
                          width: inView ? `${(w.weight / 10) * 100}%` : 0,
                          transitionDelay: `${i * 60}ms`,
                        }}
                      />
                    </span>
                    <span className="w-[2.75rem] shrink-0 text-right text-body-sm font-bold tabular-nums text-fg">
                      {score.format(w.weight)}
                    </span>
                    <ArrowRight
                      size={13}
                      aria-hidden
                      className="shrink-0 text-stroke-strong transition-colors group-hover:text-fg-brand"
                    />
                  </Link>
                </motion.li>
              );
            })}
          </ul>
          {/* The sources, once, in the foot — where the retired per-row
              column used to repeat itself eight times. The coverage section
              folded in here too (user decision 2026-08-28): where this market
              has REAL gaps the foot names them, keeping the two admissions
              apart — a national text we do not carry yet (the EU instrument
              stands in, named) is not the same as holding nothing at all.
              An EU Regulation applying directly is neither: it is the law
              here, and it is not counted as missing. */}
          <p className="border-t border-stroke-subtle bg-surface-secondary px-[1.375rem] py-3.5 text-body-2xs leading-relaxed text-fg-tertiary dark:bg-white/[0.04]">
            {profile.gaps.length === 0
              ? t('markets.country.weightsFoot', {
                  defaultValue:
                    'Own sources in {{covered}} of {{total}} areas — the rest applies directly through EU law.',
                  covered: profile.byDomain.length,
                  total: profile.weights.length,
                })
              : [
                  t('markets.country.weightsFootCovered', {
                    defaultValue:
                      'Own sources in {{covered}} of {{total}} areas — EU Regulations apply directly and do not count as missing.',
                    covered: profile.byDomain.length,
                    total: profile.weights.length,
                  }),
                  profile.gaps.some((g) => g.kind === 'national-pending') &&
                    t('markets.country.weightsFootPending', {
                      defaultValue:
                        'For {{list}} a national text exists that we do not carry yet — the named EU instrument stands in.',
                      list: profile.gaps
                        .filter((g) => g.kind === 'national-pending')
                        .map((g) => g.label)
                        .join(' · '),
                    }),
                  profile.gaps.some((g) => g.kind === 'placeholder') &&
                    t('markets.country.weightsFootNone', {
                      defaultValue: 'For {{list}} we hold no named source yet.',
                      list: profile.gaps
                        .filter((g) => g.kind === 'placeholder')
                        .map((g) => g.label)
                        .join(' · '),
                    }),
                ]
                  .filter(Boolean)
                  .join(' ')}
          </p>
        </div>
      </div>
    </div>
  );
}
