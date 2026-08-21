import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ScrollText, Users } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Typography } from '../ui/Typography';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { getAreaObligations, getAreaProfile } from '../../lib/areaProfiles';
import { SEVERITY_STYLE, SEVERITY_FALLBACK, severityKey } from './severity';
import type { AreaMeta } from './areas';
import type { CountryCode } from './types';

interface Props {
  area: AreaMeta;
  index: number;
  selectedCountry: CountryCode;
}

// ─── Hub card · a doorway, not a container ───────────────────────────────────
// This replaces the accordion that used to hold every area's full detail. The
// detail did not belong in a collapsed panel: it could not be linked, shared,
// or indexed, and eight of them on one page would have buried it further. It
// lives on /compliance/<slug> now and this card is the way in.
//
// What stays on the card is what helps a reader pick: how heavily the selected
// market weighs the area, how many duties the engine actually carries, and one
// sentence of framing. All three are derived, so a card cannot claim more than
// the area page can back up.
export function AreaCard({ area, index, selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';
  const Icon = area.icon;

  const def = DOMAIN_BY_SLUG[area.slug];
  const profile = getAreaProfile(area.slug);
  const obligations = getAreaObligations(area.slug, selectedCountry);

  const marketWeight =
    selectedCountry === 'EU'
      ? profile.marketWeights.reduce((s, m) => s + m.weight, 0) / profile.marketWeights.length
      : (profile.marketWeights.find(m => m.code === selectedCountry)?.weight ?? profile.baselineWeight);
  const severity = severityFromRiskWeight(marketWeight);
  const style = SEVERITY_STYLE[severity];

  const title = t(`compliance.${area.slug}.title`, def?.label ?? area.slug);
  const headline = t(`compliance.${area.slug}.headline`, '');
  const marketSpecific = obligations.filter(o => o.marketSpecific).length;
  const personaFit = t(`compliance.${area.slug}.personaFit`, '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index, 5) * 0.06 }}
    >
      <Link
        to={`${localePrefix}/compliance/${area.slug}`}
        className={`group flex h-full flex-col rounded-xl border-2 bg-surface p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md ${style.border}`}
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}>
            <Icon size={22} className={style.iconColor} />
          </div>
          <div className="min-w-0 flex-1">
            <Typography variant="h3" weight="bold" className="text-fg leading-snug">
              {title}
            </Typography>
            <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-xs font-bold ${style.badge}`}>
              {t('compliance.riskBadge', {
                defaultValue: '{{level}} Risk',
                level: t(severityKey(severity), SEVERITY_FALLBACK[severity]),
              })}
            </span>
          </div>
        </div>

        {headline && (
          <Typography variant="body" className="mt-4 flex-1 text-sm leading-relaxed text-fg-secondary">
            {headline}
          </Typography>
        )}

        {personaFit && (
          <span className="mt-3 inline-block self-start rounded-md border border-stroke-subtle bg-brand-light px-2 py-0.5 text-body-3xs font-semibold text-fg-brand">
            {personaFit}
          </span>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stroke-subtle pt-4">
          <span className="inline-flex items-center gap-1.5 text-body-3xs font-semibold text-fg-tertiary">
            <ScrollText size={12} />
            {t('compliance.card.obligations', '{{count}} obligations', { count: obligations.length })}
          </span>
          <span className="inline-flex items-center gap-1.5 text-body-3xs font-semibold text-fg-tertiary">
            <Users size={12} />
            {t('compliance.specialists.count', '{{count}} verified specialists', {
              count: area.specialistsCount,
            })}
          </span>
          {marketSpecific > 0 && selectedCountry !== 'EU' && (
            <span className="text-body-3xs font-semibold text-fg-brand">
              {t('compliance.card.marketSpecific', '{{count}} specific to {{market}}', {
                count: marketSpecific,
                market: selectedCountry,
              })}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-body-3xs font-bold text-fg-brand">
            {t('compliance.card.open', 'Open area')}
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
