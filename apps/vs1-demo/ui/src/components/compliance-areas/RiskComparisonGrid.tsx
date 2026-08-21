import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import { Info } from 'lucide-react';
import { Typography } from '../ui/Typography';
import type { AreaConfig, CountryCode } from './types';

interface Props {
  areas: AreaConfig[];
  selectedCountry: CountryCode;
}

const COUNTRY_HINTS: Partial<Record<CountryCode, { highlightId: string; messageDefault: string }>> = {
  DE: {
    highlightId: 'privacy',
    messageDefault: 'In Germany, BfDI enforcement and VerpackG together raise the priority of Privacy and EPR.',
  },
  FR: {
    highlightId: 'privacy',
    messageDefault: 'France: CNIL has been the most active EU enforcer of GDPR in recent years — Privacy ranks first.',
  },
  IT: {
    highlightId: 'tax',
    messageDefault: 'Italy: Garante on Privacy plus complex VAT regime mean Tax & Privacy demand parallel attention.',
  },
  ES: {
    highlightId: 'tax',
    messageDefault: 'Spain: AEAT (tax) and AEPD (privacy) both publish enforcement bulletins quarterly.',
  },
  UK: {
    highlightId: 'privacy',
    messageDefault: 'UK: ICO (privacy) and HMRC (VAT) — UK GDPR remains aligned but diverges on adequacy decisions.',
  },
  US: {
    highlightId: 'marketing',
    messageDefault: 'US: FTC marketing guidelines, state-level privacy (CCPA/CPRA), and sales-tax nexus shift priorities.',
  },
  CH: {
    highlightId: 'privacy',
    messageDefault: 'Switzerland: revFADP requires EU representatives — Privacy obligations apply even from outside.',
  },
};

export function RiskComparisonGrid({ areas, selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const hint = COUNTRY_HINTS[selectedCountry];

  const sorted = [...areas].sort((a, b) => b.riskBarPct - a.riskBarPct);

  return (
    <div
      ref={ref}
      className="bg-surface border border-stroke rounded-2xl p-7 desktop-s:p-8 mt-8"
    >
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <Typography variant="h3" weight="bold" className="text-fg">
            {t('compliance.riskAtGlance', 'Risk at a Glance')}
          </Typography>
          <Typography variant="caption" className="text-fg-tertiary normal-case tracking-normal mt-1 block">
            {t('compliance.risk.subtitle', 'Sorted by typical priority across markets.')}
          </Typography>
        </div>
      </div>

      {hint && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          key={selectedCountry}
          className="flex items-start gap-2 bg-brand-light/50 border border-stroke-subtle rounded-xl px-4 py-3 mb-5"
        >
          <Info size={16} className="text-fg-brand shrink-0 mt-0.5" />
          <Typography variant="ui-small" className="text-fg-brand leading-snug">
            {t(`compliance.risk.hint.${selectedCountry}`, hint.messageDefault)}
          </Typography>
        </motion.div>
      )}

      <div className="space-y-5">
        {sorted.map((r, i) => {
          const title = t(`compliance.${r.id}.title`, r.id);
          const level = t(`compliance.${r.id}.risk`, r.risk);
          const isHighlight = hint?.highlightId === r.id;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <Typography
                  variant="ui-small"
                  weight="bold"
                  className={`${isHighlight ? 'text-fg-brand' : 'text-fg-secondary'}`}
                >
                  {title}
                  {isHighlight && (
                    <span className="ml-2 text-body-4xs font-bold uppercase tracking-wider text-fg-brand">
                      {t('compliance.risk.priorityBadge', 'Priority for {{country}}', { country: selectedCountry })}
                    </span>
                  )}
                </Typography>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${r.riskBarBadge}`}>
                  {level}
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-tertiary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${r.riskBarPct}%` } : {}}
                  transition={{ duration: 0.7, delay: i * 0.08 + 0.2, ease: 'easeOut' }}
                  className={`h-full rounded-full ${r.riskBarColor}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
