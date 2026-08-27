import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Typography } from '../ui/Typography';
import { RiskBadge } from '../ui/RiskBadge';
import { getAreaProfile } from '../../lib/areaProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import type { DomainSlug } from '../../lib/domains';
import { SEVERITY_FALLBACK, severityKey } from './severity';
import type { CountryCode } from './types';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';

interface Props {
  slug: DomainSlug;
  selectedCountry: CountryCode;
}

// ─── The market comparison (canvas "Markt-Heatmap" · Variante B, 2026-08-28) ─
// The transpose of the weights list on a market page: there, one country across
// eight areas; here, one area across eight countries. Each row still links back
// to that market, which is what turns two standalone page types into a grid a
// reader can traverse.
//
// The ranked list now stands as a white card on the Gradient panel — the house
// text-image pair, copy left with the coverage note under a hairline, the
// comparison right. And the bars finally obey the colour doctrine: petrol in
// two weights measures, the RiskBadge at the row's end warns — a bar in the
// severity's colour asserted twice what the badge already says. The selected
// market's row carries the gold edge, the atlas's mark for "you are here".
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

  // The rows navigate, and the lead says so — an arrow that only appears on
  // hover is not something a reader can be assumed to have met.
  const leadText = [lead, t('compliance.area.marketsRowsNote', 'Every row leads to the market page.')]
    .filter(Boolean)
    .join(' ');

  return (
    // row-reverse on desktop (user ask 2026-08-28): the card stands left and
    // the copy right, trading places with the thread section above so the
    // page keeps alternating sides. The DOM order stays copy-first so mobile
    // leads with the heading.
    <div className="flex flex-col gap-10 desktop-s:flex-row-reverse desktop-s:items-center desktop-s:gap-14">
      <div className="shrink-0 desktop-s:w-[380px]">
        <AreaSectionHeading
          eyebrow={eyebrows.markets}
          title={t('compliance.area.marketsTitle', 'The same area, eight weights')}
          lead={leadText}
        />
        {/* Where the engine actually holds a national source, said once for
            the whole comparison — under the copy, where it reads as a caveat
            about the data instead of a fifth column. */}
        <Typography
          variant="caption"
          className="mt-6 block border-t border-stroke-subtle pt-4 text-body-xs normal-case leading-relaxed tracking-normal text-fg-tertiary"
        >
          {t('compliance.area.localSourcesNote', {
            defaultValue:
              'The engine holds at least one local source for this area in {{count}} of the {{total}} markets. Elsewhere the EU-level instrument is what applies, and it is shown as such.',
            count: withLocal,
            total: marketWeights.length,
          })}
        </Typography>
      </div>

      <div className="min-w-0 flex-1 rounded-xl bg-gradient-stage p-5 sm:p-7 desktop-s:p-8">
        <ul
          ref={barsRef}
          className="divide-y divide-stroke-subtle overflow-hidden rounded-xl bg-surface shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary"
        >
          {marketWeights.map((m, i) => {
            const severity = severityFromRiskWeight(m.weight);
            const selected = m.code === selectedCountry;
            return (
              <li key={m.code}>
                <Link
                  to={`${localePrefix}/markets/${m.code.toLowerCase()}`}
                  className={`group flex items-center gap-4 py-3 pr-6 transition-colors sm:gap-5 ${
                    selected
                      ? 'border-l-[3px] border-accent-500 bg-brand-light/50 pl-[calc(1.5rem-3px)] dark:bg-white/[0.05]'
                      : 'pl-6 hover:bg-surface-secondary dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <span
                    className={`w-[8.125rem] shrink-0 text-body-sm leading-snug ${
                      selected ? 'font-bold text-fg-brand' : 'font-semibold text-fg'
                    }`}
                  >
                    {marketName(m.code)}
                  </span>
                  {/* Petrol measures (doctrine 2026-08-27): high and up full,
                      medium and low the lighter weight — the warning is the
                      badge's job. On the selected row the track goes white so
                      the bar keeps its contrast against the tint behind it. */}
                  <span
                    className={`h-1.5 flex-1 overflow-hidden rounded-full ${
                      selected ? 'bg-surface dark:bg-white/10' : 'bg-brand/10'
                    }`}
                  >
                    <span
                      className={`block h-full rounded-full transition-[width] duration-700 ease-out ${
                        severity === 'medium' || severity === 'low' ? 'bg-brand/45' : 'bg-brand'
                      }`}
                      style={{
                        width: barsInView ? `${(m.weight / 10) * 100}%` : 0,
                        transitionDelay: `${i * 60}ms`,
                      }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right text-body-sm font-bold tabular-nums text-fg">
                    {score.format(m.weight)}
                  </span>
                  <span className="w-[4.75rem] shrink-0 text-center">
                    <RiskBadge level={severity} size="sm" className="rounded-full">
                      {t(severityKey(severity), SEVERITY_FALLBACK[severity])}
                    </RiskBadge>
                  </span>
                  {/* Shown on focus as well as hover — a keyboard user needs
                      to know the row goes somewhere too. */}
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
      </div>
    </div>
  );
}
