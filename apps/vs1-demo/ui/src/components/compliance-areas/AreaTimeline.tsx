import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getAreaObligations, type AreaObligation } from '../../lib/areaProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { SEVERITY_STYLE } from './severity';
import type { ObligationSeverity } from '@complihub/compliance-engine';
import type { DomainSlug } from '../../lib/domains';
import type { CountryCode } from './types';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

const SEVERITY_ORDER: ObligationSeverity[] = ['low', 'medium', 'high', 'critical'] as ObligationSeverity[];

// ─── The timeline · one node per DATE, not per duty ──────────────────────────
// The axis groups duties by the day they start biting, which is the only
// reading that survives contact with the data. Five PPWR material duties share
// 2030-01-01 — Art. 6, 7, 24, 25 and 29 — so a node-per-duty axis drew five
// identical columns, all reading "Jan 2030", and the reader had to compare
// seven labels to find out there were really three moments. Grouped, the same
// data says the thing that matters: five duties land on one day, and packaging
// designed today has to already aim at it.
//
// Nothing here moves when the market changes, and that is correct rather than
// broken: appliesFrom lives only on the enrichment map's EU-level entries,
// because the PPWR is a Regulation — directly applicable, same date in every
// member state. What does move is lead time, which is national (UK EPR is 90
// days where DE and FR are 60), so it stays on the today-node where it is
// actually a fact about the selected market.
//
// appliesFrom is deliberately stored as a plain date and turned into a
// milestone here — the enrichment map keeps itself deterministic by refusing to
// know 'now', so the render point does that arithmetic. See the comment on
// ObligationEnrichment.appliesFrom.
export function AreaTimeline({ slug, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  const obligations = useMemo(
    () => getAreaObligations(slug, selectedCountry),
    [slug, selectedCountry],
  );

  const dayFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const { milestones, deferred } = useMemo(() => {
    const today = new Date();
    const isFuture = (o: AreaObligation) => !!o.appliesFrom && new Date(o.appliesFrom) > today;

    const live = obligations.filter((o) => !isFuture(o));
    const ahead = new Map<string, AreaObligation[]>();
    for (const o of obligations.filter(isFuture)) {
      const key = o.appliesFrom as string;
      ahead.set(key, [...(ahead.get(key) ?? []), o]);
    }

    const heaviest = (os: AreaObligation[]) =>
      os.reduce<ObligationSeverity>(
        (max, o) =>
          SEVERITY_ORDER.indexOf(o.severity) > SEVERITY_ORDER.indexOf(max) ? o.severity : max,
        SEVERITY_ORDER[0],
      );

    const out: {
      key: string;
      when: string;
      live: boolean;
      severity: ObligationSeverity;
      duties: AreaObligation[];
    }[] = [];

    if (live.length > 0) {
      out.push({
        key: 'today',
        when: t('compliance.area.timeline.today', 'Today'),
        live: true,
        severity: heaviest(live),
        duties: live,
      });
    }
    for (const [date, duties] of [...ahead.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      out.push({
        key: date,
        when: dayFmt.format(new Date(date)),
        live: false,
        severity: heaviest(duties),
        duties,
      });
    }

    return { milestones: out, deferred: obligations.filter(isFuture).length };
  }, [obligations, t, dayFmt]);

  if (milestones.length === 0) return null;

  // The petrol rail runs from the start of the axis to the today-node, so its
  // width is one node's share rather than a proportion of duties.
  const livePct = milestones[0]?.live ? 100 / milestones.length : 0;

  return (
    <div ref={ref}>
      <AreaSectionHeading
        className="max-w-[620px]"
        eyebrow={eyebrows.timeline}
        title={t('compliance.area.timelineTitle', 'What applies when')}
        lead={
          deferred > 0
            ? t('compliance.area.timelineLead', {
                defaultValue:
                  '{{deferred}} of the {{total}} duties are settled law but not yet applicable. That is the difference between "applies" and "is coming".',
                deferred,
                total: obligations.length,
              })
            : t('compliance.area.timelineLeadAllLive', {
                defaultValue:
                  'Every duty in this area applies today. What changes by market is the lead time each one needs.',
              })
        }
      />

      {/* Below tablet the axis scrolls sideways rather than wrapping, because a
          wrapped axis stops being one. */}
      <div className="-mx-4 mt-[3rem] overflow-x-auto px-4 pb-2">
        <ol className="relative flex min-w-[44rem] gap-6 tablet:min-w-0">
          {/* Both rails are absolutely positioned, so they paint over anything
              static that follows them in the markup. The nodes get their own
              stacking context below to sit back on top. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-[2.225rem] h-0.5 rounded-full bg-stroke-subtle"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-[2.225rem] h-0.5 rounded-full bg-brand transition-[width] duration-1000 ease-out"
            style={{ width: inView ? `${livePct}%` : 0 }}
          />
          {milestones.map((m) => (
            <li key={m.key} className="relative z-[1] min-w-0 flex-1 basis-0">
              <p
                className={`text-body-3xs font-bold uppercase tracking-[0.1em] tabular-nums ${
                  m.live ? 'text-fg-brand' : SEVERITY_STYLE[m.severity].iconColor
                }`}
              >
                {m.when}
              </p>
              {/* The today-node is filled; a future one is an open ring in the
                  severity's colour, which is how the canvas separates "you are
                  standing here" from "this is still ahead". */}
              <span
                aria-hidden
                className={`my-3 block h-3.5 w-3.5 rounded-full ring-4 ring-surface ${
                  m.live
                    ? 'bg-brand'
                    : `border-2 border-current bg-surface ${SEVERITY_STYLE[m.severity].iconColor}`
                }`}
              />
              <p className="mt-4 pr-4 text-body-sm font-semibold leading-snug text-fg">
                {m.live
                  ? t('compliance.area.timeline.activeCount', '{{count}} duties active', {
                      count: m.duties.length,
                    })
                  : m.duties.length === 1
                    ? m.duties[0].label
                    : t('compliance.area.timeline.togetherCount', '{{count}} duties at once', {
                        count: m.duties.length,
                      })}
              </p>
              <p className="mt-1.5 pr-4 text-body-2xs leading-relaxed text-fg-tertiary">
                {m.live ? liveDetail(m.duties) : aheadDetail(m.duties)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  // The node's second line. For today it is what the duties are and how much
  // lead time the shortest one leaves — the only number on this axis that is
  // national. For a future date it names the duties that land together, because
  // "5 duties at once" is a count until you can see which five.
  function liveDetail(duties: AreaObligation[]) {
    const soonest = duties
      .filter((o) => o.dueDays != null)
      .sort((a, b) => (a.dueDays as number) - (b.dueDays as number))[0];
    const names = duties.map((o) => o.label).join(', ');
    return soonest
      ? t('compliance.area.timeline.liveDetail', {
          defaultValue: '{{names}} apply on an ongoing basis — the next filing is due in {{days}} days.',
          names,
          days: soonest.dueDays,
        })
      : t('compliance.area.timeline.liveDetailNoLead', {
          defaultValue: '{{names}} apply on an ongoing basis.',
          names,
        });
  }

  function aheadDetail(duties: AreaObligation[]) {
    if (duties.length === 1) {
      return t('compliance.area.timeline.aheadOne', {
        defaultValue: '{{source}} becomes applicable.',
        source: duties[0].source,
      });
    }
    return t('compliance.area.timeline.aheadMany', {
      defaultValue: '{{names}} all land on the same day.',
      names: duties.map((o) => o.label).join(', '),
    });
  }
}
