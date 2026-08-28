import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { AREA_BY_SLUG } from './areas';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';
import { RelatedAccordion, type RelatedEntry } from './RelatedAreas';
import type { MarketProfile } from '../../lib/marketProfiles';

interface Props {
  profile: MarketProfile;
}

// ─── The cross-link back (user ask 2026-08-28) ───────────────────────────────
// An area page points at markets (the heatmap); the market page points back at
// AREAS — and it does so with the area pages' own related-accordion, not a
// lookalike, so the two directions of the same bridge read as one widget.
//
// Which three areas is derived, not picked: the ones carrying the most duties
// with a source specific to THIS market (weight breaks ties) — the actual
// reason a reader would go there next. The folded detail names those duties
// with their statutes, because the count alone says "two" without saying what.
export function MarketRelatedAreas({ profile }: Props) {
  const { t } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';

  const entries: RelatedEntry[] = useMemo(() => {
    const weightOf = new Map(profile.weights.map((w) => [w.domainSlug, w.weight]));
    return [...profile.byDomain]
      .sort(
        (a, b) =>
          b.items.length - a.items.length ||
          (weightOf.get(b.domainSlug) ?? 0) - (weightOf.get(a.domainSlug) ?? 0),
      )
      .slice(0, 3)
      .map((g) => ({
        key: g.domainSlug,
        to: `${localePrefix}/compliance/${g.domainSlug}`,
        icon: AREA_BY_SLUG[g.domainSlug].icon,
        title: t(`compliance.${g.domainSlug}.title`, DOMAIN_BY_SLUG[g.domainSlug]?.label ?? g.domainSlug),
        severity: severityFromRiskWeight(weightOf.get(g.domainSlug) ?? 5),
        fact: t('markets.country.relatedAreasFact', {
          defaultValue_one: '{{count}} duty in this market',
          defaultValue_other: '{{count}} duties in this market',
          count: g.items.length,
        }),
        // The duties themselves, statute attached — the engine's canonical
        // labels and sources, as everywhere on the surface.
        headline: g.items.map((o) => `${o.label} — ${o.source}`).join(' · '),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, t, localePrefix]);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-10 desktop-s:flex-row-reverse desktop-s:gap-24">
      <AreaSectionHeading
        className="desktop-s:w-[340px] desktop-s:shrink-0"
        eyebrow={eyebrows.next}
        title={t('markets.country.relatedAreasTitle', 'The areas that carry this market')}
        lead={t('markets.country.relatedAreasLead', {
          defaultValue:
            "This is where this market's national duties live — the areas with the most own sources first. What a single duty requires is set out on its area page.",
        })}
      />
      <RelatedAccordion
        entries={entries}
        strongestLabel={t('compliance.area.relatedStrongest', 'Strongest connection')}
        exitTo={`${localePrefix}/compliance`}
        exitLabel={t('compliance.area.allAreasLink', 'All eight areas at a glance')}
      />
    </div>
  );
}
