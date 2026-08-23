import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getAreaObligations } from '../../lib/areaProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import type { DomainSlug } from '../../lib/domains';
import type { CountryCode } from './types';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

// ─── The metric band · what there is of this area, in four figures ───────────
// The hero says which area you are on. This says how much of it there is, in
// the terms a reader actually weighs an area by: how many duties, what the
// named penalties add up to, how soon the nearest one falls due, and how much
// of it is not live yet.
//
// A BAND, NOT A ROW OF CARDS. That is the canvas's shape and it is also what
// makes the section survive thin data: the tiles flex, so three fill the width
// as evenly as four and two as evenly as three. The card grid this replaced
// had four fixed columns, so an area the engine carries less for — and there
// are several — rendered its shortfall as an empty grey box. A missing figure
// should be invisible, not drawn.
//
// Every figure is derived from the same obligations list the explorer renders
// further down, so the band cannot drift from the section it summarises. None
// of it is authored: no figure here exists unless the engine carries it, and
// each tile drops out entirely rather than showing a zero.
//
// The exposure figure is a SUM OF CEILINGS, not a forecast — the same framing
// AreaEnforcement uses, for the same reason. It is the one number in the band
// that carries the risk tone, because it is the one that is a threat.
export function AreaMetrics({ slug, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  const [ref, inView] = useInViewOnce<HTMLDListElement>();
  const obligations = useMemo(
    () => getAreaObligations(slug, selectedCountry),
    [slug, selectedCountry],
  );

  const marketLabel =
    selectedCountry === 'EU'
      ? t('compliance.country.euOption', 'EU-wide')
      : t(`markets.countries.${selectedCountry}`, { defaultValue: selectedCountry });

  const metrics = useMemo(() => {
    const today = new Date();
    const exposure = obligations.reduce((sum, o) => sum + (o.penaltyMaxEur ?? 0), 0);
    const soonest = obligations
      .filter((o) => o.dueDays != null)
      .sort((a, b) => (a.dueDays as number) - (b.dueDays as number))[0];
    const later = obligations.filter((o) => o.appliesFrom && new Date(o.appliesFrom) > today);

    const money = new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'EUR',
      notation: exposure >= 1_000_000 ? 'compact' : 'standard',
      maximumFractionDigits: exposure >= 1_000_000 ? 1 : 0,
    });
    const monthYear = new Intl.DateTimeFormat(i18n.language, { month: '2-digit', year: 'numeric' });

    // "1 from 08/2026 · 5 from 01/2030" — the dates the deferred duties actually
    // carry, counted per date rather than asserted as one deadline.
    const byDate = new Map<string, number>();
    for (const o of later) {
      const key = monthYear.format(new Date(o.appliesFrom as string));
      byDate.set(key, (byDate.get(key) ?? 0) + 1);
    }
    const laterNote = [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => t('compliance.area.metrics.fromDate', {
        defaultValue: '{{count}} from {{date}}',
        count,
        date,
      }))
      .join(' · ');

    return [
      obligations.length > 0
        ? {
            key: 'duties',
            value: String(obligations.length),
            label: t('compliance.area.metrics.obligations', 'Duties in this area'),
            note:
              selectedCountry === 'EU'
                ? t('compliance.area.metrics.obligationsNoteEu', 'All sources at EU level')
                : t('compliance.area.metrics.nationalIn', {
                    defaultValue: '{{count}} on a legal basis in {{market}}',
                    count: obligations.filter((o) => o.marketSpecific).length,
                    market: marketLabel,
                  }),
            tone: 'text-fg',
          }
        : null,
      exposure > 0
        ? {
            key: 'exposure',
            value: money.format(exposure),
            label: t('compliance.area.metrics.exposure', 'Maximum penalty exposure'),
            note: t(
              'compliance.area.metrics.exposureNote',
              'Sum of the upper bounds, not the expected value',
            ),
            tone: 'text-risk-on-critical',
          }
        : null,
      soonest
        ? {
            key: 'lead',
            value: t('compliance.area.metrics.days', {
              defaultValue: '{{count}} days',
              count: soonest.dueDays as number,
            }),
            label: t('compliance.area.metrics.untilNext', 'until the next deadline'),
            // The statute, not the duty's name plus the statute. The name was
            // the longest string in the band by a wide margin — 69 characters
            // for the French EPR entry — and pushed its own note onto three
            // lines. The source alone still says which filing the number
            // belongs to, and it is what the canvas puts here.
            note: soonest.source,
            tone: 'text-fg',
          }
        : null,
      later.length > 0
        ? {
            key: 'later',
            value: t('compliance.area.metrics.ofTotal', {
              defaultValue: '{{count}} of {{total}}',
              count: later.length,
              total: obligations.length,
            }),
            label: t('compliance.area.metrics.laterLabel', 'apply only later'),
            note: laterNote,
            tone: 'text-fg',
          }
        : null,
    ].filter((m): m is { key: string; value: string; label: string; note: string; tone: string } =>
      m !== null,
    );
  }, [obligations, selectedCountry, marketLabel, t, i18n.language]);

  if (metrics.length === 0) return null;

  return (
    // The negative margin pulls the band out to the container's padding edge,
    // so every tile can carry the SAME padding and still leave the first one's
    // text flush with the hero above. Equal padding is what makes the columns
    // equal: with flex-basis 0 the browser divides the FREE space, and padding
    // is added on top — one-sided padding on the outer tiles made them 64px
    // narrower than the middle ones.
    // The row starts at desktop-m, not tablet. Four tiles need ~263px each for
    // the longest label to stay on one line, so the band needs 1055px, so the
    // page needs ~1183. Between 768 and that the row was cramped and every
    // label wrapped — the same defect that was just fixed at desktop width,
    // still live one breakpoint down. Below the row the tiles stack and the
    // hairline turns horizontal.
    <dl
      ref={ref}
      className="-mx-[1rem] flex flex-col border-y border-stroke-subtle bg-surface-secondary desktop-m:flex-row"
    >
      {metrics.map((m, i) => (
        <Fragment key={m.key}>
          {i > 0 && (
            <span
              aria-hidden
              className="h-px w-full shrink-0 bg-stroke-subtle desktop-m:my-7 desktop-m:h-auto desktop-m:w-px"
            />
          )}
          <div
            // flex-1 with a zero basis, so any count divides the row evenly —
            // three tiles are three thirds, not three quarters and a gap.
            // 16px a side, not the scale's px-10 — which is 64px in this
            // config and left 163px of content for a label needing 218, so
            // every label wrapped at four tiles. The canvas does not wrap
            // because its band runs the full 1440 and gives each tile ~239px
            // of content; 16px reaches exactly that inside our narrower
            // container, with the longest translation (es, 231px) still on one
            // line. The columns therefore sit closer than the canvas draws
            // them. That is the half of it worth losing: the hairline does the
            // separating, and a wrapped label does not.
            //
            // Centred, where the canvas sets these flush left. The tiles are
            // equal and the band is centred on the page — measured, both — but
            // the three strings in a tile are of very different lengths, so
            // ragged right edges left every column looking as though it had
            // been pushed left, most of all the last one. Centring makes each
            // column symmetric about its own axis and the ragged edge falls to
            // both sides instead of collecting at the end of the band.
            className="min-w-0 flex-1 basis-0 px-[1rem] py-8 text-center transition-[opacity,transform] duration-500 ease-out"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'none' : 'translateY(12px)',
              transitionDelay: `${i * 70}ms`,
            }}
          >
            {/* tabular-nums is not decoration here: these sit in a row and a
                reader compares them across it. */}
            <dd
              className={`font-serif text-[2.5rem] font-semibold leading-none tracking-tight tabular-nums ${m.tone}`}
            >
              {m.value}
            </dd>
            <dt className="mt-2 text-body-xs font-semibold text-fg">{m.label}</dt>
            <p className="mt-1 text-body-2xs leading-relaxed text-fg-tertiary">{m.note}</p>
          </div>
        </Fragment>
      ))}
    </dl>
  );
}
