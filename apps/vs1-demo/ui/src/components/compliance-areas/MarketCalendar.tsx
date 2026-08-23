import { useTranslation } from 'react-i18next';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
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
// Sorted by frequency rather than by area, because that is where the
// operational burden really falls: a monthly filing costs twelve times what an
// annual one does regardless of which area it belongs to. The most frequent
// group is tinted, so the eye lands on the work first.
//
// No fact grids and no detail pane: a duty is explained on its area page, and
// the area chip on every entry is the way there. Repeating the explorer here
// is exactly what made the first draft of this page a copy.
export function MarketCalendar({ profile }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();

  const money = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  if (profile.byCadence.length === 0) return null;

  const areaName = (slug: string) =>
    t(`compliance.${slug}.title`, DOMAIN_BY_SLUG[slug as never]?.label ?? slug);

  return (
    <div>
      <AreaSectionHeading
        className="max-w-[660px]"
        eyebrow={eyebrows.calendar}
        title={t('markets.country.calendarTitle', 'What comes together here, and how often')}
        lead={t('markets.country.calendarLead', {
          defaultValue:
            '{{count}} duties from {{areas}} areas in one view — by cadence, not by area. Nobody plans a market area by area; they plan it against a calendar.',
          count: profile.obligations.length,
          areas: profile.byDomain.length,
        })}
      />

      {/* Columns on desktop, stacked below — the grid is auto-fit so a market
          with three cadence groups fills the width instead of leaving two
          empty columns. An empty group never reaches here: byCadence is built
          from the duties that exist. */}
      <div className="mt-10 grid gap-4 tablet:grid-cols-2 desktop-m:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
        {profile.byCadence.map((group, i) => (
          <div
            key={group.due}
            className="overflow-hidden rounded-xl border border-stroke-subtle bg-surface"
          >
            <div
              className={`border-b border-stroke-subtle px-[1.125rem] py-3.5 ${
                i === 0 ? 'bg-brand-light/50' : 'bg-surface-secondary'
              }`}
            >
              <div
                className={`text-body-3xs font-bold uppercase tracking-[0.1em] ${
                  i === 0 ? 'text-fg-brand' : 'text-fg-tertiary'
                }`}
              >
                {t(`markets.cadence.${group.due}`, { defaultValue: group.due })}
              </div>
              <div className="mt-1 font-serif text-h3 font-semibold tabular-nums text-fg">
                {group.items.length}
              </div>
            </div>
            <div className="flex flex-col gap-3.5 px-[1.125rem] py-4">
              {group.items.map((o, j) => (
                <div key={o.subdomainId} className={j > 0 ? 'border-t border-stroke-subtle pt-3.5' : ''}>
                  <span className="inline-flex rounded-full bg-surface-tertiary px-2 py-0.5 text-body-4xs font-bold uppercase tracking-[0.06em] text-fg-tertiary">
                    {areaName(o.domainSlug)}
                  </span>
                  <p className="mt-2 text-body-sm font-bold leading-snug text-fg">{o.label}</p>
                  <p className="mt-1 text-body-2xs leading-snug text-fg-tertiary">{o.source}</p>
                  {o.dueDays != null && (
                    <p
                      className={`mt-2 text-body-2xs font-semibold tabular-nums ${
                        o.subdomainId === profile.soonest?.subdomainId
                          ? 'text-risk-on-high'
                          : 'text-fg-tertiary'
                      }`}
                    >
                      {t('markets.country.leadDays', '{{count}} days lead time', {
                        count: o.dueDays,
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Two numbers, not a section. The area page spends a whole dark band on
          this; here it is a footnote, because on a market page the calendar is
          the finding and the money is the caption. */}
      {profile.heaviest && (
        <p className="mt-6 max-w-[760px] text-body-xs leading-relaxed text-fg-tertiary">
          {t('markets.country.exposureNote', {
            defaultValue:
              'Highest single penalty in this market: {{max}} on {{duty}}. The stated upper bounds add up to {{total}} — a ceiling if everything went wrong at once, not a forecast.',
            max: money.format(profile.heaviest.penaltyMaxEur ?? 0),
            duty: profile.heaviest.label,
            total: money.format(profile.exposureEur),
          })}
        </p>
      )}
    </div>
  );
}
