import { useTranslation } from 'react-i18next';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { RiskBadge } from '../ui/RiskBadge';
import { getMarketProfile, MARKET_CODES, type MarketProfile } from '../../lib/marketProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { SEVERITY_FALLBACK, SEVERITY_STYLE, severityKey } from './severity';
import type { CountryCode } from './types';

interface Props {
  profile: MarketProfile;
}

// ─── The hero's market panel ─────────────────────────────────────────────────
// The transpose of AreaRiskCard: there, one area's weight across eight markets;
// here, one market's enforcement against the other seven. Same anatomy on
// purpose — a reader who has seen one page should recognise the other's card
// as the same instrument pointed the other way.
//
// The second bar is the one that has no counterpart on an area page: how much
// of this market we hold our own sources for. It belongs in the hero because
// it qualifies everything below it.
export function MarketProfileCard({ profile }: Props) {
  const { t, i18n } = useTranslation('common');
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-80px');

  const score = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const severity = severityFromRiskWeight(profile.enforcementIntensity);
  const covered = profile.byDomain.length;
  const totalAreas = profile.weights.length;

  const all = MARKET_CODES.map((c) => ({
    code: c,
    value: c === profile.code ? profile.enforcementIntensity : getMarketProfile(c).enforcementIntensity,
  })).sort((a, b) => b.value - a.value);
  const tallest = Math.max(...all.map((m) => m.value), 1);

  const rows = [
    {
      key: 'density',
      label: t('compliance.area.risk.strictness', 'Regulatory density'),
      value: `${profile.strictnessScore} / 10`,
      pct: (profile.strictnessScore / 10) * 100,
      bar: SEVERITY_STYLE[severity].bar,
    },
    {
      key: 'coverage',
      label: t('markets.country.ownSources', 'Own sources'),
      value: t('markets.country.ofAreas', '{{count}} / {{total}} areas', {
        count: covered,
        total: totalAreas,
      }),
      pct: (covered / Math.max(totalAreas, 1)) * 100,
      bar: 'bg-brand',
    },
  ];

  return (
    // rounded-xl, not the canvas's 16px: the card-radius doctrine from #73 owns
    // this, and designSystem.guard.test.ts fails the build on anything wider.
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border border-stroke-subtle bg-surface shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-stroke-subtle px-5 py-4">
        <span className="text-body-3xs font-bold uppercase tracking-[0.14em] text-fg-tertiary">
          {t('markets.country.profileTitle', 'Market profile')}
        </span>
        <span className="text-body-2xs font-semibold text-fg">{profile.code}</span>
      </div>

      <div className="px-5 pb-5 pt-6">
        <div className="flex items-end gap-3.5">
          <span
            className={`font-serif text-[3.5rem] font-semibold leading-[0.9] tracking-tight tabular-nums ${SEVERITY_STYLE[severity].iconColor}`}
          >
            {score.format(profile.enforcementIntensity)}
          </span>
          <span className="pb-2">
            <RiskBadge level={severity} size="sm" className="rounded-full">
              {t('compliance.riskBadge', {
                defaultValue: '{{level}} Risk',
                level: t(severityKey(severity), SEVERITY_FALLBACK[severity]),
              })}
            </RiskBadge>
            <span className="mt-1.5 block text-body-3xs text-fg-tertiary">
              {t('markets.country.outOfTen', 'out of 10 · enforcement intensity')}
            </span>
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-3.5">
          {rows.map((r, i) => (
            <div key={r.key}>
              <div className="flex justify-between text-body-3xs font-semibold text-fg-secondary">
                <span>{r.label}</span>
                <span className="tabular-nums">{r.value}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out ${r.bar}`}
                  style={{ width: inView ? `${r.pct}%` : 0, transitionDelay: `${i * 80}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scaled to the heaviest market, not to 10: against a fixed ceiling
          eight similar scores read as one flat block. Same reasoning as the
          area card's market row. */}
      <div className="border-t border-stroke-subtle bg-surface-secondary px-5 pb-4 pt-4">
        <span className="text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-tertiary">
          {t('compliance.area.risk.marketsCompared', {
            defaultValue: '{{count}} markets compared',
            count: all.length,
          })}
        </span>
        <ol className="mt-[1.05rem] flex h-14 items-end gap-2">
          {all.map((m) => {
            const current = m.code === profile.code;
            const sev = severityFromRiskWeight(m.value);
            return (
              <li
                key={m.code}
                className="flex flex-1 flex-col items-center gap-1.5"
                title={`${t(`markets.countries.${m.code}`, { defaultValue: m.code })} · ${score.format(m.value)}/10`}
              >
                <span
                  aria-hidden
                  className={`w-full rounded-t transition-[height] duration-700 ease-out ${SEVERITY_STYLE[sev].bar} ${current ? '' : 'opacity-60'}`}
                  style={{ height: inView ? `${Math.round((m.value / tallest) * 40) + 8}px` : 0 }}
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

export type { CountryCode };
