import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
// Two figures and a list of regulators, which is the canvas's shape for this
// band and a deliberate narrowing of what stood here before.
//
// What it dropped and why: a combined ceiling — already the metric band's
// second tile, and repeating it three screens later added nothing — and a
// table of all seven duties against their penalty phrasing, which is the
// explorer's Bußgeldrahmen cell, one duty at a time, with the statute beside
// it. Both were real data in the wrong place. What replaces them is the pair a
// reader cannot get anywhere else on the page: the single heaviest penalty in
// this area, and how hard this market enforces relative to the other seven.
//
// The severity is never asserted. The highest penalty is a max over the same
// enrichment map the explorer reads, and the intensity is the market's own
// score with its rank computed against every market the engine profiles, so
// "the highest of all eight" is a fact about the data rather than a claim.
//
// This is the only section on the page that goes dark, and that is the point:
// a page that shouts everywhere shouts nowhere. The petrol band is spent here
// and nowhere else, so the one place a reader's eye stops is the one place the
// stakes are stated.
export function AreaEnforcement({ slug, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

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

  // Enforcement intensity for this market, and where it sits among all the
  // markets the engine profiles. EU-wide has no single score, so it averages —
  // and says so, rather than presenting a mean as one market's number.
  const enforcement = useMemo(() => {
    const scores = MARKET_CODES.map((c) => getMarketProfile(c).enforcementIntensity);
    const total = scores.length;
    if (selectedCountry === 'EU') {
      return { value: scores.reduce((s, n) => s + n, 0) / total, rank: null, total };
    }
    const own = getMarketProfile(selectedCountry).enforcementIntensity;
    return {
      value: own,
      rank: scores.filter((s) => s > own).length + 1,
      total,
    };
  }, [selectedCountry]);

  // Both figures count up rather than appearing, for the same reason the bars
  // grow: a number that lands has been watched, a number that is already there
  // has been skipped. useCountUp snaps instantly under prefers-reduced-motion.
  const countedPenalty = useCountUp(inView ? (heaviest?.penaltyMaxEur ?? 0) : 0, 1100);
  const countedIntensity = useCountUp(inView ? enforcement.value : 0, 900);

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

  return (
    <div ref={ref} className="flex flex-col gap-10 desktop-s:flex-row desktop-s:gap-24">
      <div className="desktop-s:w-[380px] desktop-s:shrink-0">
        <AreaSectionHeading
          tone="inverse"
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
      </div>

      <div className="min-w-0 desktop-s:grow">
        <div className="grid gap-5 tablet:grid-cols-2">
          {heaviest && (
            <StatCard
              value={money.format(Math.round(countedPenalty))}
              label={t('compliance.area.heaviestPenalty', 'Highest single penalty')}
              note={heaviest.label}
            />
          )}
          <StatCard
            value={`${oneDecimal.format(countedIntensity)} / 10`}
            label={t('compliance.area.risk.enforcement', 'Enforcement intensity')}
            note={
              enforcement.rank === null
                ? t('compliance.area.enforcementAvg', 'average across {{total}} markets', {
                    total: enforcement.total,
                  })
                : enforcement.rank === 1
                  ? t('compliance.area.enforcementTop', 'the highest of all {{total}} markets', {
                      total: enforcement.total,
                    })
                  : t('compliance.area.enforcementRank', 'rank {{rank}} of {{total}} markets', {
                      rank: enforcement.rank,
                      total: enforcement.total,
                    })
            }
          />
        </div>

        {authorities.length > 0 && (
          <div className="mt-6 rounded-xl border border-white/[0.14] px-6 py-5">
            <span className="text-body-3xs font-bold uppercase tracking-[0.12em] text-white/70">
              {t('compliance.area.authorities', 'Competent authorities')}
            </span>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {authorities.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-white/20 px-3.5 py-[0.4375rem] text-body-xs font-semibold text-white"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div className="rounded-xl border border-white/[0.14] bg-white/[0.04] p-6">
      <p className="font-serif text-[2.125rem] font-semibold leading-none tracking-tight text-white tabular-nums">
        {value}
      </p>
      <p className="mt-2.5 text-body-sm font-semibold text-white">{label}</p>
      <p className="mt-1 text-body-xs leading-relaxed text-primary-200">{note}</p>
    </div>
  );
}
