import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpDown } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Typography } from '../ui/Typography';
import { RiskBadge } from '../ui/RiskBadge';
import { DOMAIN_BY_SLUG, type DomainSlug } from '../../lib/domains';
import { getAreaObligations, getAreaProfile } from '../../lib/areaProfiles';
import { AREAS } from './areas';
import { SEVERITY_FALLBACK, severityKey } from './severity';
import type { CountryCode } from './types';

type Column = 'risk' | 'time' | 'fine' | 'markets';

interface Props {
  selectedCountry: CountryCode;
}

// ─── Side-by-side · derived, and all eight ───────────────────────────────────
// This table used to hold five hand-written rows: a risk label, a penalty
// range, a market list and a lead time, each authored separately from the
// engine. Two problems, one visible and one not.
//
// The visible one: it disagreed with the risk grid directly above it. Privacy
// read "Critical" here while the engine weighted it 7.6 — high, not critical.
//
// The hidden one: the row ids were the old short ids, so every cell fell back
// to its English default the moment the copy keys moved to the canonical slugs.
// A German reader would have seen an English table and nothing would have
// failed. Deriving the rows removes both failure modes at once, and the table
// covers eight areas instead of five.
export function ComparisonMatrix({ selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const [sortBy, setSortBy] = useState<Column>('risk');

  const localePrefix = locale ? `/${locale}` : '';

  const rows = useMemo(
    () =>
      AREAS.map(({ slug }) => {
        const profile = getAreaProfile(slug);
        const obligations = getAreaObligations(slug, selectedCountry);

        const weight =
          selectedCountry === 'EU'
            ? profile.marketWeights.reduce((s, m) => s + m.weight, 0) / profile.marketWeights.length
            : (profile.marketWeights.find(m => m.code === selectedCountry)?.weight ??
               profile.baselineWeight);

        // Shortest lead time in the area — the first thing that comes due.
        const leadDays = obligations.reduce<number | null>(
          (min, o) => (o.dueDays == null ? min : min == null ? o.dueDays : Math.min(min, o.dueDays)),
          null,
        );

        return {
          slug,
          weight,
          severity: severityFromRiskWeight(weight),
          leadDays,
          exposure: obligations.reduce((sum, o) => sum + (o.penaltyMaxEur ?? 0), 0),
          markets: profile.marketWeights.filter(m => m.obligationCount > 0).length,
          obligations: obligations.length,
        };
      }),
    [selectedCountry],
  );

  const sorted = useMemo(() => {
    const copy = [...rows];
    switch (sortBy) {
      case 'time':
        return copy.sort((a, b) => (a.leadDays ?? 9999) - (b.leadDays ?? 9999));
      case 'fine':
        return copy.sort((a, b) => b.exposure - a.exposure);
      case 'markets':
        return copy.sort((a, b) => b.markets - a.markets);
      default:
        return copy.sort((a, b) => b.weight - a.weight);
    }
  }, [rows, sortBy]);

  const headers: { key: Column; defaultLabel: string }[] = [
    { key: 'risk', defaultLabel: 'Risk' },
    { key: 'time', defaultLabel: 'Time to Act' },
    { key: 'fine', defaultLabel: 'Typical Exposure' },
    { key: 'markets', defaultLabel: 'Active Markets' },
  ];

  const money = (v: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(v);

  const title = (slug: DomainSlug) =>
    t(`compliance.${slug}.title`, DOMAIN_BY_SLUG[slug]?.label ?? slug);

  return (
    <div className="bg-surface border border-stroke rounded-xl overflow-hidden mt-8">
      <div className="px-7 py-5 border-b border-stroke-subtle">
        <Typography variant="h3" weight="bold" className="text-fg">
          {t('compliance.matrix.title', 'Side-by-side: every area at a glance')}
        </Typography>
        <Typography variant="caption" className="text-fg-tertiary normal-case tracking-normal mt-1 block">
          {t(
            'compliance.matrix.body',
            'Quick-scan comparison for researchers and decision-makers. Sort by risk to triage first.',
          )}
        </Typography>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left tabular-nums">
          <thead>
            <tr className="bg-surface-secondary border-b border-stroke-subtle">
              <th className="px-7 py-3 text-xs font-bold uppercase tracking-wider text-fg-tertiary">
                {t('compliance.matrix.area', 'Compliance Area')}
              </th>
              {headers.map(h => (
                <th
                  key={h.key}
                  aria-sort={sortBy === h.key ? 'descending' : 'none'}
                  className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-fg-tertiary"
                >
                  <button
                    type="button"
                    onClick={() => setSortBy(h.key)}
                    className={`inline-flex items-center gap-1 hover:text-fg-brand ${
                      sortBy === h.key ? 'text-fg-brand' : ''
                    }`}
                  >
                    {t(`compliance.matrix.col.${h.key}`, h.defaultLabel)}
                    <ArrowUpDown size={11} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              return (
                <motion.tr
                  key={row.slug}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="border-b border-stroke-subtle last:border-0 hover:bg-brand-light/30"
                >
                  <td className="px-7 py-4">
                    <Link
                      to={`${localePrefix}/compliance/${row.slug}`}
                      className="text-sm font-bold text-fg hover:text-fg-brand"
                    >
                      {title(row.slug)}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <RiskBadge level={row.severity} size="sm">
                      {t(severityKey(row.severity), SEVERITY_FALLBACK[row.severity])}
                    </RiskBadge>
                  </td>
                  <td className="px-5 py-4 text-sm text-fg-secondary">
                    {row.leadDays == null
                      ? '—'
                      : t('markets.country.leadTime', { days: row.leadDays })}
                  </td>
                  <td className="px-5 py-4 text-sm text-fg-secondary">
                    {row.exposure > 0 ? t('compliance.matrix.upTo', { defaultValue: 'up to {{sum}}', sum: money(row.exposure) }) : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-fg-secondary">
                    {t('compliance.matrix.marketsCount', {
                      defaultValue: '{{count}} of {{total}}',
                      count: row.markets,
                      total: getAreaProfile(row.slug).marketWeights.length,
                    })}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-7 py-3 bg-surface-secondary/60 border-t border-stroke-subtle">
        <Typography variant="caption" className="text-fg-tertiary normal-case tracking-normal">
          {t(
            'compliance.matrix.disclaimer',
            'Indicative ranges based on public regulatory references. Final exposure depends on your specific case — assess via the wizard for accurate guidance.',
          )}
        </Typography>
      </div>
    </div>
  );
}
