import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getMarketProfile, MARKET_CODES } from '../../lib/marketProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import type { AreaProfile } from '../../lib/areaProfiles';
import type { CountryCode } from './types';

interface Props {
  profile: AreaProfile;
  selectedCountry: CountryCode;
}

// ─── The hero's risk panel ───────────────────────────────────────────────────
// The hero used to assert risk with a badge — one word, no way to check it.
// This shows the three numbers the badge is computed from, so a reader can see
// what "high" is standing on: how heavily this market weights the area, how
// hard it enforces, and how densely it regulates.
//
// Weight is per area and per market. Enforcement and density are properties of
// the MARKET, not of this area — they are the same three digits on every area
// page for a given country, and the labels say so rather than implying the area
// earned them.
//
// EU averages all eight profiled markets, which is what the country selector's
// EU option means everywhere else on the page.
export function AreaRiskCard({ profile, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  // toFixed writes a decimal POINT in every locale. German reads 7,1.
  const score = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  const stats = useMemo(() => {
    const avg = (ns: number[]) => ns.reduce((s, n) => s + n, 0) / ns.length;
    const markets = MARKET_CODES.map((c) => getMarketProfile(c));

    const weight =
      selectedCountry === 'EU'
        ? avg(profile.marketWeights.map((m) => m.weight))
        : (profile.marketWeights.find((m) => m.code === selectedCountry)?.weight ??
           profile.baselineWeight);

    const own = selectedCountry === 'EU' ? null : markets.find((m) => m.code === selectedCountry);

    return [
      {
        key: 'weight',
        value: weight,
        label: t('compliance.area.risk.weight', 'Risk weight'),
        note: t('compliance.area.risk.weightNote', 'How heavily this market weights this area'),
      },
      {
        key: 'enforcement',
        value: own ? own.enforcementIntensity : avg(markets.map((m) => m.enforcementIntensity)),
        label: t('compliance.area.risk.enforcement', 'Enforcement intensity'),
        note: t('compliance.area.risk.enforcementNote', 'A property of the market, not of this area'),
      },
      {
        key: 'strictness',
        value: own ? own.strictnessScore : avg(markets.map((m) => m.strictnessScore)),
        label: t('compliance.area.risk.strictness', 'Regulatory density'),
        note: t('compliance.area.risk.strictnessNote', 'A property of the market, not of this area'),
      },
    ];
  }, [profile, selectedCountry, t]);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-stroke-subtle bg-surface p-6 shadow-sm desktop-s:p-7"
    >
      <p className="text-body-3xs font-bold uppercase tracking-[0.14em] text-fg-tertiary">
        {t('compliance.area.risk.title', 'Risk profile')}
      </p>
      <div className="mt-5 space-y-5">
        {stats.map((s, i) => (
          <div key={s.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-sm font-semibold text-fg">{s.label}</span>
              <span className="text-body-sm font-bold text-fg tabular-nums">
                {score.format(s.value)}
                <span className="text-fg-tertiary">/10</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
                style={{
                  width: inView ? `${(s.value / 10) * 100}%` : 0,
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
            <p className="mt-1.5 text-body-3xs leading-relaxed text-fg-tertiary">{s.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
