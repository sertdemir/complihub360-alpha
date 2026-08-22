import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Clock3 } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { getAreaObligations } from '../../lib/areaProfiles';
import type { DomainSlug } from '../../lib/domains';
import type { CountryCode } from './types';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

// ─── Deadlines · the one section that is genuinely new ───────────────────────
// Everything else on an area page restates verified data in a new arrangement.
// This section answers a question the product could not answer anywhere before:
// what falls due, how often, and how much lead time it needs.
//
// appliesFrom is deliberately left as the stored date and turned into a
// countdown here — the enrichment map keeps itself deterministic by refusing to
// know 'now', so the render point does that arithmetic. See the comment on
// ObligationEnrichment.appliesFrom.
export function AreaTimeline({ slug, selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const obligations = useMemo(() => getAreaObligations(slug, selectedCountry), [slug, selectedCountry]);

  const dated = obligations
    .filter(o => o.dueDays != null || o.appliesFrom)
    .sort((a, b) => (a.dueDays ?? 9999) - (b.dueDays ?? 9999));

  if (dated.length === 0) return null;

  const today = new Date();
  const future = dated.filter(o => o.appliesFrom && new Date(o.appliesFrom) > today);

  return (
    <div>
      <Typography variant="h2" as="h2" weight="bold" className="text-fg">
        {t('compliance.area.timelineTitle', 'What falls due, and when')}
      </Typography>
      <Typography variant="body" className="mt-2 max-w-2xl text-fg-secondary">
        {t('compliance.area.timelineLead', {
          defaultValue:
            'Filing cadence and typical lead time per duty. Shortest lead time first — those are the ones that catch teams out.',
        })}
      </Typography>

      <ol className="mt-8 space-y-0 border-l border-stroke-subtle pl-6">
        {dated.map(o => (
          <li key={o.id} className="relative pb-7 last:pb-0">
            <span
              className="absolute -left-[1.9rem] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-surface"
              aria-hidden
            />
            <Typography variant="ui-small" weight="bold" className="text-fg">
              {o.label}
            </Typography>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5 text-body-2xs text-fg-secondary">
                <CalendarClock size={12} className="text-fg-tertiary" />
                {t(`markets.cadence.${o.due}`, { defaultValue: o.due })}
              </span>
              {o.dueDays != null && (
                <span className="inline-flex items-center gap-1.5 text-body-2xs text-fg-tertiary">
                  <Clock3 size={12} />
                  {t('markets.country.leadTime', { days: o.dueDays })}
                </span>
              )}
              {o.appliesFrom && (
                <span className="rounded-md bg-warning-bg px-2 py-0.5 text-body-3xs font-semibold text-warning-text">
                  {t('compliance.area.appliesFrom', 'Applies from {{date}}', { date: o.appliesFrom })}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {future.length > 0 && (
        <Typography variant="caption" className="mt-6 block normal-case tracking-normal leading-relaxed text-fg-tertiary">
          {t('compliance.area.futureNote', {
            defaultValue:
              '{{count}} of these do not bite yet. They are listed because the lead time for preparing them starts well before the date does.',
            count: future.length,
          })}
        </Typography>
      )}
    </div>
  );
}
