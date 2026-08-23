import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Globe } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { RiskBadge } from '../ui/RiskBadge';
import { getMarketProfile, MARKET_CODES } from '../../lib/marketProfiles';
import { SEVERITY_FALLBACK, severityKey } from './severity';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';
import type { MarketProfile } from '../../lib/marketProfiles';

interface Props {
  profile: MarketProfile;
}

// The transpose of RelatedAreas. Which three markets to show is derived, not
// picked: the ones sharing the most duties with this one, because that is the
// actual reason a reader would go there next — the same filings, a second
// jurisdiction.
export function RelatedMarkets({ profile }: Props) {
  const { t } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';

  const related = useMemo(() => {
    const mine = new Set(profile.obligations.map((o) => o.subdomainId));
    return MARKET_CODES.filter((c) => c !== profile.code)
      .map((c) => {
        const p = getMarketProfile(c);
        return {
          profile: p,
          shared: p.obligations.filter((o) => mine.has(o.subdomainId)).length,
        };
      })
      .sort((a, b) => b.shared - a.shared || b.profile.obligations.length - a.profile.obligations.length)
      .slice(0, 3);
  }, [profile]);

  if (related.length === 0) return null;

  return (
    <div>
      <AreaSectionHeading
        className="max-w-[620px]"
        eyebrow={eyebrows.next}
        title={t('markets.country.relatedTitle', 'Markets that travel with this one')}
        lead={t('markets.country.relatedLead', {
          defaultValue:
            'Few sell into one market only. These three share the most duties with this one — the same filings, a second jurisdiction.',
        })}
      />

      <div className="mt-8 grid gap-5 tablet:grid-cols-3">
        {related.map(({ profile: p, shared }) => {
          const severity = severityFromRiskWeight(p.enforcementIntensity);
          return (
            <Link
              key={p.code}
              to={`${localePrefix}/markets/${p.code.toLowerCase()}`}
              className="group flex flex-col rounded-xl border border-stroke-subtle bg-surface p-6 transition-colors hover:border-brand"
            >
              <div className="flex items-start justify-between gap-3">
                <Globe size={56} strokeWidth={1.5} className="shrink-0 text-fg-brand" aria-hidden />
                <RiskBadge level={severity} size="sm" className="shrink-0">
                  {t(severityKey(severity), SEVERITY_FALLBACK[severity])}
                </RiskBadge>
              </div>
              <span className="mt-5 text-body font-bold text-fg">
                {t(`markets.countries.${p.code}`, { defaultValue: p.code })}
              </span>
              <span className="mt-1.5 flex-1 text-body-2xs leading-relaxed text-fg-secondary">
                {t('markets.country.relatedFact', {
                  defaultValue:
                    '{{count}} duties in {{areas}} areas, {{shared}} of them shared with this market.',
                  count: p.obligations.length,
                  areas: p.byDomain.length,
                  shared,
                })}
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-body-2xs font-semibold text-fg-brand">
                {t('markets.country.openMarket', 'Open this market')}
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
