import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Info } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Typography } from '../ui/Typography';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { rankAreasForMarket } from '../../lib/areaProfiles';
import { SEVERITY_STYLE, SEVERITY_FALLBACK, severityKey } from './severity';
import type { CountryCode } from './types';

interface Props {
  selectedCountry: CountryCode;
}

// ─── Risk at a glance · ranked by the engine, not by hand ────────────────────
// This grid used to sort by a riskBarPct authored in the page and highlight one
// area from a hand-written COUNTRY_HINTS map. The two disagreed in plain sight:
// with Spain selected, Tax carried the "Priority for ES" badge while Privacy
// sat above it, because 95 > 75 regardless of the market.
//
// Both are gone. Order and bar length now come from CountryRiskMatrix via
// rankAreasForMarket, so the top row IS the priority for the selected market
// and no separate badge is needed to assert it.
export function RiskComparisonGrid({ selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const localePrefix = locale ? `/${locale}` : '';
  const ranked = rankAreasForMarket(selectedCountry);
  const marketLabel =
    selectedCountry === 'EU'
      ? t('compliance.country.euOption', 'EU-wide')
      : t(`markets.countries.${selectedCountry}`, { defaultValue: selectedCountry });

  return (
    <div ref={ref} className="bg-surface border border-stroke rounded-2xl p-7 desktop-s:p-8 mt-8">
      <div className="mb-6">
        <Typography variant="h3" weight="bold" className="text-fg">
          {t('compliance.riskAtGlance', 'Risk at a Glance')}
        </Typography>
        <Typography variant="caption" className="text-fg-tertiary normal-case tracking-normal mt-1 block">
          {t('compliance.risk.subtitle', 'Weighted for {{market}} by the compliance engine.', {
            market: marketLabel,
          })}
        </Typography>
      </div>

      <div className="flex items-start gap-2 bg-brand-light/50 border border-stroke-subtle rounded-xl px-4 py-3 mb-5">
        <Info size={16} className="text-fg-brand shrink-0 mt-0.5" />
        <Typography variant="ui-small" className="text-fg-brand leading-snug">
          {selectedCountry === 'EU'
            ? t(
                'compliance.risk.hintEu',
                'Averaged across the eight markets the engine profiles. Pick a market to see its own weighting.',
              )
            : t('compliance.risk.hintMarket', '{{market}} weights these areas as shown — strongest first.', {
                market: marketLabel,
              })}
        </Typography>
      </div>

      <div className="space-y-5">
        {ranked.map((r, i) => {
          const def = DOMAIN_BY_SLUG[r.slug];
          const title = t(`compliance.${r.slug}.title`, def?.label ?? r.slug);
          const severity = severityFromRiskWeight(r.weight);
          const style = SEVERITY_STYLE[severity];
          return (
            <motion.div
              key={r.slug}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <Link
                  to={`${localePrefix}/compliance/${r.slug}`}
                  className="text-ui-small font-bold text-fg-secondary hover:text-fg-brand transition-colors"
                >
                  {title}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-body-3xs tabular-nums text-fg-tertiary">
                    {r.weight.toFixed(1)}/10
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${style.badge}`}>
                    {t(severityKey(severity), SEVERITY_FALLBACK[severity])}
                  </span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-surface-tertiary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${(r.weight / 10) * 100}%` } : {}}
                  transition={{ duration: 0.7, delay: i * 0.06 + 0.2, ease: 'easeOut' }}
                  className={`h-full rounded-full ${style.bar}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
