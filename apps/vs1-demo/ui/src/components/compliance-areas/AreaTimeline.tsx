import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
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

interface ThreadNode {
  key: string;
  when: string;
  /** ongoing/closing draw filled petrol, due an open petrol ring, ahead an
      open ring in the severity's colour — same vocabulary as the old axis. */
  kind: 'ongoing' | 'due' | 'ahead' | 'closing';
  title: string;
  body: string;
  tag?: string;
  severity?: ObligationSeverity;
}

// ─── The thread of deadlines (canvas "Zeitachse" · Variante C, 2026-08-28) ───
// The horizontal axis retired: only one of the eight areas has any future
// commencement date at all, so on seven pages the axis was a single node —
// and an axis with one point is not an axis (user finding). The section now
// answers the question a reader actually has — WHAT COMES NEXT — as one
// vertical thread in time order: ongoing duties first, then the filings the
// running business owes (sorted by their lead time, the one national number
// here), then the day new law lands. Where no date is ahead, a closing node
// says so as a statement rather than leaving a stump: fully in force, the
// calendar of this area is its rhythm.
//
// appliesFrom still lives only on EU-level entries (a Regulation bites the
// same day everywhere), so the ahead-nodes do not move with the market; the
// lead times do, which is why the lead names the market switch.
export function AreaTimeline({ slug, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-100px');
  const obligations = useMemo(
    () => getAreaObligations(slug, selectedCountry),
    [slug, selectedCountry],
  );

  const dayFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const { nodes, deferred, liveShare } = useMemo(() => {
    const today = new Date();
    const isFuture = (o: AreaObligation) => !!o.appliesFrom && new Date(o.appliesFrom) > today;

    const live = obligations.filter((o) => !isFuture(o));
    const ongoing = live.filter((o) => o.dueDays == null);
    const dues = live
      .filter((o) => o.dueDays != null)
      .sort((a, b) => (a.dueDays as number) - (b.dueDays as number));

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

    const out: ThreadNode[] = [];

    // Ongoing duties open the thread: they are not coming, they are already
    // here. One node — five separate "ongoing" entries would say nothing five
    // times.
    if (ongoing.length === 1) {
      const o = ongoing[0];
      out.push({
        key: `ongoing-${o.id}`,
        when: t('markets.cadence.Ongoing', 'Ongoing'),
        kind: 'ongoing',
        title: o.label,
        body: t('compliance.area.timeline.ongoingBody', 'An ongoing duty with no fixed filing date.'),
        tag:
          o.appliesFrom && new Date(o.appliesFrom) <= today
            ? t('compliance.area.timeline.sinceTag', 'in force since {{date}}', {
                date: dayFmt.format(new Date(o.appliesFrom)),
              })
            : undefined,
      });
    } else if (ongoing.length > 1) {
      out.push({
        key: 'ongoing',
        when: t('markets.cadence.Ongoing', 'Ongoing'),
        kind: 'ongoing',
        title: t('compliance.area.timeline.ongoingMany', '{{count}} duties apply on an ongoing basis', {
          count: ongoing.length,
        }),
        body: ongoing.map((o) => o.label).join(' · '),
      });
    }

    // Then the filings, nearest first. The lead time is the one national
    // number on this thread — it is what the market switch recalculates.
    for (const o of dues) {
      out.push({
        key: `due-${o.id}`,
        when: t('compliance.area.timeline.inDays', 'In {{count}} days', { count: o.dueDays }),
        kind: 'due',
        title: o.label,
        body: t('compliance.area.timeline.dueBody', 'Cadence: {{cadence}} — {{days}} days of lead time.', {
          cadence: t(`markets.cadence.${o.due}`, { defaultValue: o.due }),
          days: o.dueDays,
        }),
      });
    }

    // Then the days new law lands, grouped by date — five PPWR duties share
    // 2030-01-01, and grouped is the only reading that says so.
    for (const [date, duties] of [...ahead.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      out.push({
        key: date,
        when: dayFmt.format(new Date(date)),
        kind: 'ahead',
        severity: heaviest(duties),
        title:
          duties.length === 1
            ? duties[0].label
            : t('compliance.area.timeline.togetherCount', '{{count}} duties land on one day', {
                count: duties.length,
              }),
        body:
          duties.length === 1
            ? t('compliance.area.timeline.aheadOne', {
                defaultValue: '{{source}} becomes applicable.',
                source: duties[0].source,
              })
            : t('compliance.area.timeline.aheadMany', {
                defaultValue: '{{names}} all land on the same day.',
                names: duties.map((o) => o.label).join(', '),
              }),
      });
    }

    // No date ahead is a statement, not a stump — the closing node is what
    // keeps the seven single-date areas from rendering a broken axis.
    if (ahead.size === 0 && out.length > 0) {
      out.push({
        key: 'closing',
        when: t('compliance.area.timeline.noAheadWhen', 'No date ahead'),
        kind: 'closing',
        title: t('compliance.area.timeline.noAheadTitle', 'This area is fully in force'),
        body: t('compliance.area.timeline.noAheadBody', {
          defaultValue:
            "No statute with a later start date is on the way — this area's calendar is its rhythm.",
        }),
      });
    }

    const liveCount = out.filter((n) => n.kind !== 'ahead').length;
    return {
      nodes: out,
      deferred: obligations.filter(isFuture).length,
      // The petrol share of the spine: it reaches to the last node that is
      // already the reader's present, and fades where the future begins.
      liveShare: out.length > 0 ? (liveCount / out.length) * 100 : 0,
    };
  }, [obligations, t, dayFmt]);

  if (nodes.length === 0) return null;

  return (
    <div ref={ref} className="flex flex-col gap-10 desktop-s:flex-row desktop-s:gap-24">
      <div className="desktop-s:w-[380px] desktop-s:shrink-0">
        <AreaSectionHeading
          eyebrow={eyebrows.timeline}
          title={t('compliance.area.timelineTitle', 'What comes next')}
          lead={
            deferred > 0
              ? t('compliance.area.timelineLead', {
                  defaultValue:
                    'One thread, in time order: first the filings that day-to-day operation demands, then the day new law lands. {{deferred}} of the {{total}} duties are settled law but not yet applicable.',
                  deferred,
                  total: obligations.length,
                })
              : t('compliance.area.timelineLeadAllLive', {
                  defaultValue:
                    'Every duty here already applies — the thread shows the cadence each one returns on and the lead time it needs. The market switch above recalculates the lead times.',
                })
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <ol className="relative pl-[2.125rem]">
          {/* The spine: a quiet grey thread with the petrol overlay growing
              down it once in view — petrol as far as the present reaches,
              grey where the future begins. */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-2 left-[0.4375rem] top-2 w-0.5 rounded-full bg-stroke-subtle"
          />
          <motion.span
            aria-hidden
            initial={reduced ? false : { height: '0%' }}
            animate={inView || reduced ? { height: `${liveShare}%` } : {}}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
            className="pointer-events-none absolute left-[0.4375rem] top-2 w-0.5 rounded-full bg-brand"
          />
          {nodes.map((n, i) => (
            <motion.li
              key={n.key}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={inView || reduced ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.2 + i * 0.14 }}
              className="relative pb-8 last:pb-0"
            >
              <span
                aria-hidden
                className={`absolute -left-[2.125rem] top-0.5 h-4 w-4 rounded-full ring-4 ring-surface ${
                  n.kind === 'ongoing' || n.kind === 'closing'
                    ? 'bg-brand'
                    : n.kind === 'due'
                      ? 'border-2 border-brand bg-surface'
                      : `border-2 border-current bg-surface ${SEVERITY_STYLE[n.severity as ObligationSeverity].iconColor}`
                }`}
              />
              <p
                className={`text-body-3xs font-bold uppercase tracking-[0.1em] tabular-nums ${
                  n.kind === 'ahead'
                    ? SEVERITY_STYLE[n.severity as ObligationSeverity].iconColor
                    : 'text-fg-brand'
                }`}
              >
                {n.when}
              </p>
              <p className="mt-1.5 text-body-sm font-bold leading-snug text-fg">
                {n.title}
                {n.tag && (
                  <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-brand/10 px-2 py-0.5 align-[2px] text-body-4xs font-bold tracking-[0.04em] text-fg-brand">
                    {n.tag}
                  </span>
                )}
              </p>
              <p className="mt-1 max-w-[460px] text-body-2xs leading-relaxed text-fg-tertiary">
                {n.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}
