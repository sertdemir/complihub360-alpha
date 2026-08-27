import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { RiskBadge } from '../ui/RiskBadge';
import { getMarketProfile, MARKET_CODES } from '../../lib/marketProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { SEVERITY_FALLBACK, severityKey } from './severity';
import type { AreaProfile } from '../../lib/areaProfiles';
import type { CountryCode } from './types';

interface Props {
  profile: AreaProfile;
  selectedCountry: CountryCode;
}

// ─── The hero's risk panel ───────────────────────────────────────────────────
// The hero used to assert risk with a badge — one word, no way to check it.
// This card shows the number the badge is computed from, the two market
// properties that feed it, and where this market sits against the other seven.
// Three claims a reader can audit instead of one they have to take.
//
// The split matters and the labels carry it: the big figure is the DOMAIN
// weight, this area in this market. Enforcement and density are properties of
// the MARKET — identical on all eight area pages for a given country — so they
// sit below the rule as context, never as something this area earned.
//
// Nothing here is authored. Weights come from CountryRiskMatrix via the area
// profile, the severity from severityFromRiskWeight, so colour and number
// cannot drift apart.
export function AreaRiskCard({ profile, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  // toFixed writes a decimal POINT in every locale. German reads 8,0.
  const score = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const whole = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 });
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-80px');

  const { weight, severity, market, markets, marketLabel } = useMemo(() => {
    const avg = (ns: number[]) => ns.reduce((s, n) => s + n, 0) / ns.length;
    const profiles = MARKET_CODES.map((c) => getMarketProfile(c));
    const own = selectedCountry === 'EU' ? null : profiles.find((m) => m.code === selectedCountry);

    const w =
      selectedCountry === 'EU'
        ? avg(profile.marketWeights.map((m) => m.weight))
        : (profile.marketWeights.find((m) => m.code === selectedCountry)?.weight ??
           profile.baselineWeight);

    return {
      weight: w,
      severity: severityFromRiskWeight(w),
      market: {
        enforcement: own ? own.enforcementIntensity : avg(profiles.map((m) => m.enforcementIntensity)),
        density: own ? own.strictnessScore : avg(profiles.map((m) => m.strictnessScore)),
      },
      markets: profile.marketWeights,
      marketLabel:
        selectedCountry === 'EU'
          ? t('compliance.country.euOption', 'EU-wide')
          : t(`markets.countries.${selectedCountry}`, { defaultValue: selectedCountry }),
    };
  }, [profile, selectedCountry, t]);

  const rows = [
    {
      key: 'enforcement',
      label: t('compliance.area.risk.enforcement', 'Enforcement intensity'),
      value: market.enforcement,
    },
    {
      key: 'density',
      label: t('compliance.area.risk.strictness', 'Regulatory density'),
      value: market.density,
    },
  ];

  const tallest = Math.max(...markets.map((m) => m.weight), 1);

  return (
    // rounded-xl, not the canvas's 16px: the card-radius doctrine from #73 owns
    // this, and designSystem.guard.test.ts fails the build on 12px or 16px.
    // The dossier shadow instead of the hairline border since 2026-08-28: the
    // card stands on the Gradient hero now (canvas "Bereichsseiten-Hero" · C),
    // and petrol carries the bars — the severity statement is the badge's,
    // color-doctrine decision 2026-08-27.
    <div
      ref={ref}
      className="overflow-hidden rounded-xl bg-surface shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary"
    >
      <div className="flex items-center justify-between border-b border-stroke-subtle px-5 py-4">
        <span className="text-body-3xs font-bold uppercase tracking-[0.14em] text-fg-tertiary">
          {t('compliance.area.risk.title', 'Risk profile')}
        </span>
        <span className="text-body-2xs font-semibold text-fg">{marketLabel}</span>
      </div>

      <div className="px-5 pb-5 pt-6">
        <div className="flex items-end gap-3.5">
          <span className="font-serif text-[3.5rem] font-semibold leading-[0.9] tracking-tight tabular-nums text-fg">
            {score.format(weight)}
          </span>
          <span className="pb-2">
            {/* Pill, as the canvas draws every risk chip. Local override
                rather than a change to RiskBadge: that component is used in
                twenty places and its radius is not this section's to set. */}
            <RiskBadge level={severity} size="sm" className="rounded-full">
              {t('compliance.riskBadge', {
                defaultValue: '{{level}} Risk',
                level: t(severityKey(severity), SEVERITY_FALLBACK[severity]),
              })}
            </RiskBadge>
            <span className="mt-1.5 block text-body-3xs text-fg-tertiary">
              {t('compliance.area.risk.outOfTen', 'out of 10 · domain weight')}
            </span>
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-3.5">
          {rows.map((r, i) => (
            <div key={r.key}>
              <div className="flex justify-between text-body-3xs font-semibold text-fg-secondary">
                <span>{r.label}</span>
                <span className="tabular-nums">{whole.format(r.value)} / 10</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-brand/10">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
                  style={{
                    width: inView ? `${(r.value / 10) * 100}%` : 0,
                    transitionDelay: `${i * 80}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Where this market sits against the rest. The point of the row is the
          comparison, so the bars are scaled to the heaviest market rather than
          to 10 — against a fixed ceiling eight similar markets read as one
          flat block. */}
      <div className="border-t border-stroke-subtle bg-surface-secondary px-5 pb-4 pt-4 dark:bg-white/[0.04]">
        <span className="text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-tertiary">
          {t('compliance.area.risk.marketsCompared', {
            defaultValue: '{{count}} markets compared',
            count: markets.length,
          })}
        </span>
        <ol className="mt-[1.05rem] flex h-14 items-end gap-2">
          {markets.map((m) => {
            const current = m.code === selectedCountry;
            const sev = severityFromRiskWeight(m.weight);
            return (
              <li
                key={m.code}
                className="flex flex-1 flex-col items-center gap-1.5"
                title={`${t(`markets.countries.${m.code}`, { defaultValue: m.code })} · ${score.format(m.weight)}/10`}
              >
                <span
                  aria-hidden
                  className={`w-full rounded-t transition-[height] duration-700 ease-out ${
                    sev === 'medium' || sev === 'low' ? 'bg-brand/45' : 'bg-brand'
                  } ${current ? '' : 'opacity-60'}`}
                  style={{ height: inView ? `${Math.round((m.weight / tallest) * 40) + 8}px` : 0 }}
                />
                <span
                  className={`text-body-4xs tabular-nums ${
                    current ? 'font-bold text-fg' : 'font-semibold text-fg-tertiary'
                  }`}
                >
                  {m.code}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
