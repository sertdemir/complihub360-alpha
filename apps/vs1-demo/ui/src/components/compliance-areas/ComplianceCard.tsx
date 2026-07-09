import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  ScrollText,
  Gavel,
  Sparkles,
  Users,
} from 'lucide-react';
import { Typography } from '../ui/Typography';
import type { AreaConfig, CountryCode } from './types';

interface Props {
  area: AreaConfig;
  index: number;
  defaultOpen?: boolean;
  selectedCountry: CountryCode;
}

export function ComplianceCard({ area, index, defaultOpen = false, selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(defaultOpen);
  const navigate = useNavigate();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';
  const Icon = area.icon;

  const title = t(`compliance.${area.id}.title`, area.id);
  const risk = t(`compliance.${area.id}.risk`, area.risk);
  const headline = t(`compliance.${area.id}.headline`, '');
  const description = t(`compliance.${area.id}.description`, '');
  const affected = t(`compliance.${area.id}.affected`, '');
  const personaFit = t(`compliance.${area.id}.personaFit`, area.personaFitKey);

  const obligations = ['ob1', 'ob2', 'ob3', 'ob4']
    .map(k => t(`compliance.${area.id}.${k}`, ''))
    .filter(Boolean);
  const coverage = ['cov1', 'cov2', 'cov3']
    .map(k => t(`compliance.${area.id}.${k}`, ''))
    .filter(Boolean);
  const regulations = ['r1', 'r2', 'r3']
    .map(k => t(`compliance.${area.id}.regulations.${k}`, ''))
    .filter(Boolean);

  const finesHeadline = t(`compliance.${area.id}.fines.headline`, '');
  const finesAuthorities = t(`compliance.${area.id}.fines.authorities`, '');

  const teaserQuestion = t(`compliance.${area.id}.teaser.question`, '');
  const teaserOptions = ['o1', 'o2', 'o3']
    .map(k => t(`compliance.${area.id}.teaser.${k}`, ''))
    .filter(Boolean);

  const filteredMarkets =
    selectedCountry === 'EU' || selectedCountry === 'ALL'
      ? area.markets
      : area.markets.map(m => ({
          ...m,
          highlight: m.code === selectedCountry,
        }));

  const wizardLink = (preselect?: string) => {
    const search = new URLSearchParams();
    if (selectedCountry !== 'EU') search.set('country', selectedCountry);
    if (preselect) search.set('preselect', preselect);
    const qs = search.toString();
    navigate(`${localePrefix}${area.wizardPath}${qs ? `?${qs}` : ''}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className={`bg-white border-2 rounded-2xl overflow-hidden transition-shadow ${area.cardBorder} ${expanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full text-left p-6 desktop-s:p-7 flex items-start gap-5"
      >
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${area.iconBg}`}>
          <Icon size={26} className={area.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Typography variant="h3" weight="bold" className="text-neutral-900">
              {title}
            </Typography>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${area.riskColor}`}>
              {risk} {t('compliance.riskLabel', 'Risk')}
            </span>
            {personaFit && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100">
                {personaFit}
              </span>
            )}
          </div>
          <Typography variant="body" className="text-neutral-600 leading-relaxed">
            {headline || description}
          </Typography>
        </div>
        <ChevronDown
          size={20}
          className={`text-neutral-400 shrink-0 mt-2 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 desktop-s:px-7 pb-7 pt-0 border-t border-neutral-100">
              {description && headline && (
                <Typography variant="body" className="text-neutral-600 mt-6 leading-relaxed">
                  {description}
                </Typography>
              )}

              <div className="grid tablet:grid-cols-2 gap-7 mt-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                  <div>
                    <Typography
                      variant="caption"
                      className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block"
                    >
                      {t('compliance.whoAffected', 'Who is affected')}
                    </Typography>
                    <Typography variant="body" className="text-neutral-600 leading-relaxed text-sm">
                      {affected}
                    </Typography>
                  </div>

                  <div>
                    <Typography
                      variant="caption"
                      className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block"
                    >
                      {t('compliance.keyObligations', 'Key Obligations')}
                    </Typography>
                    <ul className="space-y-2">
                      {obligations.map(o => (
                        <li key={o} className="flex items-start gap-2">
                          <AlertTriangle size={14} className="text-warning-text shrink-0 mt-0.5" />
                          <Typography variant="ui-small" className="text-neutral-700">
                            {o}
                          </Typography>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {regulations.length > 0 && (
                    <div>
                      <Typography
                        variant="caption"
                        className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1.5"
                      >
                        <ScrollText size={12} className="text-neutral-400" />
                        {t('compliance.regulations.label', 'Key Regulations')}
                      </Typography>
                      <div className="flex flex-wrap gap-2">
                        {regulations.map(r => (
                          <span
                            key={r}
                            className="text-xs font-mono bg-neutral-50 border border-neutral-200 px-2.5 py-1 rounded-md text-neutral-700"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {finesHeadline && (
                    <div className="bg-error-50/40 border border-error-100 rounded-xl p-4">
                      <Typography
                        variant="caption"
                        className="text-error-700 font-semibold uppercase tracking-wider mb-1.5 block flex items-center gap-1.5"
                      >
                        <Gavel size={12} className="text-error-600" />
                        {t('compliance.fines.label', "What's at Stake")}
                      </Typography>
                      <Typography
                        variant="ui-small"
                        weight="bold"
                        className="text-neutral-900 leading-snug"
                      >
                        {finesHeadline}
                      </Typography>
                      {finesAuthorities && (
                        <Typography
                          variant="caption"
                          className="text-neutral-600 mt-1 block normal-case tracking-normal"
                        >
                          {t('compliance.fines.authoritiesLabel', 'Enforced by:')}{' '}
                          <span className="font-semibold">{finesAuthorities}</span>
                        </Typography>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                  <div>
                    <Typography
                      variant="caption"
                      className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block"
                    >
                      {t('compliance.whatWeCover', 'What CompliHub360 Covers')}
                    </Typography>
                    <ul className="space-y-2">
                      {coverage.map(c => (
                        <li key={c} className="flex items-start gap-2">
                          <CheckCircle size={14} className="text-success-500 shrink-0 mt-0.5" />
                          <Typography variant="ui-small" className="text-neutral-700">
                            {c}
                          </Typography>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <Typography
                      variant="caption"
                      className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1.5"
                    >
                      <Users size={12} className="text-neutral-400" />
                      {t('compliance.specialists.label', 'Verified Specialists')}
                    </Typography>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold tabular-nums"
                            style={{
                              background: `linear-gradient(135deg, hsl(${(i * 47 + area.id.length * 23) % 360}, 45%, 70%), hsl(${(i * 47 + area.id.length * 23 + 30) % 360}, 45%, 60%))`,
                              color: 'white',
                            }}
                            aria-hidden
                          >
                            {String.fromCharCode(65 + i)}
                          </div>
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-accent-100/40 text-accent-700 border border-accent-200">
                        <Sparkles size={11} className="text-accent-600" />
                        {t('compliance.specialists.count', '{{count}} verified specialists', {
                          count: area.specialistsCount,
                        })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Typography
                      variant="caption"
                      className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block"
                    >
                      {t('compliance.activeMarkets', 'Active Markets')}
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                      {filteredMarkets.map(m => {
                        const highlight =
                          'highlight' in m
                            ? (m as { highlight: boolean }).highlight
                            : false;
                        return (
                          <span
                            key={m.code}
                            className={`text-sm border px-3 py-1 rounded-lg transition-colors ${
                              highlight
                                ? 'bg-primary-500 text-white border-primary-500 font-bold shadow-sm'
                                : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                            }`}
                          >
                            {m.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {teaserQuestion && teaserOptions.length > 0 && (
                    <div className="bg-surface-muted/30 border border-primary-100 rounded-xl p-4">
                      <Typography
                        variant="caption"
                        className="text-primary-700 font-semibold uppercase tracking-wider mb-2 block"
                      >
                        {t('compliance.teaser.label', 'Quick start')}
                      </Typography>
                      <Typography
                        variant="ui-small"
                        weight="bold"
                        className="text-neutral-900 mb-3"
                      >
                        {teaserQuestion}
                      </Typography>
                      <div className="flex flex-wrap gap-2">
                        {teaserOptions.map((opt, i) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => wizardLink(`teaser_${i}`)}
                            className="text-xs font-semibold bg-white hover:bg-primary-500 hover:text-white border border-primary-200 hover:border-primary-500 text-primary-700 px-3 py-1.5 rounded-md transition-colors"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => wizardLink()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-500 text-white font-bold text-sm shadow-md hover:bg-primary-600 transition-colors"
                  >
                    {t('compliance.startAssessment', 'Start {{title}} Assessment', { title })}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
