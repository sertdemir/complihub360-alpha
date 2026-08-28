import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { useCountUp } from '../../lib/useCountUp';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { getAreaObligations } from '../../lib/areaProfiles';
import { getMarketProfile, MARKET_CODES } from '../../lib/marketProfiles';
import type { DomainSlug } from '../../lib/domains';
import type { CountryCode } from './types';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

// ─── Enforcement · who checks, and what it costs ─────────────────────────────
// Canvas "Durchsetzungs-Band" · Variante C "Skala der Märkte", moved onto the
// Gradient text-image pair (user decision 2026-08-28): the dark band retires
// and the section speaks the house pattern instead — copy standing on the
// white page left, the Gradient panel right holding a white card. What the
// card carries is the one thing the two old figures could not show: WHERE the
// number comes from. All eight markets stand on a 0–10 scale as petrol pills,
// and the gold marker names the value the engine uses here — the average for
// EU-wide, the market's own score (with its rank) once one is picked.
//
// The severity is never asserted. The highest penalty is a max over the same
// enrichment map the explorer reads; the pills are the markets' own scores,
// so "the highest of all eight" stays a fact about the data, now visibly so.
//
// The content plays itself onto the stage once in view (user ask 2026-08-28):
// the track draws first, the pills drop in score by score, the gold marker
// pops last, and the penalty counts up. Reduced motion shows the finished
// picture.
export function AreaEnforcement({ slug, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-120px');

  const obligations = useMemo(
    () => getAreaObligations(slug, selectedCountry),
    [slug, selectedCountry],
  );

  // The heaviest single penalty, and the duty it belongs to. A sum would be the
  // metric band's figure; this is the one a reader weighs a single mistake by.
  const heaviest = useMemo(() => {
    const withCap = obligations.filter((o) => (o.penaltyMaxEur ?? 0) > 0);
    if (withCap.length === 0) return null;
    return withCap.reduce((max, o) =>
      (o.penaltyMaxEur as number) > (max.penaltyMaxEur as number) ? o : max,
    );
  }, [obligations]);

  // Every market's own intensity, grouped by score so equal markets stack on
  // the scale, plus the marker value: EU-wide has no single score, so it
  // averages — and says so — while a picked market stands with its rank.
  const { groups, marker } = useMemo(() => {
    const scores = MARKET_CODES.map((c) => ({ code: c, value: getMarketProfile(c).enforcementIntensity }));
    const byValue = new Map<number, string[]>();
    for (const s of scores) byValue.set(s.value, [...(byValue.get(s.value) ?? []), s.code]);
    const total = scores.length;
    if (selectedCountry === 'EU') {
      return {
        groups: [...byValue.entries()].sort((a, b) => a[0] - b[0]),
        marker: { value: scores.reduce((s, n) => s + n.value, 0) / total, rank: null, total },
      };
    }
    const own = scores.find((s) => s.code === selectedCountry)?.value ?? 0;
    return {
      groups: [...byValue.entries()].sort((a, b) => a[0] - b[0]),
      marker: { value: own, rank: scores.filter((s) => s.value > own).length + 1, total },
    };
  }, [selectedCountry]);

  // Both figures count up rather than appearing, for the same reason the pills
  // drop in: a number that lands has been watched, a number that is already
  // there has been skipped. useCountUp snaps instantly under reduced motion.
  const countedPenalty = useCountUp(inView ? (heaviest?.penaltyMaxEur ?? 0) : 0, 1100);
  const countedIntensity = useCountUp(inView ? marker.value : 0, 900);

  // Who enforces is the one thing the enrichment map does not carry — it holds
  // the penalty, not the regulator. So this stays editorial, and it is a list
  // across all our markets rather than for the selected one.
  const authorities = t(`compliance.${slug}.fines.authorities`, '')
    .split(/\s*[·,]\s*/)
    .map((a) => a.trim())
    .filter(Boolean);

  const marketLabel =
    selectedCountry === 'EU'
      ? t('compliance.country.euOption', 'EU-wide')
      : t(`markets.countries.${selectedCountry}`, { defaultValue: selectedCountry });

  const money = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
  const oneDecimal = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  if (!heaviest && authorities.length === 0) return null;

  // The pills land score by score from the left, then the marker pops.
  const markerDelay = 0.35 + groups.length * 0.12 + 0.15;
  const markerNote =
    marker.rank === null
      ? t('compliance.area.enforcementAvg', 'average across {{total}} markets', {
          total: marker.total,
        })
      : marker.rank === 1
        ? t('compliance.area.enforcementTop', 'the highest of all {{total}} markets', {
            total: marker.total,
          })
        : t('compliance.area.enforcementRank', 'rank {{rank}} of {{total}} markets', {
            rank: marker.rank,
            total: marker.total,
          });

  return (
    // row-reverse on desktop: the explorer above splits list-left/panel-right,
    // this section answers panel-left/copy-right — the small change of sides
    // that keeps the page from reading as one repeated template (user ask
    // 2026-08-28). The DOM order stays copy-first so mobile leads with the
    // heading.
    <div ref={ref} className="flex flex-col gap-10 desktop-s:flex-row-reverse desktop-s:items-center desktop-s:gap-14">
      <div className="shrink-0 desktop-s:w-[380px]">
        <AreaSectionHeading
          eyebrow={eyebrows.enforcement}
          title={t('compliance.area.enforcementTitle', 'Who checks, and what it costs')}
          // Two phrasings, because "the sources the engine holds for EU-wide"
          // is not a sentence in any of the four languages — EU is a scope,
          // not a market, and German in particular ("für EU-weit") makes that
          // obvious.
          lead={
            selectedCountry === 'EU'
              ? t('compliance.area.enforcementLeadEu', {
                  defaultValue:
                    'The figures come from the sources the engine holds at EU level — {{count}} duties with a stated penalty range. Upper bounds as written, not an expected cost.',
                  count: obligations.filter((o) => o.penalty).length,
                })
              : t('compliance.area.enforcementLead', {
                  defaultValue:
                    'The figures come from the sources the engine holds for {{market}} — {{count}} duties with a stated penalty range. Upper bounds as written, not an expected cost.',
                  market: marketLabel,
                  count: obligations.filter((o) => o.penalty).length,
                })
          }
        />
        {/* The money stays in the copy column, red as every fine on this site
            is red (colour doctrine 2026-08-27) — the card is the scale's. */}
        {heaviest && (
          <div className="mt-8 border-t border-stroke-subtle pt-6">
            <p className="font-serif text-[2.5rem] font-bold leading-none tracking-tight text-risk-on-critical tabular-nums">
              {money.format(Math.round(countedPenalty))}
            </p>
            <p className="mt-2.5 text-body-sm font-semibold text-fg">
              {t('compliance.area.heaviestPenalty', 'Highest single penalty')}
            </p>
            <p className="mt-1 text-body-xs text-fg-secondary">{heaviest.label}</p>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 rounded-xl bg-gradient-stage p-5 sm:p-7 desktop-s:p-8">
        <div className="rounded-xl bg-surface p-6 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary sm:p-7">
          <span className="block font-serif text-[1.125rem] font-bold leading-snug text-fg">
            {t('compliance.area.risk.enforcement', 'Enforcement intensity')}
          </span>
          <span className="mt-1 block text-body-2xs leading-relaxed text-fg-secondary">
            {t('compliance.area.enforcementScaleSub', {
              defaultValue:
                'All eight markets on one scale — the gold marker is the value the engine uses here.',
            })}
          </span>

          {/* Rating beside the scale, not under it — the label row below the
              track cost a whole line of height and could collide with the
              card edge; standing left it counts up next to the line it
              explains (user ask 2026-08-28). The top margin is the headroom
              the pill stacks grow into. */}
          <div className="mt-28 flex items-center gap-6">
            <div className="w-[7.5rem] shrink-0">
              <p className="font-serif text-[1.75rem] font-bold leading-none tabular-nums text-accent-700 dark:text-fg-accent-strong">
                {oneDecimal.format(countedIntensity)}
                <span className="text-body-sm font-semibold text-fg-tertiary"> / 10</span>
              </p>
              <p className="mt-2 text-body-3xs leading-snug text-fg-tertiary">{markerNote}</p>
            </div>

            {/* The scale. Everything positioned in percent so the card can be
                any width; the stacks grow upward into the reserved headroom.
                The tick numbers sit right under the line (user ask). Heights
                in explicit rem: this project's numeric spacing scale is
                custom (12 = 96px, 8 = 40px), so the tailwind shorthands land
                somewhere else entirely. */}
            <div className="relative h-[3rem] min-w-0 flex-1">
              <motion.div
                initial={reduced ? false : { scaleX: 0 }}
                animate={inView || reduced ? { scaleX: 1 } : {}}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                className="absolute inset-x-0 top-5 h-0.5 origin-left rounded-full bg-stroke"
              />
              {Array.from({ length: 11 }, (_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="absolute top-3.5 h-3.5 w-px bg-stroke"
                  style={{ left: `${i * 10}%` }}
                />
              ))}
              {[0, 5, 10].map((n) => (
                <span
                  key={n}
                  className="absolute top-[2rem] -translate-x-1/2 text-body-4xs font-semibold text-fg-tertiary"
                  style={{ left: `${n * 10}%` }}
                >
                  {n}
                </span>
              ))}

              {groups.map(([value, codes], gi) => {
                const pct = (value / 10) * 100;
                return (
                  <div key={value} aria-hidden>
                    <span
                      className="absolute top-1 h-4 w-px bg-brand/40"
                      style={{ left: `${pct}%` }}
                    />
                    <div
                      className="absolute bottom-[2.25rem] flex -translate-x-1/2 flex-col-reverse items-center gap-1.5"
                      style={{ left: `${pct}%` }}
                    >
                      {codes.map((code, si) => {
                        const own = selectedCountry !== 'EU' && code === selectedCountry;
                        return (
                          <motion.span
                            key={code}
                            initial={reduced ? false : { opacity: 0, y: -10 }}
                            animate={inView || reduced ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.35 + gi * 0.12 + si * 0.07 }}
                            className={`w-[1.75rem] rounded-full border py-0.5 text-center text-body-4xs font-bold ${
                              own
                                ? 'border-accent-500 bg-accent-500/15 text-accent-700 dark:text-fg-accent-strong'
                                : 'border-brand/40 bg-brand/10 text-fg-brand'
                            }`}
                          >
                            {code}
                          </motion.span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* The gold marker: the number the engine actually uses here. */}
              <motion.span
                aria-hidden
                initial={reduced ? false : { opacity: 0, scale: 0 }}
                animate={inView || reduced ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.35, ease: 'easeOut', delay: markerDelay }}
                className="absolute top-3 -ml-1.5 h-3 w-3 rotate-45 rounded-[2px] bg-accent-500"
                style={{ left: `${(marker.value / 10) * 100}%` }}
              />
            </div>
          </div>

          {/* Not chips: a quiet single line of names, borderless and small —
              the regulators are a footnote to the scale, not a second set of
              controls (user ask 2026-08-28). */}
          {authorities.length > 0 && (
            <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-stroke-subtle pt-4">
              <span className="text-body-3xs font-bold uppercase tracking-[0.12em] text-fg-tertiary">
                {t('compliance.area.authorities', 'Competent authorities')}
              </span>
              <span className="text-body-2xs font-semibold text-fg-secondary">
                {authorities.join(' · ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
