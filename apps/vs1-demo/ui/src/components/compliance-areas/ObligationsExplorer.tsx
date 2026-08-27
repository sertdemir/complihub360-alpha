import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { BusinessModel } from '@complihub/compliance-engine';
import { ChevronRight, FileText } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { RiskBadge } from '../ui/RiskBadge';
import { getAreaObligations, type AreaObligation } from '../../lib/areaProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { AREA_BY_SLUG } from './areas';
import type { DomainSlug } from '../../lib/domains';
import { SEVERITY_FALLBACK, SEVERITY_STYLE, severityKey } from './severity';
import type { CountryCode } from './types';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

// English fallbacks for the four models the engine names, used to label a
// duty's scope in the detail pane. There is no longer a filter over them —
// see the comment on the detail pane for why.
const MODEL_FALLBACK: Record<string, string> = {
  [BusinessModel.DTC]: 'Direct-to-consumer',
  [BusinessModel.MARKETPLACE_SELLER]: 'Marketplace seller',
  [BusinessModel.SAAS_SUBSCRIPTION]: 'SaaS / subscription',
  [BusinessModel.AGENCY]: 'Agency / services',
};

// ─── Obligations explorer ────────────────────────────────────────────────────
// The substance of an area page, and the part that did not exist anywhere on
// the marketing surface before: 21 subdomains with CELEX references sat in the
// engine and were never rendered outside the logged-in workbench.
//
// It reads as a master/detail pair rather than a stack of cards. A stack forces
// a reader to carry the shape of a duty in their head while scrolling to the
// next one; side by side, the list is the index and the pane answers the four
// questions a duty is actually judged by — what law, what it costs, how often,
// and where it applies.
//
// In the homepage atlas's dress since 2026-08-28 (user decision — same
// component language, no new invention): the list is the RAIL, the active row
// an elevated card with the gold edge, and the detail stands as a dossier card
// on the Gradient panel, crossfading on every selection. Like the atlas it
// plays itself through — every few seconds the next duty opens — until a click
// takes over; reduced motion never auto-advances.
//
// The list is plain buttons with aria-pressed, NOT a tablist with roving focus.
// A tablist is the textbook pattern here and it is also the one that quietly
// breaks: this repo has twice shipped a green jsdom test asserting a keyboard
// contract that did not hold in a real browser. Tab through the list, Enter to
// select — no focus machinery, so there is none to get wrong.
//
// Two filters, both honest about what they do. The business-model filter uses
// the engine's own applicableBusinessModels — it narrows, it never invents a
// duty. The market comes from the page-level selector and switches the statute,
// penalty and cadence to that jurisdiction.
//
// Where the engine holds no national source, the EU-level entry is shown and
// labelled EU-wide rather than dressed up as a local one. That distinction is
// the whole reason a reader can trust the rest of the row.
export function ObligationsExplorer({ slug, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' });
  // The list rows and the risk chip need the compact form; the fact grid keeps
  // the long one.
  // Explicit parts, not dateStyle 'short': that renders a two-digit year in
  // several locales, and "ab 01.01.30" for a duty that bites in 2030 is the
  // one abbreviation this page cannot afford.
  const shortDate = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const AreaIcon = AREA_BY_SLUG[slug]?.icon;
  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-120px');
  const [validity, setValidity] = useState<'all' | 'now' | 'later'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picked, setPicked] = useState(false);

  const all = useMemo(() => getAreaObligations(slug, selectedCountry), [slug, selectedCountry]);

  // Live today vs deferred. The canvas segments the list this way and it is
  // the split a reader actually plans around: what binds now is work, what
  // binds in 2030 is a note in a calendar.
  const { liveNow, later, laterYear } = useMemo(() => {
    const today = new Date();
    const isLater = (o: AreaObligation) => !!o.appliesFrom && new Date(o.appliesFrom) > today;
    const deferred = all.filter(isLater);
    const years = new Set(deferred.map((o) => new Date(o.appliesFrom as string).getFullYear()));
    return {
      liveNow: all.filter((o) => !isLater(o)),
      later: deferred,
      // Only name the year when every deferred duty shares one. Where they do
      // not, "from 2030" would be false for some of what the filter returns.
      laterYear: years.size === 1 ? [...years][0] : null,
    };
  }, [all]);

  const byValidity = validity === 'now' ? liveNow : validity === 'later' ? later : all;

  // A REAL gap: no national entry, and the fallback says a national text
  // exists to hold. An EU Regulation standing in is not a gap — it is the law
  // here — and counting it as one was the misreading this whole change fixes.
  const gapCount = all.filter((o) => !o.marketSpecific && o.scope !== 'eu').length;
  const shown = byValidity;

  // Changing area, market or filter can strip the duty that was open. Falling
  // back to the first row keeps the pane populated instead of blanking it.
  const selected: AreaObligation | undefined =
    shown.find((o) => o.id === selectedId) ?? shown[0];
  useEffect(() => {
    setSelectedId(null);
  }, [slug, selectedCountry, validity]);

  // Self-run like the homepage atlas: once in view the next duty opens every
  // few seconds, until the user takes over by clicking a row or a filter.
  useEffect(() => {
    if (!inView || reduced || picked || shown.length < 2 || !selected) return;
    const id = setTimeout(() => {
      const idx = shown.findIndex((o) => o.id === selected.id);
      setSelectedId(shown[(idx + 1) % shown.length].id);
    }, 6000);
    return () => clearTimeout(id);
  }, [inView, reduced, picked, shown, selected]);

  const marketLabel =
    selectedCountry === 'EU'
      ? t('compliance.country.euOption', 'EU-wide')
      : t(`markets.countries.${selectedCountry}`, { defaultValue: selectedCountry });

  return (
    <div>
      <AreaSectionHeading
        className="max-w-[620px]"
        eyebrow={eyebrows.obligations}
        title={t('compliance.area.obligationsTitle', 'What this area actually requires')}
        lead={t('compliance.area.obligationsLead', {
          defaultValue:
            'Every duty below traces to a named statute. Switch market to see the source that applies there.',
        })}
      />

      {shown.length === 0 || !selected ? (
        <div className="mt-6 rounded-xl border border-stroke-subtle bg-surface p-6">
          <Typography variant="body" className="text-fg-secondary">
            {/* Reachable only when the engine holds nothing for this area in
                this market — the validity segments cannot empty the list, they
                render only when both groups have members. The wording used to
                blame the business-model filter, which no longer exists. */}
            {t('compliance.area.noneForMarket', {
              defaultValue:
                'The engine carries no duty for this area in {{market}} yet. That is a genuine gap in coverage, not a clean bill of health.',
              market: marketLabel,
            })}
          </Typography>
        </div>
      ) : (
        <div ref={ref} className="mt-6 flex flex-col gap-8 desktop-s:flex-row desktop-s:items-stretch desktop-s:gap-10">
          {/* Rail column — the validity segments sit hard under the title and
              the rows stack beneath them: the chips lead the list they filter
              (user ask 2026-08-28, moved out of the heading row to save
              height). */}
          <div className="flex flex-col desktop-s:w-[360px] desktop-s:shrink-0">
            {/* Only worth showing when there is something to separate: with
                every duty already live the three segments would be one real
                choice and two dead ones. */}
            {later.length > 0 && liveNow.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {/* Touching a filter is taking over, same as clicking a row —
                    the auto-run must not fight a reader who just narrowed the
                    list. */}
                <ValiditySegment
                  selected={validity === 'all'}
                  onClick={() => {
                    setPicked(true);
                    setValidity('all');
                  }}
                >
                  {t('compliance.area.validityAll', 'All {{count}}', { count: all.length })}
                </ValiditySegment>
                <ValiditySegment
                  selected={validity === 'now'}
                  onClick={() => {
                    setPicked(true);
                    setValidity('now');
                  }}
                >
                  {t('compliance.area.validityNow', 'Applies today · {{count}}', {
                    count: liveNow.length,
                  })}
                </ValiditySegment>
                <ValiditySegment
                  selected={validity === 'later'}
                  onClick={() => {
                    setPicked(true);
                    setValidity('later');
                  }}
                >
                  {laterYear
                    ? t('compliance.area.validityFromYear', 'From {{year}} · {{count}}', {
                        year: laterYear,
                        count: later.length,
                      })
                    : t('compliance.area.validityLater', 'Later · {{count}}', {
                        count: later.length,
                      })}
                </ValiditySegment>
              </div>
            )}
            {/* Rail — the atlas's list anatomy: quiet rows with hairlines, the
                active duty as an elevated card with the gold edge. Each row
                carries its OWN entrance — not parent variant propagation: a
                row mounted later by a filter switch would inherit "hidden"
                from a parent whose animation has already run and never be
                told to show (the vanishing-list bug, fixed 2026-08-28). */}
            <ul className="mt-5 flex flex-1 flex-col justify-center gap-1.5">
              {shown.map((o, i) => {
                const active = o.id === selected.id;
                const style = SEVERITY_STYLE[o.severity];
                return (
                  <motion.li
                    key={o.id}
                    initial={reduced ? false : { opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.06 }}
                  >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setPicked(true);
                      setSelectedId(o.id);
                    }}
                    className={
                      active
                        ? 'flex w-full items-center gap-3.5 rounded-xl border-l-[3px] border-accent-500 bg-surface px-4 py-4 text-left shadow-[0_20px_50px_-24px_rgba(2,22,17,0.28)] dark:bg-surface-secondary'
                        : 'flex w-full items-center gap-3.5 border-b border-stroke-subtle px-4 py-3 text-left transition-colors hover:bg-surface-secondary/60'
                    }
                  >
                    {/* The severity marker is a mini badge, so it keeps the
                        warning colours — the doctrine's petrol is for measures. */}
                    <span
                      aria-hidden
                      className={`h-[2.125rem] w-1.5 shrink-0 rounded-full ${style.bar}`}
                    />
                    {active ? (
                      <motion.span
                        initial={reduced ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="block min-w-0 flex-1"
                      >
                        <span className="block text-body-sm font-bold leading-snug text-fg">{o.label}</span>
                        {/* Statute AND cadence; a placeholder must not appear
                            here — the row is the first place a reader meets
                            the source. */}
                        <span className="mt-1 block text-body-2xs leading-snug text-fg-tertiary">
                          {o.scope === 'placeholder' ? (
                            <span className="italic">
                              {t('compliance.area.fact.noNamedSource', 'No named source yet')}
                            </span>
                          ) : (
                            o.source
                          )}
                          {' · '}
                          {o.appliesFrom && new Date(o.appliesFrom) > new Date()
                            ? t('compliance.area.fromShort', 'from {{date}}', {
                                date: shortDate.format(new Date(o.appliesFrom)),
                              })
                            : t(`markets.cadence.${o.due}`, { defaultValue: o.due }).toLowerCase()}
                        </span>
                      </motion.span>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 text-body-sm font-semibold leading-snug text-fg-secondary">
                          {o.label}
                        </span>
                        <ChevronRight size={15} className="shrink-0 text-fg-tertiary" aria-hidden />
                      </>
                    )}
                    {active && (
                      <RiskBadge level={o.severity} size="sm" className="shrink-0 rounded-full">
                        {t(severityKey(o.severity), SEVERITY_FALLBACK[o.severity])}
                      </RiskBadge>
                    )}
                  </button>
                </motion.li>
                );
              })}
            </ul>
          </div>

          {/* Detail — the dossier cards standing on the Gradient panel. EVERY
              duty's card is mounted, stacked in the same grid cell, and the
              active one fades in over the rest — the RiskShowcase move. The
              panel therefore always keeps the height of the tallest dossier,
              whichever duty is open and whichever filter is set: nothing on
              the page moves when the content grows or shrinks (user ask
              2026-08-28, replacing the AnimatePresence crossfade that let the
              page jump on every swap). The stack reads from `all`, not
              `shown`, so a filter switch cannot change the height either. */}
          <div className="flex min-w-0 flex-1 items-center rounded-xl bg-gradient-stage p-4 sm:p-7">
            <div className="grid w-full">
              {all.map((o) => {
                const active = o.id === selected.id;
                const deferred = !!o.appliesFrom && new Date(o.appliesFrom) > new Date();
                return (
                  <motion.div
                    key={o.id}
                    initial={false}
                    animate={
                      active
                        ? { opacity: 1, y: 0, visibility: 'visible' }
                        : { opacity: 0, y: 10, transitionEnd: { visibility: 'hidden' } }
                    }
                    transition={reduced ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
                    aria-hidden={!active}
                    className={`col-start-1 row-start-1 min-w-0 self-center ${active ? '' : 'pointer-events-none'}`}
                  >
                    <div className="w-full rounded-[14px] bg-surface p-6 shadow-[0_40px_90px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary sm:p-8">
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0">
                          {/* Risk AND when it bites, in one chip. Severity on
                              its own said nothing about whether the reader has
                              to act this quarter or in four years. */}
                          <RiskBadge level={o.severity} size="sm" className="rounded-full">
                            {t('compliance.area.riskWhen', '{{level}} · {{when}}', {
                              level: t(severityKey(o.severity), SEVERITY_FALLBACK[o.severity]),
                              when: deferred
                                ? t('compliance.area.fromShort', 'from {{date}}', {
                                    date: shortDate.format(new Date(o.appliesFrom as string)),
                                  })
                                : t('compliance.area.appliesTodayShort', 'applies today'),
                            })}
                          </RiskBadge>
                          <h3 className="mt-3.5 font-serif text-[1.5rem] font-semibold leading-tight text-fg">
                            {o.label}
                          </h3>
                          <p className="mt-3 max-w-xl text-body-sm leading-relaxed text-fg-secondary">
                            {o.description}
                          </p>
                          {/* Which business models the engine puts this duty
                              on. It used to be a filter bar over the whole
                              list, which is where the measurement said it did
                              not belong: across the eight areas the lists run
                              1 to 7 duties, four of them are unchanged by any
                              model, and on the one list long enough to want
                              filtering two of the four options empty it. Per
                              duty the same data answers a question a reader
                              actually has — does this one apply to me —
                              without a control that mostly does nothing.
                              Omitted when every model is named: "applies to
                              all four" is what the absence of the line already
                              says. */}
                          {o.businessModels.length > 0 &&
                            o.businessModels.length < Object.keys(MODEL_FALLBACK).length && (
                              <p className="mt-3.5 text-body-2xs leading-relaxed text-fg-tertiary">
                                <span className="font-semibold">
                                  {t('compliance.area.appliesToModels', 'Applies to:')}
                                </span>{' '}
                                {o.businessModels
                                  .map((m) => t(`compliance.businessModel.${m}`, MODEL_FALLBACK[m] ?? m))
                                  .join(' · ')}
                              </p>
                            )}
                        </div>
                        {/* The area's own glyph — the canvas puts a drawing
                            here and it is what stops the pane reading as a
                            form. Hidden below desktop, where it would push the
                            prose into a column too narrow to read. Brand, not
                            the severity colour: the icon is presentation, the
                            severity statement is the chip's (colour doctrine
                            2026-08-27). */}
                        {AreaIcon && (
                          <AreaIcon
                            size={64}
                            strokeWidth={1.5}
                            aria-hidden
                            className="hidden shrink-0 text-fg-brand desktop-s:block"
                          />
                        )}
                      </div>

                      <dl className="mt-7 grid gap-px overflow-hidden rounded-xl border border-stroke-subtle bg-stroke-subtle tablet:grid-cols-2">
                        {/* Three states, not two. A placeholder is a string
                            SHAPED like a citation — "National corporate income
                            tax act" — standing where a source belongs. Printed
                            here it sits in the same cell, in the same weight,
                            as "UStG §18i (OSS)", and the page's entire claim
                            is that every duty traces to a named statute. So it
                            is not printed: the cell says there is none.
                            'national-pending' means a national text exists and
                            we hold the EU one; 'eu' means the EU instrument IS
                            the law here and nothing is missing. */}
                        <Fact
                          label={t('compliance.area.fact.source', 'Legal basis')}
                          value={
                            o.scope === 'placeholder'
                              ? t('compliance.area.fact.noNamedSource', 'No named source yet')
                              : o.source
                          }
                          muted={o.scope === 'placeholder'}
                          note={
                            o.marketSpecific
                              ? t('compliance.area.fact.nationalSource', 'National source')
                              : o.scope === 'placeholder'
                                ? t('compliance.area.fact.placeholderNote', {
                                    defaultValue:
                                      'The engine carries no statute for {{market}} here — a gap in our coverage, not in the law.',
                                    market: marketLabel,
                                  })
                                : o.scope === 'national-pending'
                                  ? t('compliance.area.fact.pendingNote', {
                                      defaultValue:
                                        'EU-level source. {{market}} has its own text on top of it, which we do not carry yet.',
                                      market: marketLabel,
                                    })
                                  : t('compliance.area.fact.euDirect', {
                                      defaultValue:
                                        'EU Regulation — applies directly, this is the law here',
                                    })
                          }
                        />
                        <Fact
                          label={t('compliance.area.fact.penalty', 'Penalty range')}
                          value={o.penalty}
                          emphasis
                        />
                        <Fact
                          label={t('compliance.area.fact.cadence', 'Cadence')}
                          value={t(`markets.cadence.${o.due}`, { defaultValue: o.due })}
                          note={
                            o.dueDays != null
                              ? t('markets.country.leadTime', { days: o.dueDays })
                              : undefined
                          }
                        />
                        <Fact
                          label={t('compliance.area.fact.scope', 'Applies in')}
                          // Where the duty applies, not where its source comes
                          // from. Those were conflated: a duty with no source
                          // at all was reporting "EU-wide", which claimed a
                          // scope for something we hold nothing on. The
                          // source's origin is the Rechtsgrundlage cell's
                          // business now.
                          value={
                            selectedCountry === 'EU'
                              ? t('compliance.country.euOption', 'EU-wide')
                              : marketLabel
                          }
                          note={
                            o.appliesFrom
                              ? t('compliance.area.appliesFrom', 'Applies from {{date}}', {
                                  date: dateFmt.format(new Date(o.appliesFrom)),
                                })
                              : t('compliance.area.timeline.liveNow', 'Applies today')
                          }
                        />
                      </dl>

                      {/* The Official Journal reference itself, not a button
                          that says a source exists. The CELEX number IS the
                          citation — a reader who wants to check the duty can
                          quote it without following the link. The canvas also
                          prints a last-verified date here; the engine does not
                          carry one, so it is left out rather than made up. */}
                      {o.eurLexUrl && (
                        <a
                          href={o.eurLexUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 flex items-center gap-3 rounded-lg bg-surface-secondary px-4 py-3.5 text-body-2xs text-fg-tertiary transition-colors hover:text-fg-brand dark:bg-white/[0.04]"
                        >
                          <FileText size={15} className="shrink-0" aria-hidden />
                          <span>
                            {t('compliance.area.sourceInJournal', 'Source in the Official Journal:')}{' '}
                            <span className="font-semibold tabular-nums text-fg">
                              {o.celex ? `CELEX ${o.celex}` : o.source}
                            </span>
                          </span>
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Coverage note — the same honesty MarketPage shows about thin markets. */}
      {/* Plain text, no box. The canvas sets this as a footnote under the card
          and that is what it is — boxed and badged with an icon it read as a
          second piece of content competing with the explorer above it. */}
      <div className="mt-5 max-w-[760px]">
        <Typography variant="caption" className="text-body-xs normal-case tracking-normal leading-relaxed text-fg-tertiary">
          {selectedCountry === 'EU'
            ? t('compliance.area.coverageNoteEu', {
                defaultValue:
                  'The engine carries {{count}} duties for this area, all of them on an EU-level source. Pick a market to see where a national source adds to them.',
                count: all.length,
              })
            : gapCount > 0
              ? t('compliance.area.coverageNoteGaps', {
                  defaultValue:
                    '{{specific}} of {{count}} duties have a source specific to {{market}}. Of the rest, {{gaps}} have a national text we do not carry yet — the others are EU Regulations, which apply here directly.',
                  count: all.length,
                  specific: all.filter((o) => o.marketSpecific).length,
                  gaps: gapCount,
                  market: marketLabel,
                })
              : t('compliance.area.coverageNote', {
                  defaultValue:
                    '{{specific}} of {{count}} duties have a source specific to {{market}}. The rest are EU Regulations — they apply here directly, so there is no national text to hold.',
                  count: all.length,
                  specific: all.filter((o) => o.marketSpecific).length,
                  market: marketLabel,
                })}
        </Typography>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  note,
  emphasis = false,
  muted = false,
}: {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
  /** The value is a statement that there is none — not a citation. */
  muted?: boolean;
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-tertiary">{label}</dt>
      <dd
        className={`mt-2 text-body-sm tabular-nums ${
          muted
            ? 'font-normal italic text-fg-tertiary'
            : `font-semibold ${emphasis ? 'text-risk-on-critical' : 'text-fg'}`
        }`}
      >
        {value}
      </dd>
      {note && <p className="mt-1 text-body-3xs text-fg-tertiary">{note}</p>}
    </div>
  );
}

// A segmented control, not a FilterChip: these three are one choice with three
// states, and the chip's pill shape reads as an independent toggle. The canvas
// draws them square, dark when selected, outlined when not.
function ValiditySegment({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-body-xs font-semibold tabular-nums transition-colors ${
        selected
          ? 'bg-fg text-surface'
          : 'border border-stroke bg-surface text-fg-secondary hover:border-stroke-strong hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}
