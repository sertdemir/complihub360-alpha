import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Typography } from '../ui/Typography';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';
import type { MarketProfile } from '../../lib/marketProfiles';

interface Props {
  profile: MarketProfile;
}

// ─── The calendar · the one view no area page can assemble ───────────────────
// Every duty this market carries, across ALL areas, grouped by how often it
// falls due. An area page only ever knows one area, so it cannot say "nine
// duties out of six areas, one of them monthly" — and that sentence is what a
// reader planning a market actually needs.
//
// As the thread of deadlines since T3 Variante B (2026-08-28) — the area
// pages' timeline component spoken here with the market's data: one vertical
// spine, one node per cadence, most frequent first, because that is where the
// operational burden really falls. A monthly filing costs twelve times what an
// annual one does regardless of which area it belongs to; the first node says
// so with the gold tag. Everything on this thread already applies — the spine
// is petrol end to end, there is no future section.
//
// No fact grids and no detail pane: a duty is explained on its area page.
// Repeating the explorer here is exactly what made the first draft of this
// page a copy.
export function MarketCalendar({ profile }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-100px');

  const money = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  if (profile.byCadence.length === 0) return null;

  const areaName = (slug: string) =>
    t(`compliance.${slug}.title`, DOMAIN_BY_SLUG[slug as never]?.label ?? slug);

  return (
    <div ref={ref} className="flex flex-col gap-10 desktop-s:flex-row desktop-s:gap-24">
      <div className="desktop-s:w-[380px] desktop-s:shrink-0">
        <AreaSectionHeading
          eyebrow={eyebrows.calendar}
          title={t('markets.country.calendarTitle', 'What comes together here, and how often')}
          lead={t('markets.country.calendarLead', {
            defaultValue:
              '{{count}} duties from {{areas}} areas in one view — by cadence, not by area. Nobody plans a market area by area; they plan it against a calendar.',
            count: profile.obligations.length,
            areas: profile.byDomain.length,
          })}
        />
        {/* Two numbers, not a section: on a market page the calendar is the
            finding and the money is the caption — under the copy, where it
            reads as the caveat it is. */}
        {profile.heaviest && (
          <Typography
            variant="caption"
            className="mt-6 block border-t border-stroke-subtle pt-4 text-body-xs normal-case leading-relaxed tracking-normal text-fg-tertiary"
          >
            {t('markets.country.exposureNote', {
              defaultValue:
                'Highest single penalty in this market: {{max}} on {{duty}}. The stated upper bounds add up to {{total}} — a ceiling if everything went wrong at once, not a forecast.',
              max: money.format(profile.heaviest.penaltyMaxEur ?? 0),
              duty: profile.heaviest.label,
              total: money.format(profile.exposureEur),
            })}
          </Typography>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <ol className="relative pl-[2.125rem]">
          {/* The spine — petrol end to end, unlike the area thread: every
              cadence on it is already the reader's present. It still grows in
              once in view, the same move. */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-2 left-[0.4375rem] top-2 w-0.5 rounded-full bg-stroke-subtle"
          />
          <motion.span
            aria-hidden
            initial={reduced ? false : { height: '0%' }}
            animate={inView || reduced ? { height: '100%' } : {}}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
            className="pointer-events-none absolute left-[0.4375rem] top-2 w-0.5 rounded-full bg-brand"
            style={{ maxHeight: 'calc(100% - 1rem)' }}
          />
          {profile.byCadence.map((group, i) => (
            <motion.li
              key={group.due}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={inView || reduced ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.2 + i * 0.14 }}
              className="relative pb-8 last:pb-0"
            >
              {/* The densest cadence opens the thread with the filled dot;
                  the following groups keep the open petrol ring. */}
              <span
                aria-hidden
                className={`absolute -left-[2.125rem] top-0.5 h-4 w-4 rounded-full ring-4 ring-surface ${
                  i === 0 ? 'bg-brand' : 'border-2 border-brand bg-surface'
                }`}
              />
              <p className="text-body-3xs font-bold uppercase tracking-[0.1em] tabular-nums text-fg-brand">
                {t('markets.country.cadenceGroup', '{{cadence}} · {{count}}', {
                  cadence: t(`markets.cadence.${group.due}`, { defaultValue: group.due }),
                  count: group.items.length,
                })}
                {i === 0 && profile.byCadence.length > 1 && (
                  <span className="ml-2 normal-case tracking-[0.08em] text-accent-700 dark:text-fg-accent-strong">
                    {t('markets.country.cadenceHot', 'Highest cadence load')}
                  </span>
                )}
              </p>
              <div className="mt-1.5">
                {group.items.map((o, j) => (
                  <div
                    key={o.subdomainId}
                    className={`flex flex-col gap-0.5 py-1.5 tablet:flex-row tablet:items-baseline tablet:gap-3 ${
                      j > 0 ? 'border-t border-stroke-subtle/60' : ''
                    }`}
                  >
                    <span className="whitespace-nowrap text-body-sm font-bold leading-snug text-fg">
                      {o.label}
                    </span>
                    <span className="min-w-0 flex-1 text-body-2xs leading-snug text-fg-tertiary">
                      {o.source} · {areaName(o.domainSlug)}
                    </span>
                    {o.dueDays != null && (
                      <span
                        className={`whitespace-nowrap text-body-2xs font-semibold tabular-nums ${
                          o.subdomainId === profile.soonest?.subdomainId
                            ? 'text-risk-on-high'
                            : 'text-fg-brand'
                        }`}
                      >
                        {t('markets.country.leadDays', '{{count}} days lead time', {
                          count: o.dueDays,
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}
