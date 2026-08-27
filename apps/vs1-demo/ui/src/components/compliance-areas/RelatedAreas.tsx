import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
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
// as the standing exit. Every entry SHOWS its reason: the number of shared
// triggers, which is the same count the sort runs on.
//
// Cards left, copy right (user ask 2026-08-28), and the runners-up EXPAND on
// hover and keyboard focus into the same card state the top one opens with —
// title, badge, headline, foot — with the atlas's layout spring pulling the
// neighbours along. The gold edge and the kicker stay the top card's alone:
// they mark the strongest connection, not the hovered one.
export function RelatedAreas({ slug }: Props) {
  const { t } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const { locale } = useParams();
  const reduced = useReducedMotion();
  const localePrefix = locale ? `/${locale}` : '';
  const related = relatedTo(slug);
  const [hovered, setHovered] = useState<DomainSlug | null>(null);

  if (related.length === 0) return null;

  const areaTitle = (s: DomainSlug) => t(`compliance.${s}.title`, DOMAIN_BY_SLUG[s]?.label ?? s);
  const sharedTriggers = (count: number) =>
    t('compliance.area.sharedTriggers', { defaultValue: '{{count}} shared triggers', count });

  return (
    <div className="flex flex-col gap-10 desktop-s:flex-row-reverse desktop-s:gap-24">
      <AreaSectionHeading
        className="desktop-s:w-[340px] desktop-s:shrink-0"
        eyebrow={eyebrows.next}
        title={t('compliance.area.relatedTitle', 'Areas that travel with this one')}
        lead={t('compliance.area.relatedLead', {
          defaultValue:
            'These share triggers with the area you are reading — the same fact about your business pulls them in too.',
        })}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {related.map((r, i) => {
          const isTop = i === 0;
          const expanded = isTop || hovered === r.slug;
          const meta = AREAS.find(a => a.slug === r.slug)!;
          const Icon = meta.icon;
          const severity = getAreaProfile(r.slug).severity;
          const headline = t(`compliance.${r.slug}.headline`, t(`compliance.${r.slug}.description`, ''));
          return (
            <motion.div key={r.slug} layout transition={{ duration: 0.35, ease: 'easeOut' }}>
              <Link
                to={`${localePrefix}/compliance/${r.slug}`}
                onMouseEnter={() => !isTop && setHovered(r.slug)}
                onMouseLeave={() => setHovered(v => (v === r.slug ? null : v))}
                onFocus={() => !isTop && setHovered(r.slug)}
                onBlur={() => setHovered(v => (v === r.slug ? null : v))}
                className={
                  expanded
                    ? `group flex gap-5 rounded-xl border border-stroke-subtle bg-surface p-7 shadow-[0_18px_44px_-30px_rgba(2,22,17,0.25)] dark:bg-surface-secondary ${
                        isTop
                          ? 'border-l-[3px] border-l-accent-500 transition-all hover:-translate-y-0.5 hover:shadow-[0_26px_60px_-30px_rgba(2,22,17,0.35)]'
                          : ''
                      }`
                    : 'group flex items-center gap-4 px-1 py-4'
                }
              >
                {expanded ? (
                  <>
                    <Icon size={40} strokeWidth={1.5} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden />
                    <motion.div
                      initial={reduced || isTop ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className="flex min-w-0 flex-1 flex-col"
                    >
                      {isTop && (
                        <span className="mb-1.5 text-body-4xs font-bold uppercase tracking-[0.12em] text-accent-700 dark:text-fg-accent-strong">
                          {t('compliance.area.relatedStrongest', 'Strongest connection')}
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 font-serif text-[1.25rem] font-bold leading-snug text-fg">
                          {areaTitle(r.slug)}
                        </span>
                        <RiskBadge level={severity} size="sm" className="mt-0.5 shrink-0">
                          {t(severityKey(severity), SEVERITY_FALLBACK[severity])}
                        </RiskBadge>
                      </div>
                      {headline && (
                        <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{headline}</p>
                      )}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stroke-subtle pt-3.5">
                        <span className="text-body-3xs font-bold text-fg-brand">
                          {sharedTriggers(r.overlap)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-body-3xs font-bold text-fg-brand">
                          {t('compliance.area.relatedOpen', 'Open this area')}
                          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <Icon size={22} strokeWidth={1.5} className="shrink-0 text-fg-brand" aria-hidden />
                    <span className="min-w-0 flex-1 text-body-sm font-bold text-fg">
                      {areaTitle(r.slug)}
                    </span>
                    <span className="shrink-0 text-body-3xs font-semibold text-fg-tertiary">
                      {sharedTriggers(r.overlap)}
                    </span>
                    <ArrowRight size={13} aria-hidden className="shrink-0 text-fg-tertiary" />
                  </>
                )}
              </Link>
            </motion.div>
          );
        })}

        {/* The standing exit: whatever the relatedness holds, the hub is one
            step away — and it is what keeps the one-card state from ending in
            a dead end. */}
        <motion.div layout transition={{ duration: 0.35, ease: 'easeOut' }}>
          <Link
            to={`${localePrefix}/compliance`}
            className="group flex items-center justify-between gap-3 border-t border-stroke-subtle px-1 pt-4 text-body-2xs font-bold text-fg-brand"
          >
            {t('compliance.area.allAreasLink', 'All eight areas at a glance')}
            <ArrowRight size={13} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
