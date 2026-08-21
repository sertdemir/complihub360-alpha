import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Gavel } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { getAreaObligations } from '../../lib/areaProfiles';
import type { DomainSlug } from '../../lib/domains';
import type { CountryCode } from './types';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

// ─── Enforcement · what non-compliance costs ─────────────────────────────────
// The penalty phrasings come from the enrichment map, which carries them per
// market. The aggregate below is a SUM of the stated upper bounds, not a
// prediction: it answers "if every duty here went wrong at once, what is the
// ceiling the sources name". Framing it as a ceiling rather than an expectation
// is the difference between informing and scaremongering, and the brand voice
// does not permit the second.
export function AreaEnforcement({ slug, selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const obligations = useMemo(() => getAreaObligations(slug, selectedCountry), [slug, selectedCountry]);

  const withPenalty = obligations.filter(o => o.penalty);
  if (withPenalty.length === 0) return null;

  const ceiling = withPenalty.reduce((sum, o) => sum + (o.penaltyMaxEur ?? 0), 0);
  // Who enforces is the one thing the enrichment map does not carry — it holds
  // the penalty, not the regulator. So this stays editorial, and it is a list
  // across all our markets rather than for the selected one. Labelling it
  // "Enforced by" under a heading that says "as the sources for Spain state it"
  // read as though Spain were policed by BZSt and HMRC; the label now says what
  // the list actually is.
  const authorities = t(`compliance.${slug}.fines.authorities`, '');
  const marketLabel =
    selectedCountry === 'EU'
      ? t('compliance.country.euOption', 'EU-wide')
      : t(`markets.countries.${selectedCountry}`, { defaultValue: selectedCountry });

  return (
    <div>
      <Typography variant="h2" as="h2" weight="bold" className="text-fg">
        {t('compliance.area.enforcementTitle', "What's at stake")}
      </Typography>
      <Typography variant="body" className="mt-2 max-w-2xl text-fg-secondary">
        {t('compliance.area.enforcementLead', {
          defaultValue: 'Penalty exposure as the sources for {{market}} state it.',
          market: marketLabel,
        })}
      </Typography>

      {ceiling > 0 && (
        <div className="mt-6 rounded-2xl border border-risk-critical/20 bg-risk-critical-bg/40 p-6">
          <div className="flex items-center gap-2">
            <Gavel size={14} className="text-risk-on-critical" />
            <Typography
              variant="caption"
              className="font-semibold uppercase tracking-wider text-risk-on-critical"
            >
              {t('compliance.area.ceilingLabel', 'Combined upper bound')}
            </Typography>
          </div>
          <Typography variant="display" as="p" weight="bold" className="mt-2 text-fg tabular-nums">
            {new Intl.NumberFormat(undefined, {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            }).format(ceiling)}
          </Typography>
          <Typography variant="caption" className="mt-2 block normal-case tracking-normal leading-relaxed text-fg-secondary">
            {t('compliance.area.ceilingNote', {
              defaultValue:
                'The sum of the maximum penalties named across {{count}} duties. A ceiling if everything went wrong at once, not a forecast.',
              count: withPenalty.length,
            })}
          </Typography>
        </div>
      )}

      {authorities && (
        <Typography variant="caption" className="mt-6 block normal-case tracking-normal text-fg-secondary">
          <span className="text-fg-tertiary">
            {t('compliance.area.regulatorsLabel', 'Regulators across the markets we cover:')}{' '}
          </span>
          <span className="font-semibold">{authorities}</span>
        </Typography>
      )}

      <ul className="mt-4 divide-y divide-stroke-subtle rounded-xl border border-stroke-subtle bg-surface">
        {withPenalty.map(o => (
          <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4">
            <span className="text-body-sm font-semibold text-fg">{o.label}</span>
            <span className="text-body-xs text-fg-secondary">{o.penalty}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
