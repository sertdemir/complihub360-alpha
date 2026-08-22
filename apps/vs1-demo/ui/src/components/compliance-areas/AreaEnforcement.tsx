import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Gavel } from 'lucide-react';
import { useCountUp } from '../../lib/useCountUp';
import { useInViewOnce } from '../../lib/useInViewOnce';
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
//
// This is the only section on the page that goes dark, and that is the point:
// a page that shouts everywhere shouts nowhere. The petrol band is spent here
// and nowhere else, so the one place a reader's eye stops is the one place the
// stakes are stated.
export function AreaEnforcement({ slug, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  const obligations = useMemo(() => getAreaObligations(slug, selectedCountry), [slug, selectedCountry]);

  const withPenalty = obligations.filter((o) => o.penalty);
  const ceiling = withPenalty.reduce((sum, o) => sum + (o.penaltyMaxEur ?? 0), 0);

  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  // The ceiling counts up rather than appearing, for the same reason the bars
  // grow: a number that lands has been watched, a number that is already there
  // has been skipped. useCountUp snaps instantly under prefers-reduced-motion.
  const counted = useCountUp(inView ? ceiling : 0, 1100);

  if (withPenalty.length === 0) return null;

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
  const money = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  return (
    <div ref={ref} className="grid gap-10 desktop-s:grid-cols-12 desktop-s:gap-14">
      <div className="desktop-s:col-span-5">
        <p className="inline-flex items-center gap-2 text-body-3xs font-bold uppercase tracking-[0.14em] text-primary-300">
          <Gavel size={13} />
          {t('compliance.area.enforcementTitle', "What's at stake")}
        </p>

        {ceiling > 0 && (
          <>
            <p className="mt-5 font-serif text-[2.75rem] font-semibold leading-none tracking-tight text-white tabular-nums desktop-s:text-[3.25rem]">
              {money.format(Math.round(counted))}
            </p>
            <p className="mt-3 text-body-sm font-semibold text-primary-100">
              {t('compliance.area.ceilingLabel', 'Combined upper bound')}
            </p>
            <p className="mt-2 max-w-md text-body-2xs leading-relaxed text-primary-200">
              {t('compliance.area.ceilingNote', {
                defaultValue:
                  'The sum of the maximum penalties named across {{count}} duties. A ceiling if everything went wrong at once, not a forecast.',
                count: withPenalty.length,
              })}
            </p>
          </>
        )}

        <p className="mt-6 max-w-md text-body-2xs leading-relaxed text-primary-200">
          {t('compliance.area.enforcementLead', {
            defaultValue: 'Penalty exposure as the sources for {{market}} state it.',
            market: marketLabel,
          })}
        </p>

        {authorities && (
          <p className="mt-5 max-w-md text-body-2xs leading-relaxed text-primary-200">
            {t('compliance.area.regulatorsLabel', 'Regulators across the markets we cover:')}{' '}
            <span className="font-semibold text-primary-100">{authorities}</span>
          </p>
        )}
      </div>

      <ul className="divide-y divide-white/10 desktop-s:col-span-7">
        {withPenalty.map((o) => (
          <li
            key={o.id}
            className="grid gap-x-6 gap-y-1 py-4 first:pt-0 tablet:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]"
          >
            <span className="text-body-sm font-semibold text-white">{o.label}</span>
            <span className="text-body-xs leading-relaxed text-primary-200 tabular-nums tablet:text-right">
              {o.penalty}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
