import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { SEVERITY_STYLE } from './severity';
import { AreaSectionHeading, useAreaEyebrows } from './AreaSectionHeading';
import type { MarketProfile } from '../../lib/marketProfiles';

interface Props {
  profile: MarketProfile;
}

// ─── The market page's spine ─────────────────────────────────────────────────
// The transpose of AreaMarketHeatmap, and the section that carries the whole
// division of labour: every row LINKS to that area's page. This is where the
// market page hands over — it says which areas weigh most here and how much of
// each we hold, and the area page then explains what any single duty requires.
//
// The right-hand column differs from the area page's on purpose. There the
// severity word answers "is 7 out of 10 high here"; here the question a reader
// actually has is "do you hold anything for it", so the column answers that
// and says EU-Quelle where the answer is the EU instrument.
export function MarketWeights({ profile }: Props) {
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';
  const [barsRef, barsInView] = useInViewOnce<HTMLUListElement>();

  const score = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const areaName = (slug: string) =>
    t(`compliance.${slug}.title`, DOMAIN_BY_SLUG[slug as never]?.label ?? slug);

  const counts = useMemo(() => {
    const out = new Map<string, number>();
    for (const g of profile.byDomain) out.set(g.domainSlug, g.items.length);
    return out;
  }, [profile]);

  // Named from the data, not written: the heaviest area against the runner-up,
  // with a separate phrasing when the top is a tie rather than letting the sort
  // order crown one.
  const lead = useMemo(() => {
    const [first, second] = profile.weights;
    if (!first || !second) return null;
    const tied = profile.weights.filter((w) => w.weight === first.weight);
    if (tied.length > 1) {
      return t('markets.country.weightsLeadTied', {
        defaultValue:
          '{{count}} areas weigh equally heavily here ({{weight}} out of 10). Each one leads to its own page.',
        count: tied.length,
        weight: score.format(first.weight),
      });
    }
    return t('markets.country.weightsLead', {
      defaultValue:
        '{{top}} weighs heaviest here — {{topWeight}} out of 10, against {{second}} at {{secondWeight}}. Each area leads to its own page; that is where what a single duty requires is set out.',
      top: areaName(first.domainSlug),
      topWeight: score.format(first.weight),
      second: areaName(second.domainSlug),
      secondWeight: score.format(second.weight),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, t, i18n.language]);

  return (
    <div className="flex flex-col gap-10 desktop-s:flex-row desktop-s:items-start desktop-s:gap-24">
      <AreaSectionHeading
        className="desktop-s:w-[340px] desktop-s:shrink-0"
        eyebrow={eyebrows.weighting}
        title={t('markets.country.weightsTitle', 'What weighs heaviest here')}
        lead={lead}
      />

      <div className="min-w-0 desktop-s:grow">
        <ul
          ref={barsRef}
          className="divide-y divide-stroke-subtle overflow-hidden rounded-xl border border-stroke-subtle bg-surface"
        >
          {profile.weights.map((w, i) => {
            const severity = severityFromRiskWeight(w.weight);
            const style = SEVERITY_STYLE[severity];
            const n = counts.get(w.domainSlug) ?? 0;
            return (
              <li key={w.domainSlug}>
                <Link
                  to={`${localePrefix}/compliance/${w.domainSlug}`}
                  className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-secondary"
                >
                  <span className="w-[11.5rem] shrink-0 text-body-sm font-semibold leading-snug text-fg">
                    {areaName(w.domainSlug)}
                  </span>
                  {/* min-w so the track can never be squeezed out of existence: with
                      flex-1 alone the fixed columns simply took the row and the
                      bars vanished without a warning. */}
                  <span className="h-2 min-w-[3rem] flex-1 overflow-hidden rounded-full bg-surface-tertiary">
                    <span
                      className={`block h-full rounded-full transition-[width] duration-700 ease-out ${style.bar}`}
                      style={{
                        width: barsInView ? `${(w.weight / 10) * 100}%` : 0,
                        transitionDelay: `${i * 60}ms`,
                      }}
                    />
                  </span>
                  <span className="w-[2.75rem] shrink-0 text-right text-body-sm font-bold tabular-nums text-fg">
                    {score.format(w.weight)}
                  </span>
                  {/* Coverage, not severity — see the note on this component. */}
                  <span
                    className={`w-[4.75rem] shrink-0 text-right text-body-2xs tabular-nums ${
                      n > 0 ? 'font-semibold text-fg-brand' : 'text-fg-tertiary'
                    }`}
                  >
                    {n > 0
                      ? t('markets.country.nDuties', {
                          defaultValue_one: '{{count}} duty',
                          defaultValue_other: '{{count}} duties',
                          count: n,
                        })
                      : t('markets.country.euSource', 'EU source')}
                  </span>
                  <ArrowRight
                    size={13}
                    aria-hidden
                    className="shrink-0 text-stroke-strong transition-colors group-hover:text-fg-brand"
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
