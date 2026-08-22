import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getAreaObligations } from '../../lib/areaProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import type { DomainSlug } from '../../lib/domains';
import type { CountryCode } from './types';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

// ─── The metric band · four numbers, directly under the hero ─────────────────
// The hero says which area you are on. This says how much of it there is, in
// the four terms a reader actually weighs an area by: how many duties, what the
// named penalties add up to, how soon the nearest one falls due, and how much
// of it is not live yet.
//
// Every figure is derived from the same obligations list the explorer renders
// further down, so the band cannot drift from the section it summarises. None
// of it is authored: no figure here exists unless the engine carries it.
//
// The exposure figure is a SUM OF CEILINGS, not a forecast — the same framing
// AreaEnforcement uses, for the same reason. Anything else would be
// scaremongering with a currency symbol on it.
export function AreaMetrics({ slug, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  const [ref, inView] = useInViewOnce<HTMLDListElement>();
  const obligations = useMemo(
    () => getAreaObligations(slug, selectedCountry),
    [slug, selectedCountry],
  );

  const metrics = useMemo(() => {
    const today = new Date();
    const exposure = obligations.reduce((sum, o) => sum + (o.penaltyMaxEur ?? 0), 0);
    const leadTimes = obligations.map((o) => o.dueDays).filter((d): d is number => d != null);
    const later = obligations.filter((o) => o.appliesFrom && new Date(o.appliesFrom) > today).length;

    const money = new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'EUR',
      notation: exposure >= 1_000_000 ? 'compact' : 'standard',
      maximumFractionDigits: exposure >= 1_000_000 ? 1 : 0,
    });

    return [
      {
        key: 'obligations',
        value: String(obligations.length),
        label: t('compliance.area.metrics.obligations', 'Duties in this area'),
        // Under EU every source IS the EU-level one, so "0 with a national
        // source" would be a true sentence that reads as a coverage gap.
        note:
          selectedCountry === 'EU'
            ? t('compliance.area.metrics.obligationsNoteEu', 'All sources at EU level')
            : t('compliance.area.metrics.obligationsNote', {
                defaultValue: '{{count}} with a source specific to this market',
                count: obligations.filter((o) => o.marketSpecific).length,
              }),
      },
      exposure > 0
        ? {
            key: 'exposure',
            value: money.format(exposure),
            label: t('compliance.area.metrics.exposure', 'Named penalty ceiling'),
            note: t('compliance.area.metrics.exposureNote', 'Sum of the stated maxima, not a forecast'),
          }
        : null,
      leadTimes.length > 0
        ? {
            key: 'lead',
            value: t('compliance.area.metrics.days', { defaultValue: '{{count}} days', count: Math.min(...leadTimes) }),
            label: t('compliance.area.metrics.lead', 'Shortest lead time'),
            note: t('compliance.area.metrics.leadNote', 'The duty that catches teams out first'),
          }
        : null,
      later > 0
        ? {
            key: 'later',
            value: `${later}/${obligations.length}`,
            label: t('compliance.area.metrics.later', 'Not live yet'),
            note: t('compliance.area.metrics.laterNote', 'Decided, but applicable from a later date'),
          }
        : null,
    ].filter((m): m is { key: string; value: string; label: string; note: string } => m !== null);
  }, [obligations, selectedCountry, t, i18n.language]);

  if (obligations.length === 0) return null;

  return (
    <dl
      ref={ref}
      className="grid gap-px overflow-hidden rounded-xl border border-stroke-subtle bg-stroke-subtle tablet:grid-cols-2 desktop-s:grid-cols-4"
    >
      {metrics.map((m, i) => (
        <div
          key={m.key}
          className="bg-surface px-6 py-6 transition-[opacity,transform] duration-500 ease-out"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'none' : 'translateY(12px)',
            transitionDelay: `${i * 70}ms`,
          }}
        >
          {/* tabular-nums is not decoration here: these four sit in a row and a
              reader compares them down the column as much as across. */}
          <dd className="font-serif text-[2rem] font-semibold leading-none tracking-tight text-fg tabular-nums">
            {m.value}
          </dd>
          <dt className="mt-3 text-body-sm font-semibold text-fg">{m.label}</dt>
          <p className="mt-1 text-body-2xs leading-relaxed text-fg-tertiary">{m.note}</p>
        </div>
      ))}
    </dl>
  );
}
