import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from '../ui/Typography';
import { getAreaObligations } from '../../lib/areaProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import type { DomainSlug } from '../../lib/domains';
import type { CountryCode } from './types';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

// ─── Deadlines · the one section that is genuinely new ───────────────────────
// Everything else on an area page restates verified data in a new arrangement.
// This section answers a question the product could not answer anywhere before:
// what falls due, how often, and how much lead time it needs.
//
// It reads as an axis rather than a list because the question is "what is
// already live and what is still ahead", and a vertical stack of rows answers
// that only if you read every row. The live/ahead split is the axis: everything
// left of the join applies today, everything right of it has a date on it.
//
// appliesFrom is deliberately left as the stored date and turned into a
// countdown here — the enrichment map keeps itself deterministic by refusing to
// know 'now', so the render point does that arithmetic. See the comment on
// ObligationEnrichment.appliesFrom.
export function AreaTimeline({ slug, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  const obligations = useMemo(() => getAreaObligations(slug, selectedCountry), [slug, selectedCountry]);

  const { steps, livePct } = useMemo(() => {
    const today = new Date();
    const dated = obligations
      .filter((o) => o.dueDays != null || o.appliesFrom)
      // Live duties first, then the future ones in date order. Within the live
      // group, shortest lead time first — those are the ones that catch teams out.
      .sort((a, b) => {
        const fa = a.appliesFrom && new Date(a.appliesFrom) > today ? 1 : 0;
        const fb = b.appliesFrom && new Date(b.appliesFrom) > today ? 1 : 0;
        if (fa !== fb) return fa - fb;
        if (fa === 1) return (a.appliesFrom ?? '').localeCompare(b.appliesFrom ?? '');
        return (a.dueDays ?? 9999) - (b.dueDays ?? 9999);
      });

    const dateFmt = new Intl.DateTimeFormat(i18n.language, { month: 'short', year: 'numeric' });
    const list = dated.map((o) => {
      const future = !!o.appliesFrom && new Date(o.appliesFrom) > today;
      return {
        id: o.id,
        label: o.label,
        future,
        when: future
          ? dateFmt.format(new Date(o.appliesFrom as string))
          : t('compliance.area.timeline.liveNow', 'Applies today'),
        detail:
          o.dueDays != null
            ? t('markets.country.leadTime', { days: o.dueDays })
            : t(`markets.cadence.${o.due}`, { defaultValue: o.due }),
      };
    });

    const live = list.filter((s) => !s.future).length;
    return { steps: list, livePct: list.length > 0 ? (live / list.length) * 100 : 0 };
  }, [obligations, t, i18n.language]);

  if (steps.length === 0) return null;

  const future = steps.filter((s) => s.future).length;

  return (
    <div ref={ref}>
      <AreaSectionHeading
        eyebrow={eyebrows.timeline}
        title={t('compliance.area.timelineTitle', 'What falls due, and when')}
        lead={
          <span className="block max-w-2xl">
            {t('compliance.area.timelineLead', {
              defaultValue:
                'Filing cadence and typical lead time per duty. Shortest lead time first — those are the ones that catch teams out.',
            })}
          </span>
        }
      />

      {/* Below tablet the axis scrolls sideways rather than wrapping, because a
          wrapped axis stops being one. From tablet up the steps share the
          container width instead of overflowing it. */}
      <div className="-mx-4 mt-10 overflow-x-auto px-4 pb-2">
        <ol className="relative flex min-w-[40rem] gap-5 tablet:min-w-0">
          {/* Both rails are absolutely positioned, so they paint over anything
              static that follows them in the markup. The dots get their own
              stacking context below to sit back on top. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-[5px] h-0.5 rounded-full bg-stroke-subtle"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-[5px] h-0.5 rounded-full bg-brand transition-[width] duration-1000 ease-out"
            style={{ width: inView ? `${livePct}%` : 0 }}
          />
          {steps.map((s, i) => (
            <li key={s.id} className="relative z-[1] min-w-0 flex-1 basis-0">
              <span
                aria-hidden
                className={`block h-3 w-3 rounded-full ring-4 ring-surface transition-[background-color] duration-500 ${
                  s.future ? 'bg-stroke' : 'bg-brand'
                }`}
              />
              <p
                className={`mt-4 text-body-3xs font-bold uppercase tracking-[0.1em] ${
                  s.future ? 'text-fg-tertiary' : 'text-fg-brand'
                }`}
              >
                {s.when}
              </p>
              <p className="mt-1.5 pr-3 text-body-sm font-semibold leading-snug text-fg">
                {s.label}
              </p>
              <p className="mt-1 text-body-2xs text-fg-tertiary">{s.detail}</p>
            </li>
          ))}
        </ol>
      </div>

      {future > 0 && (
        <Typography variant="caption" className="mt-8 block normal-case tracking-normal leading-relaxed text-fg-tertiary">
          {t('compliance.area.futureNote', {
            defaultValue:
              '{{count}} of these do not bite yet. They are listed because the lead time for preparing them starts well before the date does.',
            count: future,
          })}
        </Typography>
      )}
    </div>
  );
}
