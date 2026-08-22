import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessModel } from '@complihub/compliance-engine';
import { ExternalLink, Info } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { FilterChip } from '../ui/Badge';
import { RiskBadge } from '../ui/RiskBadge';
import { getAreaObligations, type AreaObligation } from '../../lib/areaProfiles';
import type { DomainSlug } from '../../lib/domains';
import { SEVERITY_FALLBACK, SEVERITY_STYLE, severityKey } from './severity';
import type { CountryCode } from './types';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

const MODELS: { value: BusinessModel; fallback: string }[] = [
  { value: BusinessModel.DTC, fallback: 'Direct-to-consumer' },
  { value: BusinessModel.MARKETPLACE_SELLER, fallback: 'Marketplace seller' },
  { value: BusinessModel.SAAS_SUBSCRIPTION, fallback: 'SaaS / subscription' },
  { value: BusinessModel.AGENCY, fallback: 'Agency / services' },
];

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
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' });
  const [model, setModel] = useState<BusinessModel | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = useMemo(() => getAreaObligations(slug, selectedCountry), [slug, selectedCountry]);
  const shown = model ? all.filter((o) => o.businessModels.includes(model)) : all;

  // Changing area, market or filter can strip the duty that was open. Falling
  // back to the first row keeps the pane populated instead of blanking it.
  const selected: AreaObligation | undefined =
    shown.find((o) => o.id === selectedId) ?? shown[0];
  useEffect(() => {
    setSelectedId(null);
  }, [slug, selectedCountry, model]);

  const marketLabel =
    selectedCountry === 'EU'
      ? t('compliance.country.euOption', 'EU-wide')
      : t(`markets.countries.${selectedCountry}`, { defaultValue: selectedCountry });

  return (
    <div>
      <Typography variant="h2" as="h2" weight="bold" className="text-fg">
        {t('compliance.area.obligationsTitle', 'What this area actually requires')}
      </Typography>
      <Typography variant="body" className="mt-2 max-w-2xl text-fg-secondary">
        {t('compliance.area.obligationsLead', {
          defaultValue:
            'Every duty below traces to a named statute. Switch market to see the source that applies there.',
        })}
      </Typography>

      {/* Business-model filter */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-body-3xs font-semibold uppercase tracking-wider text-fg-tertiary">
          {t('compliance.area.modelFilter', 'I run a')}
        </span>
        <FilterChip selected={model === null} onClick={() => setModel(null)}>
          {t('compliance.area.modelAll', 'Any business')}
        </FilterChip>
        {MODELS.map((m) => (
          <FilterChip
            key={m.value}
            selected={model === m.value}
            onClick={() => setModel(model === m.value ? null : m.value)}
          >
            {t(`compliance.businessModel.${m.value}`, m.fallback)}
          </FilterChip>
        ))}
      </div>

      {shown.length === 0 || !selected ? (
        <div className="mt-6 rounded-xl border border-stroke-subtle bg-surface p-6">
          <Typography variant="body" className="text-fg-secondary">
            {t('compliance.area.noneForModel', {
              defaultValue:
                'The engine carries no duty in this area for that business model. That is a genuine gap in coverage, not a clean bill of health.',
            })}
          </Typography>
        </div>
      ) : (
        <div className="mt-8 grid overflow-hidden rounded-xl border border-stroke-subtle bg-surface desktop-s:grid-cols-[minmax(0,21rem)_1fr]">
          {/* Master */}
          <ul className="divide-y divide-stroke-subtle border-b border-stroke-subtle desktop-s:border-b-0 desktop-s:border-r">
            {shown.map((o) => {
              const active = o.id === selected.id;
              const style = SEVERITY_STYLE[o.severity];
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(o.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors ${
                      active ? 'bg-brand-light/50' : 'hover:bg-surface-secondary'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 h-9 w-1 shrink-0 rounded-full ${style.bar}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-body-sm font-bold leading-snug ${
                          active ? 'text-fg-brand' : 'text-fg'
                        }`}
                      >
                        {o.label}
                      </span>
                      <span className="mt-0.5 block truncate text-body-2xs text-fg-tertiary">
                        {o.source}
                      </span>
                    </span>
                    <RiskBadge level={o.severity} size="sm" className="shrink-0">
                      {t(severityKey(o.severity), SEVERITY_FALLBACK[o.severity])}
                    </RiskBadge>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Detail */}
          <div className="p-6 desktop-s:p-8">
            <RiskBadge level={selected.severity} size="sm">
              {t(severityKey(selected.severity), SEVERITY_FALLBACK[selected.severity])}
            </RiskBadge>
            <h3 className="mt-4 font-serif text-[1.5rem] font-semibold leading-tight text-fg">
              {selected.label}
            </h3>
            <p className="mt-3 max-w-xl text-body-sm leading-relaxed text-fg-secondary">
              {selected.description}
            </p>

            <dl className="mt-7 grid gap-px overflow-hidden rounded-xl border border-stroke-subtle bg-stroke-subtle tablet:grid-cols-2">
              <Fact
                label={t('compliance.area.fact.source', 'Legal basis')}
                value={selected.source}
                note={
                  selected.marketSpecific
                    ? t('compliance.area.fact.nationalSource', 'National source')
                    : t('compliance.area.euWideSource', 'EU-wide source')
                }
              />
              <Fact
                label={t('compliance.area.fact.penalty', 'Penalty range')}
                value={selected.penalty}
                emphasis
              />
              <Fact
                label={t('compliance.area.fact.cadence', 'Cadence')}
                value={t(`markets.cadence.${selected.due}`, { defaultValue: selected.due })}
                note={
                  selected.dueDays != null
                    ? t('markets.country.leadTime', { days: selected.dueDays })
                    : undefined
                }
              />
              <Fact
                label={t('compliance.area.fact.scope', 'Applies in')}
                value={selected.marketSpecific ? marketLabel : t('compliance.country.euOption', 'EU-wide')}
                note={
                  selected.appliesFrom
                    ? t('compliance.area.appliesFrom', 'Applies from {{date}}', {
                        date: dateFmt.format(new Date(selected.appliesFrom)),
                      })
                    : t('compliance.area.timeline.liveNow', 'Applies today')
                }
              />
            </dl>

            {selected.eurLexUrl && (
              <a
                href={selected.eurLexUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-surface-secondary px-4 py-3 text-body-2xs text-fg-secondary transition-colors hover:text-fg-brand"
              >
                {t('compliance.area.readSource', 'Read the source on EUR-Lex')}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Coverage note — the same honesty MarketPage shows about thin markets. */}
      <div className="mt-6 flex items-start gap-2 rounded-xl border border-stroke-subtle bg-surface px-4 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-fg-tertiary" />
        <Typography variant="caption" className="normal-case tracking-normal leading-relaxed text-fg-tertiary">
          {selectedCountry === 'EU'
            ? t('compliance.area.coverageNoteEu', {
                defaultValue:
                  'The engine carries {{count}} duties for this area, all of them on an EU-level source. Pick a market to see where a national source adds to them.',
                count: all.length,
              })
            : t('compliance.area.coverageNote', {
                defaultValue:
                  'The engine carries {{count}} duties for this area, {{specific}} of them with a source specific to {{market}}. Coverage is uneven by market and grows as sources are verified.',
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
}: {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-tertiary">{label}</dt>
      <dd
        className={`mt-2 text-body-sm font-semibold tabular-nums ${
          emphasis ? 'text-risk-on-critical' : 'text-fg'
        }`}
      >
        {value}
      </dd>
      {note && <p className="mt-1 text-body-3xs text-fg-tertiary">{note}</p>}
    </div>
  );
}
