import { useTranslation } from 'react-i18next';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';
import type { MarketProfile } from '../../lib/marketProfiles';

interface Props {
  profile: MarketProfile;
  marketLabel: string;
}

// ─── Coverage · what we do NOT hold, and only where that is true ─────────────
// This section renders for a market only when it has real gaps, and Germany
// has none: its two "missing" areas are the GDPR and the GPSR, Regulations
// that apply directly and identically here. There is no German text to hold —
// that IS the law — and reporting it as a hole was reporting the law as a hole
// in our data. getMarketProfile().gaps excludes scope:'eu' by construction, so
// the section simply does not appear.
//
// Two card kinds, because there are two situations and they are not the same
// admission:
//   placeholder       we hold nothing at all, and show nothing. Saying "no
//                     named source yet" is the only honest thing here.
//   national-pending  a national text exists and we stand the EU instrument in
//                     its place — named, so a reader can see what they are
//                     getting instead.
export function MarketCoverage({ profile, marketLabel }: Props) {
  const { t } = useTranslation('common');
  const eyebrows = useAreaEyebrows();

  if (profile.gaps.length === 0) return null;

  const areaName = (slug: string) =>
    t(`compliance.${slug}.title`, DOMAIN_BY_SLUG[slug as never]?.label ?? slug);

  const viaEu = profile.obligations.length;

  return (
    <div className="flex flex-col gap-10 desktop-s:flex-row desktop-s:items-start desktop-s:gap-24">
      <AreaSectionHeading
        className="desktop-s:w-[340px] desktop-s:shrink-0"
        eyebrow={eyebrows.coverage}
        title={t('markets.country.coverageTitle', 'Where we hold no local source yet')}
        lead={t('markets.country.coverageLead', {
          defaultValue:
            '{{count}} duties have a national text we do not carry. That is a gap in our coverage, not in the law — and it is worth knowing which way round.',
          count: profile.gaps.length,
        })}
      />

      <div className="min-w-0 desktop-s:grow">
        <div className="grid gap-5 tablet:grid-cols-2">
          {profile.gaps.map((gap) => (
            <div
              key={gap.subdomainId}
              className="rounded-xl border border-stroke-subtle bg-surface p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-body font-bold leading-snug text-fg">{gap.label}</p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-body-4xs font-bold uppercase tracking-[0.04em] ${
                    gap.kind === 'placeholder'
                      ? 'bg-risk-medium-bg text-risk-on-medium'
                      : 'bg-risk-high-bg text-risk-on-high'
                  }`}
                >
                  {gap.kind === 'placeholder'
                    ? t('markets.country.gapNone', 'No source')
                    : t('markets.country.gapEu', 'EU source stands in')}
                </span>
              </div>
              <p className="mt-2 text-body-2xs leading-relaxed text-fg-secondary">
                {t(`compliance.${gap.domainSlug}.title`, areaName(gap.domainSlug))}
              </p>
              <p className="mt-3.5 text-body-2xs leading-relaxed text-fg-tertiary">
                {gap.source ? (
                  <>
                    {t('markets.country.gapShowing', 'We show')}{' '}
                    <span className="font-semibold text-fg">{gap.source}</span>
                  </>
                ) : (
                  <span className="italic">
                    {t('compliance.area.fact.noNamedSource', 'No named source yet')}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 max-w-[760px] text-body-xs leading-relaxed text-fg-tertiary">
          {t('markets.country.coverageNote', {
            defaultValue:
              'The other duties we carry for {{market}} run on {{count}} national sources, plus the EU Regulations that apply here directly — those need no national text, so they are not counted as missing.',
            market: marketLabel,
            count: viaEu,
          })}
        </p>
      </div>
    </div>
  );
}
