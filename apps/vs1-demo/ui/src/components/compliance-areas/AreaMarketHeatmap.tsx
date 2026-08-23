import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Typography } from '../ui/Typography';
import { getAreaProfile } from '../../lib/areaProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import type { DomainSlug } from '../../lib/domains';
import { SEVERITY_FALLBACK, SEVERITY_STYLE, severityKey } from './severity';
import type { CountryCode } from './types';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

// ─── The market comparison ───────────────────────────────────────────────────
// The transpose of the weights list on a market page: there, one country across
// eight areas; here, one area across eight countries. Each row still links back
// to that market, which is what turns two standalone page types into a grid a
// reader can traverse — the canvas draws the rows static, but a row that
// navigates and does not say so is worse than an arrow.
//
// The rows carry the severity WORD rather than a count of local sources. Both
// are true, but only one of them is what the column of bars is asking: a bar at
// 70% means nothing until you know whether seven out of ten is "high" here. The
// coverage count moved under the card, aggregated, where it reads as a caveat
// about the data instead of a fifth column competing with the comparison.
export function AreaMarketHeatmap({ slug, selectedCountry }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';
  const { marketWeights } = getAreaProfile(slug);
  const [barsRef, barsInView] = useInViewOnce<HTMLUListElement>();

  const score = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const marketName = (code: CountryCode) =>
    t(`markets.countries.${code}`, { defaultValue: code });

  // The lead the canvas writes by hand — "France weights packaging more
  // strictly than Germany, so whoever serves both plans for France" — derived
  // instead, because the same sentence has to hold for eight areas and four
  // languages. Ties are called ties rather than resolved by sort order.
  const lead = useMemo(() => {
    if (marketWeights.length < 2) return null;
    const [first, second] = marketWeights;
    const tied = marketWeights.filter((m) => m.weight === first.weight);
    if (tied.length > 1) {
      return t('compliance.area.marketsLeadTied', {
        defaultValue:
          '{{count}} markets weight this area equally heavily ({{weight}} out of 10). Serving more than one means planning to the strictest of them.',
        count: tied.length,
        weight: score.format(first.weight),
      });
    }
    return t('compliance.area.marketsLead', {
      defaultValue:
        '{{top}} weights this area most heavily — {{topWeight}} out of 10, against {{second}} at {{secondWeight}}. Whoever serves both plans to {{top}}.',
      top: marketName(first.code),
      topWeight: score.format(first.weight),
      second: marketName(second.code),
      secondWeight: score.format(second.weight),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketWeights, t, i18n.language]);

  const withLocal = marketWeights.filter((m) => m.obligationCount > 0).length;

  return (
    <div className="flex flex-col gap-10 desktop-s:flex-row desktop-s:items-start desktop-s:gap-24">
      <AreaSectionHeading
        className="desktop-s:w-[340px] desktop-s:shrink-0"
        eyebrow={eyebrows.markets}
        title={t('compliance.area.marketsTitle', 'The same area, eight weights')}
        lead={lead}
      />

      <div className="min-w-0 desktop-s:grow">
        <ul
          ref={barsRef}
          className="divide-y divide-stroke-subtle overflow-hidden rounded-xl border border-stroke-subtle bg-surface"
        >
          {marketWeights.map((m, i) => {
            const severity = severityFromRiskWeight(m.weight);
            const style = SEVERITY_STYLE[severity];
            const selected = m.code === selectedCountry;
            return (
              <li key={m.code}>
                <Link
                  to={`${localePrefix}/markets/${m.code.toLowerCase()}`}
                  className={`group flex items-center gap-5 px-6 py-3.5 transition-colors ${
                    selected ? 'bg-brand-light/50' : 'hover:bg-surface-secondary'
                  }`}
                >
                  <span
                    className={`w-[8.125rem] shrink-0 text-body-sm leading-snug ${
                      selected ? 'font-bold text-fg-brand' : 'font-semibold text-fg'
                    }`}
                  >
                    {marketName(m.code)}
                  </span>
                  {/* On the selected row the track goes white, so the bar keeps
                      its contrast against the petrol tint behind it. */}
                  <span
                    className={`h-2 flex-1 overflow-hidden rounded-full ${
                      selected ? 'bg-surface' : 'bg-surface-tertiary'
                    }`}
                  >
                    <span
                      className={`block h-full rounded-full transition-[width] duration-700 ease-out ${style.bar}`}
                      style={{
                        width: barsInView ? `${(m.weight / 10) * 100}%` : 0,
                        transitionDelay: `${i * 60}ms`,
                      }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-body-sm font-bold tabular-nums text-fg">
                    {score.format(m.weight)}
                  </span>
                  <span
                    className={`w-[4.625rem] shrink-0 text-right text-body-2xs font-bold ${style.iconColor}`}
                  >
                    {t(severityKey(severity), SEVERITY_FALLBACK[severity])}
                  </span>
                  {/* The affordance the canvas has no need for. Held at zero
                      opacity so the row reads as drawn until it is reached,
                      and shown on focus as well as hover — a keyboard user
                      needs to know the row goes somewhere too. */}
                  <ArrowRight
                    size={13}
                    aria-hidden
                    className="shrink-0 text-fg-tertiary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Where the engine actually holds a national source, said once for the
            whole table rather than repeated on every row. */}
        <Typography
          variant="caption"
          className="mt-4 block text-body-xs normal-case leading-relaxed tracking-normal text-fg-tertiary"
        >
          {t('compliance.area.localSourcesNote', {
            defaultValue:
              'The engine holds at least one local source for this area in {{count}} of the {{total}} markets. Elsewhere the EU-level instrument is what applies, and it is shown as such.',
            count: withLocal,
            total: marketWeights.length,
          })}
        </Typography>
      </div>
    </div>
  );
}
