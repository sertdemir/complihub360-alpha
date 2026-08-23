import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Typography } from '../ui/Typography';
import { getAreaProfile } from '../../lib/areaProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import type { DomainSlug } from '../../lib/domains';
import { SEVERITY_STYLE } from './severity';
import type { CountryCode } from './types';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

// The transpose of the weights list on a market page: there, one country across
// eight areas; here, one area across eight countries. Each row links back to
// that market, which is what turns two standalone page types into a grid a
// reader can actually traverse.
export function AreaMarketHeatmap({ slug, selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';
  const { marketWeights } = getAreaProfile(slug);
  const [barsRef, barsInView] = useInViewOnce<HTMLUListElement>();

  return (
    <div>
      <AreaSectionHeading
        eyebrow={eyebrows.markets}
        title={t('compliance.area.marketsTitle', 'Where this weighs heaviest')}
        lead={
          <span className="block max-w-2xl">
            {t('compliance.area.marketsLead', {
              defaultValue:
                'How each market the engine profiles weights this area, and how many duties it holds a local source for.',
            })}
          </span>
        }
      />

      <ul ref={barsRef} className="mt-8 space-y-3">
        {marketWeights.map((m, i) => {
          const style = SEVERITY_STYLE[severityFromRiskWeight(m.weight)];
          const selected = m.code === selectedCountry;
          return (
            <li key={m.code}>
              <Link
                to={`${localePrefix}/markets/${m.code.toLowerCase()}`}
                className={`group grid grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary ${
                  selected ? 'bg-brand-light/50' : ''
                }`}
              >
                <span
                  className={`truncate text-body-sm font-semibold ${selected ? 'text-fg-brand' : 'text-fg'}`}
                >
                  {t(`markets.countries.${m.code}`, { defaultValue: m.code })}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                  <span
                    className={`block h-full rounded-full transition-[width] duration-700 ease-out ${style.bar}`}
                    style={{
                      width: barsInView ? `${(m.weight / 10) * 100}%` : 0,
                      transitionDelay: `${i * 60}ms`,
                    }}
                  />
                </span>
                <span className="flex items-center gap-3 text-body-xs tabular-nums text-fg-tertiary">
                  <span>{m.weight}/10</span>
                  <span className="hidden tablet:inline">
                    {t('compliance.area.localSources', '{{count}} local sources', {
                      count: m.obligationCount,
                    })}
                  </span>
                  <ArrowRight
                    size={13}
                    className="text-fg-tertiary transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
