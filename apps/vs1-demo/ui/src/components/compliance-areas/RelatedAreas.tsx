import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { RiskBadge } from '../ui/RiskBadge';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { getAreaProfile } from '../../lib/areaProfiles';
import { AREAS } from './areas';
import { SEVERITY_FALLBACK, severityKey } from './severity';
import type { DomainSlug } from '../../lib/domains';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';

interface Props {
  slug: DomainSlug;
}

// Relatedness is derived, not curated: two areas are related when the engine
// files duties under both that share trigger tags. That keeps the cross-links
// truthful as the template library grows — an editorial list would have gone
// stale the first time a subdomain was added, and silently.
function relatedTo(slug: DomainSlug): { slug: DomainSlug; overlap: number }[] {
  const own = new Set(getAreaProfile(slug).subdomains.flatMap(s => s.triggerTags));
  return AREAS.filter(a => a.slug !== slug)
    .map(a => ({
      slug: a.slug,
      overlap: getAreaProfile(a.slug)
        .subdomains.flatMap(s => s.triggerTags)
        .filter(tag => own.has(tag)).length,
    }))
    .filter(a => a.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3);
}

/** Whether the section has anything to say for this area — the page uses this
    to skip the whole Section wrapper instead of rendering empty padding
    (data-privacy shares no trigger with anyone). */
export function hasRelatedAreas(slug: DomainSlug): boolean {
  return relatedTo(slug).length > 0;
}

// ─── Related areas (canvas "Verwandte Bereiche" · Variante C, 2026-08-28) ────
// The derived relatedness runs 0–3 across the eight areas, and a three-column
// card grid with one lonely card was the one-node-timeline mistake again. So
// the strongest bridge stands as ONE big card with the gold edge and a kicker,
// whatever the count — one related area reads as deliberate, not as a gap —
// the runners-up follow as quiet rows, and "all eight areas" closes the column
// as the standing exit. Every entry now SHOWS its reason: the number of
// shared triggers, which is the same count the sort runs on.
export function RelatedAreas({ slug }: Props) {
  const { t } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';
  const related = relatedTo(slug);

  if (related.length === 0) return null;
  const [top, ...rest] = related;

  const areaTitle = (s: DomainSlug) => t(`compliance.${s}.title`, DOMAIN_BY_SLUG[s]?.label ?? s);
  const sharedTriggers = (count: number) =>
    t('compliance.area.sharedTriggers', { defaultValue: '{{count}} shared triggers', count });

  const topMeta = AREAS.find(a => a.slug === top.slug)!;
  const TopIcon = topMeta.icon;
  const topSeverity = getAreaProfile(top.slug).severity;
  const topHeadline = t(`compliance.${top.slug}.headline`, t(`compliance.${top.slug}.description`, ''));

  return (
    <div className="flex flex-col gap-10 desktop-s:flex-row desktop-s:gap-24">
      <AreaSectionHeading
        className="desktop-s:w-[340px] desktop-s:shrink-0"
        eyebrow={eyebrows.next}
        title={t('compliance.area.relatedTitle', 'Areas that travel with this one')}
        lead={t('compliance.area.relatedLead', {
          defaultValue:
            'These share triggers with the area you are reading — the same fact about your business pulls them in too.',
        })}
      />

      <div className="min-w-0 flex-1">
        {/* The strongest bridge: hub-card anatomy with the gold edge. */}
        <Link
          to={`${localePrefix}/compliance/${top.slug}`}
          className="group flex gap-5 rounded-xl border border-stroke-subtle border-l-[3px] border-l-accent-500 bg-surface p-7 shadow-[0_18px_44px_-30px_rgba(2,22,17,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_26px_60px_-30px_rgba(2,22,17,0.35)] dark:bg-surface-secondary"
        >
          <TopIcon size={40} strokeWidth={1.5} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-body-4xs font-bold uppercase tracking-[0.12em] text-accent-700 dark:text-fg-accent-strong">
              {t('compliance.area.relatedStrongest', 'Strongest connection')}
            </span>
            <div className="mt-1.5 flex items-start justify-between gap-3">
              <span className="min-w-0 font-serif text-[1.25rem] font-bold leading-snug text-fg">
                {areaTitle(top.slug)}
              </span>
              <RiskBadge level={topSeverity} size="sm" className="mt-0.5 shrink-0">
                {t(severityKey(topSeverity), SEVERITY_FALLBACK[topSeverity])}
              </RiskBadge>
            </div>
            {topHeadline && (
              <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{topHeadline}</p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stroke-subtle pt-3.5">
              <span className="text-body-3xs font-bold text-fg-brand">{sharedTriggers(top.overlap)}</span>
              <span className="inline-flex items-center gap-1.5 text-body-3xs font-bold text-fg-brand">
                {t('compliance.area.relatedOpen', 'Open this area')}
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>

        {/* The runners-up as quiet rows — one to two of them, never a grid. */}
        {rest.length > 0 && (
          <ul className="mt-2">
            {rest.map((r, i) => {
              const meta = AREAS.find(a => a.slug === r.slug)!;
              const Icon = meta.icon;
              return (
                <li key={r.slug} className={i > 0 ? 'border-t border-stroke-subtle' : ''}>
                  <Link
                    to={`${localePrefix}/compliance/${r.slug}`}
                    className="group flex items-center gap-4 px-1 py-4"
                  >
                    <Icon size={22} strokeWidth={1.5} className="shrink-0 text-fg-brand" aria-hidden />
                    <span className="min-w-0 flex-1 text-body-sm font-bold text-fg transition-colors group-hover:text-fg-brand">
                      {areaTitle(r.slug)}
                    </span>
                    <span className="shrink-0 text-body-3xs font-semibold text-fg-tertiary">
                      {sharedTriggers(r.overlap)}
                    </span>
                    <ArrowRight
                      size={13}
                      aria-hidden
                      className="shrink-0 text-fg-tertiary transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* The standing exit: whatever the relatedness holds, the hub is one
            step away — and it is what keeps the one-card state from ending in
            a dead end. */}
        <Link
          to={`${localePrefix}/compliance`}
          className="group mt-2 flex items-center justify-between gap-3 border-t border-stroke-subtle px-1 pt-4 text-body-2xs font-bold text-fg-brand"
        >
          {t('compliance.area.allAreasLink', 'All eight areas at a glance')}
          <ArrowRight size={13} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
