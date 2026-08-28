import { useState, type ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { RiskBadge } from '../ui/RiskBadge';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { getAreaProfile } from '../../lib/areaProfiles';
import { AREAS } from './areas';
import { SEVERITY_FALLBACK, severityKey } from './severity';
import type { ObligationSeverity } from '@complihub/compliance-engine';
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

/** One entry of the accordion column — presentation-ready, no engine types. */
export interface RelatedEntry {
  key: string;
  to: string;
  icon: ElementType;
  title: string;
  severity: ObligationSeverity;
  /** The quiet count on the header's right, e.g. "3 shared triggers". */
  fact: string;
  /** The folded detail line — built to hold two lines on every entry. */
  headline: string;
}

// ─── The related-accordion column (canvas "Verwandte Bereiche" · Variante C,
// 2026-08-28) — extracted 2026-08-28 so the market page can point back at
// areas with the SAME widget instead of a lookalike. ─────────────────────────
// An ACCORDION with exactly one entry open: the strongest bridge opens the
// section, and hovering (or focusing) another entry folds the open one shut
// while the touched one unfolds — automatic, both at once. Every entry is
// always a card with a constant header (icon, serif title, badge, fact,
// arrow); only the detail folds. The details are built to identical heights —
// the kicker line is reserved on every card and the headline block holds two
// lines — so the closing and the opening delta cancel out and THE COLUMN'S
// TOTAL HEIGHT NEVER MOVES (user requirement 2026-08-28, replacing the FLIP
// morph that stuttered and grew the section downwards). Leaving the widget
// folds everything back to the strongest bridge. The gold edge stays the top
// card's alone: it marks the strongest connection, not the hovered one.
export function RelatedAccordion({
  entries,
  strongestLabel,
  exitTo,
  exitLabel,
}: {
  entries: RelatedEntry[];
  strongestLabel: string;
  exitTo: string;
  exitLabel: string;
}) {
  const { t } = useTranslation('common');
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  if (entries.length === 0) return null;
  const active = hovered ?? entries[0].key;

  return (
    <div
      className="flex min-w-0 flex-1 flex-col gap-2.5"
      onMouseLeave={() => setHovered(null)}
    >
      {entries.map((e, i) => {
        const isTop = i === 0;
        const expanded = e.key === active;
        const Icon = e.icon;
        return (
          <Link
            key={e.key}
            to={e.to}
            onMouseEnter={() => setHovered(e.key)}
            onFocus={() => setHovered(e.key)}
            onBlur={() => setHovered(v => (v === e.key ? null : v))}
            className={`group block rounded-xl border border-stroke-subtle bg-surface px-6 py-4 shadow-[0_18px_44px_-30px_rgba(2,22,17,0.22)] dark:bg-surface-secondary ${
              isTop ? 'border-l-[3px] border-l-accent-500 pl-[calc(1.5rem-2px)]' : ''
            }`}
          >
            {/* The header never changes between states — what folds is only
                the detail below it, so nothing pops. */}
            <div className="flex items-center gap-4">
              <Icon size={26} strokeWidth={1.5} className="shrink-0 text-fg-brand" aria-hidden />
              <span className="min-w-0 flex-1 font-serif text-[1.125rem] font-bold leading-snug text-fg">
                {e.title}
              </span>
              <RiskBadge level={e.severity} size="sm" className="shrink-0">
                {t(severityKey(e.severity), SEVERITY_FALLBACK[e.severity])}
              </RiskBadge>
              <span className="hidden shrink-0 text-body-3xs font-semibold text-fg-tertiary sm:block">
                {e.fact}
              </span>
              <ArrowRight
                size={13}
                aria-hidden
                className="shrink-0 text-fg-tertiary transition-transform group-hover:translate-x-0.5"
              />
            </div>

            {/* Open and close run simultaneously with the same magnitude —
                the details share one fixed anatomy (reserved kicker line,
                two-line headline block), so the column's total height stays
                put in every frame. */}
            <motion.div
              initial={false}
              animate={expanded ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
              aria-hidden={!expanded}
              className="overflow-hidden"
            >
              <div className="pl-[2.625rem] pt-3">
                <span
                  aria-hidden={!isTop}
                  className={`block text-body-4xs font-bold uppercase tracking-[0.12em] ${
                    isTop ? 'text-accent-700 dark:text-fg-accent-strong' : 'invisible'
                  }`}
                >
                  {strongestLabel}
                </span>
                <p className="mt-1 min-h-[3rem] max-w-[560px] text-body-sm leading-relaxed text-fg-secondary">
                  {e.headline}
                </p>
              </div>
            </motion.div>
          </Link>
        );
      })}

      {/* The standing exit: whatever the relatedness holds, the hub is one
          step away — and it is what keeps the one-card state from ending in
          a dead end. */}
      <Link
        to={exitTo}
        className="group mt-1.5 flex items-center justify-between gap-3 border-t border-stroke-subtle px-1 pt-4 text-body-2xs font-bold text-fg-brand"
      >
        {exitLabel}
        <ArrowRight size={13} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

// ─── Related areas · cards left, copy right ──────────────────────────────────
export function RelatedAreas({ slug }: Props) {
  const { t } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';
  const related = relatedTo(slug);

  if (related.length === 0) return null;

  const entries: RelatedEntry[] = related.map(r => {
    const meta = AREAS.find(a => a.slug === r.slug)!;
    return {
      key: r.slug,
      to: `${localePrefix}/compliance/${r.slug}`,
      icon: meta.icon,
      title: t(`compliance.${r.slug}.title`, DOMAIN_BY_SLUG[r.slug]?.label ?? r.slug),
      severity: getAreaProfile(r.slug).severity,
      fact: t('compliance.area.sharedTriggers', { defaultValue: '{{count}} shared triggers', count: r.overlap }),
      headline: t(`compliance.${r.slug}.headline`, t(`compliance.${r.slug}.description`, '')),
    };
  });

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
      <RelatedAccordion
        entries={entries}
        strongestLabel={t('compliance.area.relatedStrongest', 'Strongest connection')}
        exitTo={`${localePrefix}/compliance`}
        exitLabel={t('compliance.area.allAreasLink', 'All eight areas at a glance')}
      />
    </div>
  );
}
