import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowUpDown } from 'lucide-react';
import { Typography } from '../ui/Typography';
import type { AreaKey } from './types';

type Column = 'risk' | 'time' | 'fine' | 'markets' | 'effort';

interface Row {
  id: AreaKey;
  titleDefault: string;
  riskRank: number;
  riskLabel: string;
  riskColor: string;
  timeDefault: string;
  fineDefault: string;
  marketsDefault: string;
  effortDefault: string;
}

const ROWS: Row[] = [
  {
    id: 'privacy',
    titleDefault: 'Data & Privacy',
    riskRank: 4,
    riskLabel: 'Critical',
    riskColor: 'bg-error-100 text-error-700 border-error-200',
    timeDefault: 'Immediate',
    fineDefault: 'up to €20M / 4% global revenue',
    marketsDefault: 'EU · UK · CH · US',
    effortDefault: 'High',
  },
  {
    id: 'tax',
    titleDefault: 'Tax & VAT',
    riskRank: 3,
    riskLabel: 'High',
    riskColor: 'bg-error-50 text-error-600 border-error-200',
    timeDefault: 'Within 30 days of threshold',
    fineDefault: '50–300% of evaded tax + interest',
    marketsDefault: 'EU OSS · UK · US Nexus',
    effortDefault: 'Medium',
  },
  {
    id: 'epr',
    titleDefault: 'EPR & Packaging',
    riskRank: 3,
    riskLabel: 'High',
    riskColor: 'bg-warning-bg text-warning-text border-warning-text/30',
    timeDefault: 'Before market entry',
    fineDefault: 'up to 2% annual revenue',
    marketsDefault: 'DE · FR · IT · ES · UK',
    effortDefault: 'Medium',
  },
  {
    id: 'marketing',
    titleDefault: 'Marketing Compliance',
    riskRank: 2,
    riskLabel: 'Medium',
    riskColor: 'bg-warning-bg text-warning-text border-warning-text/30',
    timeDefault: 'Pre-campaign launch',
    fineDefault: '€5k–€500k + product withdrawal',
    marketsDefault: 'EU · UK',
    effortDefault: 'Low–Medium',
  },
  {
    id: 'corporate',
    titleDefault: 'Corporate Structure',
    riskRank: 2,
    riskLabel: 'Medium',
    riskColor: 'bg-primary-50 text-primary-700 border-primary-200',
    timeDefault: 'Strategic (3–12 months)',
    fineDefault: 'Tax exposure + entity risk',
    marketsDefault: 'EU · UK · US · CH',
    effortDefault: 'High',
  },
];

export function ComparisonMatrix() {
  const { t } = useTranslation('common');
  const [sortBy, setSortBy] = useState<Column>('risk');

  const sorted = useMemo(() => {
    const copy = [...ROWS];
    if (sortBy === 'risk') copy.sort((a, b) => b.riskRank - a.riskRank);
    return copy;
  }, [sortBy]);

  const headers: { key: Column; defaultLabel: string; sortable?: boolean }[] = [
    { key: 'risk', defaultLabel: 'Risk', sortable: true },
    { key: 'time', defaultLabel: 'Time to Act' },
    { key: 'fine', defaultLabel: 'Typical Exposure' },
    { key: 'markets', defaultLabel: 'Active Markets' },
    { key: 'effort', defaultLabel: 'Effort' },
  ];

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden mt-8">
      <div className="px-7 py-5 border-b border-neutral-100">
        <Typography variant="h3" weight="bold" className="text-neutral-900">
          {t('compliance.matrix.title', 'Side-by-side: every area at a glance')}
        </Typography>
        <Typography variant="caption" className="text-neutral-500 normal-case tracking-normal mt-1 block">
          {t(
            'compliance.matrix.body',
            'Quick-scan comparison for researchers and decision-makers. Sort by risk to triage first.',
          )}
        </Typography>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left tabular-nums">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="px-7 py-3 text-xs font-bold uppercase tracking-wider text-neutral-500">
                {t('compliance.matrix.area', 'Compliance Area')}
              </th>
              {headers.map(h => (
                <th
                  key={h.key}
                  className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-neutral-500"
                >
                  {h.sortable ? (
                    <button
                      type="button"
                      onClick={() => setSortBy(h.key)}
                      className="inline-flex items-center gap-1 hover:text-primary-600"
                    >
                      {t(`compliance.matrix.col.${h.key}`, h.defaultLabel)}
                      <ArrowUpDown size={11} />
                    </button>
                  ) : (
                    t(`compliance.matrix.col.${h.key}`, h.defaultLabel)
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="border-b border-neutral-100 last:border-0 hover:bg-primary-50/30"
              >
                <td className="px-7 py-4">
                  <span className="font-bold text-neutral-900 text-sm">
                    {t(`compliance.${row.id}.title`, row.titleDefault)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-md border ${row.riskColor}`}
                  >
                    {t(`compliance.matrix.${row.id}.risk`, row.riskLabel)}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-neutral-700">
                  {t(`compliance.matrix.${row.id}.time`, row.timeDefault)}
                </td>
                <td className="px-5 py-4 text-sm text-neutral-700">
                  {t(`compliance.matrix.${row.id}.fine`, row.fineDefault)}
                </td>
                <td className="px-5 py-4 text-sm text-neutral-700">
                  {t(`compliance.matrix.${row.id}.markets`, row.marketsDefault)}
                </td>
                <td className="px-5 py-4 text-sm text-neutral-700">
                  {t(`compliance.matrix.${row.id}.effort`, row.effortDefault)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-7 py-3 bg-neutral-50/60 border-t border-neutral-100">
        <Typography variant="caption" className="text-neutral-400 normal-case tracking-normal">
          {t(
            'compliance.matrix.disclaimer',
            'Indicative ranges based on public regulatory references. Final exposure depends on your specific case — assess via the wizard for accurate guidance.',
          )}
        </Typography>
      </div>
    </div>
  );
}
