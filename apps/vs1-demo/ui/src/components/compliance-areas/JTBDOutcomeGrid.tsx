import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ShieldAlert, Users, BookOpen, Activity, ArrowRight } from 'lucide-react';
import { Typography } from '../ui/Typography';

interface OutcomeProps {
  onScrollToFirstArea: () => void;
}

export function JTBDOutcomeGrid({ onScrollToFirstArea }: OutcomeProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';

  const outcomes = [
    {
      id: 'expand',
      icon: Compass,
      titleDefault: 'Expand Safely',
      bodyDefault: 'Identify obligations before entering a new market.',
      ctaDefault: 'Start guided assessment',
      onClick: () => navigate(`${localePrefix}/wizard`),
    },
    {
      id: 'validate',
      icon: ShieldAlert,
      titleDefault: 'Validate Risk',
      bodyDefault: 'Check if a campaign, product, or claim is compliant.',
      ctaDefault: 'Run risk check',
      onClick: () => navigate(`${localePrefix}/wizard/marketing-seo`),
    },
    {
      id: 'specialist',
      icon: Users,
      titleDefault: 'Find Specialist',
      bodyDefault: 'Get matched to a verified expert for your case.',
      ctaDefault: 'Browse areas',
      onClick: onScrollToFirstArea,
    },
    {
      id: 'research',
      icon: BookOpen,
      titleDefault: 'Research First',
      bodyDefault: 'Read structured guides before contacting anyone.',
      ctaDefault: 'Open library',
      onClick: () => navigate(`${localePrefix}/resources`),
    },
    {
      id: 'maintain',
      icon: Activity,
      titleDefault: 'Maintain Compliance',
      bodyDefault: 'Track obligations, alerts, and renewals over time.',
      ctaDefault: 'Open dashboard',
      onClick: () => navigate(`${localePrefix}/dashboard`),
    },
  ];

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <Typography
            variant="caption"
            className="text-fg-brand font-semibold uppercase tracking-wider mb-2 block"
          >
            {t('compliance.jtbd.overline', 'Choose your outcome')}
          </Typography>
          <Typography variant="h2" weight="bold" className="text-fg">
            {t('compliance.jtbd.title', 'What progress are you trying to make?')}
          </Typography>
          <Typography variant="body" className="text-fg-secondary mt-2 max-w-2xl">
            {t(
              'compliance.jtbd.body',
              'CompliHub360 routes you to the right tool based on the job you need done — not the feature you think you need.',
            )}
          </Typography>
        </div>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop-s:grid-cols-5 gap-4">
        {outcomes.map((o, i) => {
          const Icon = o.icon;
          const title = t(`compliance.jtbd.${o.id}.title`, o.titleDefault);
          const body = t(`compliance.jtbd.${o.id}.body`, o.bodyDefault);
          const cta = t(`compliance.jtbd.${o.id}.cta`, o.ctaDefault);
          return (
            <motion.button
              key={o.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              onClick={o.onClick}
              className="group text-left bg-surface border border-stroke hover:border-primary-400 rounded-2xl p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col h-full"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-tertiary flex items-center justify-center mb-4">
                <Icon size={20} className="text-fg-brand" />
              </div>
              <Typography variant="ui-small" weight="bold" className="text-fg mb-1.5 leading-snug">
                {title}
              </Typography>
              <Typography variant="caption" className="text-fg-secondary normal-case tracking-normal leading-snug flex-1">
                {body}
              </Typography>
              <span className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-fg-brand group-hover:text-fg-brand">
                {cta}
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
