import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessModel } from '@complihub/compliance-engine';
import { ExternalLink, ScrollText, CalendarClock, Info } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { FilterChip } from '../ui/Badge';
import { RiskBadge } from '../ui/RiskBadge';
import { getAreaObligations } from '../../lib/areaProfiles';
import type { DomainSlug } from '../../lib/domains';
import { SEVERITY_FALLBACK, severityKey } from './severity';
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
// Two filters, both honest about what they do. The business-model filter uses
// the engine's own applicableBusinessModels — it narrows, it never invents a
// duty. The market comes from the page-level selector and switches the statute,
// penalty and cadence to that jurisdiction.
//
// Where the engine holds no national source, the EU-level entry is shown and
// labelled EU-wide rather than dressed up as a local one. That distinction is
// the whole reason a reader can trust the rest of the row.
export function ObligationsExplorer({ slug, selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const [model, setModel] = useState<BusinessModel | null>(null);

  const all = useMemo(() => getAreaObligations(slug, selectedCountry), [slug, selectedCountry]);
  const shown = model ? all.filter(o => o.businessModels.includes(model)) : all;

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
        {MODELS.map(m => (
          <FilterChip
            key={m.value}
            selected={model === m.value}
            onClick={() => setModel(model === m.value ? null : m.value)}
          >
            {t(`compliance.businessModel.${m.value}`, m.fallback)}
          </FilterChip>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-xl border border-stroke-subtle bg-surface-secondary p-6">
          <Typography variant="body" className="text-fg-secondary">
            {t('compliance.area.noneForModel', {
              defaultValue:
                'The engine carries no duty in this area for that business model. That is a genuine gap in coverage, not a clean bill of health.',
            })}
          </Typography>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {shown.map(o => {
            return (
              <li key={o.id} className="rounded-xl border border-stroke-subtle bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Typography variant="ui-small" weight="bold" className="text-fg">
                      {o.label}
                    </Typography>
                    <Typography variant="caption" className="mt-1 block normal-case tracking-normal leading-relaxed text-fg-secondary">
                      {o.description}
                    </Typography>
                  </div>
                  <RiskBadge level={o.severity} size="sm" className="shrink-0">
                    {t(severityKey(o.severity), SEVERITY_FALLBACK[o.severity])}
                  </RiskBadge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="inline-flex items-center gap-1.5 text-body-2xs text-fg-secondary">
                    <ScrollText size={12} className="text-fg-tertiary" />
                    {o.source}
                    {o.eurLexUrl && (
                      <a
                        href={o.eurLexUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-fg-brand underline decoration-dotted underline-offset-2 hover:decoration-solid"
                      >
                        EUR-Lex <ExternalLink size={10} />
                      </a>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-body-2xs text-fg-tertiary">
                    <CalendarClock size={12} />
                    {t(`markets.cadence.${o.due}`, { defaultValue: o.due })}
                    {o.dueDays != null && ` · ${t('markets.country.leadTime', { days: o.dueDays })}`}
                  </span>
                  {!o.marketSpecific && (
                    <span className="rounded-md bg-surface-secondary px-2 py-0.5 text-body-3xs font-semibold text-fg-tertiary">
                      {t('compliance.area.euWideSource', 'EU-wide source')}
                    </span>
                  )}
                  {o.appliesFrom && (
                    <span className="rounded-md bg-warning-bg px-2 py-0.5 text-body-3xs font-semibold text-warning-text">
                      {t('compliance.area.appliesFrom', 'Applies from {{date}}', { date: o.appliesFrom })}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Coverage note — the same honesty MarketPage shows about thin markets. */}
      <div className="mt-6 flex items-start gap-2 rounded-xl border border-stroke-subtle bg-surface-secondary px-4 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-fg-tertiary" />
        <Typography variant="caption" className="normal-case tracking-normal leading-relaxed text-fg-tertiary">
          {t('compliance.area.coverageNote', {
            defaultValue:
              'The engine carries {{count}} duties for this area, {{specific}} of them with a source specific to {{market}}. Coverage is uneven by market and grows as sources are verified.',
            count: all.length,
            specific: all.filter(o => o.marketSpecific).length,
            market: marketLabel,
          })}
        </Typography>
      </div>
    </div>
  );
}
