import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ScrollText } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { RiskBadge } from '../ui/RiskBadge';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { getAreaObligations, getAreaProfile } from '../../lib/areaProfiles';
import { SEVERITY_FALLBACK, severityKey } from './severity';
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
// Two-column band since 2026-08-27 (canvas "Die acht Bereiche" · Variante B,
// on white — the hero above already carries the Gradient): pure brand icon
// instead of the severity-tinted tile, serif title with the risk badge on one
// line, "Ideal für" as a gold line instead of a grey chip, hairline foot.
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
        className="group flex h-full gap-5 rounded-xl border border-stroke-subtle bg-surface p-7 shadow-[0_18px_44px_-30px_rgba(2,22,17,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_26px_60px_-30px_rgba(2,22,17,0.35)] focus-visible:shadow-lg dark:bg-surface-secondary"
      >
        <Icon size={40} strokeWidth={1.5} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 font-serif text-[1.25rem] font-bold leading-snug text-fg">{title}</span>
            <RiskBadge level={severity} size="sm" className="mt-0.5 shrink-0">
              {t('compliance.riskBadge', {
                defaultValue: '{{level}} Risk',
                level: t(severityKey(severity), SEVERITY_FALLBACK[severity]),
              })}
            </RiskBadge>
          </div>

          {headline && <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{headline}</p>}

          {personaFit && (
            <p className="mt-2 text-body-2xs font-semibold text-fg-accent-emphasis">{personaFit}</p>
          )}

          {/* mt-auto keeps the feet of both cards in a row on one line. */}
          <div className="mt-auto pt-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stroke-subtle pt-3.5">
              <span className="inline-flex items-center gap-1.5 text-body-3xs font-semibold text-fg-tertiary">
                <ScrollText size={12} />
                {t('compliance.card.obligations', '{{count}} obligations', { count: obligations.length })}
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
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
