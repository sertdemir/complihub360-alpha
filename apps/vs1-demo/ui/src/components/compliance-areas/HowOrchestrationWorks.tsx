import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Crosshair, ClipboardList, Users, MessageSquare, ArrowRight } from 'lucide-react';
import { Typography } from '../ui/Typography';

const STEPS = [
  {
    id: 'define',
    icon: Crosshair,
    titleDefault: 'Define',
    bodyDefault: 'Pick your country and compliance area. We anchor the regulatory context first.',
  },
  {
    id: 'assess',
    icon: ClipboardList,
    titleDefault: 'Assess',
    bodyDefault: '4–5 sharp questions translate your situation into a structured search profile.',
  },
  {
    id: 'match',
    icon: Users,
    titleDefault: 'Match',
    bodyDefault: 'Verified specialists are ranked by relevance, response speed, and quality score.',
  },
  {
    id: 'engage',
    icon: MessageSquare,
    titleDefault: 'Engage',
    bodyDefault: 'Send one structured request. Track confirmations and SLAs from your dashboard.',
  },
];

interface Props {
  /**
   * A closing call to action rendered under the four steps. The areas hub
   * leaves it off — the steps are context there. An area page passes the
   * wizard CTA, because that is where the section sits last on the page and a
   * reader who has followed the steps has nowhere else to go.
   */
  cta?: ReactNode;
}

export function HowOrchestrationWorks({ cta }: Props = {}) {
  const { t } = useTranslation('common');

  return (
    <div className="bg-surface-tertiary/40 border border-stroke-subtle rounded-xl p-7 desktop-s:p-10">
      <div className="max-w-2xl mb-8">
        <Typography
          variant="caption"
          className="text-fg-brand font-semibold uppercase tracking-wider mb-2 block"
        >
          {t('compliance.howItWorks.overline', 'Orchestration, not directory')}
        </Typography>
        <Typography variant="h2" weight="bold" className="text-fg">
          {t('compliance.howItWorks.title', 'From uncertainty to structured action — in four steps')}
        </Typography>
        <Typography variant="body" className="text-fg-secondary mt-2 leading-relaxed">
          {t(
            'compliance.howItWorks.body',
            'CompliHub360 controls the engagement funnel and enforces response accountability. You stay in control end-to-end.',
          )}
        </Typography>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop-s:grid-cols-4 gap-4 desktop-s:gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isLast = i === STEPS.length - 1;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative bg-surface rounded-xl p-5 desktop-s:p-6 border border-stroke-subtle shadow-sm flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-fg-brand tabular-nums">
                  {t('compliance.howItWorks.stepLabel', 'Step {{num}}', { num: i + 1 })}
                </span>
              </div>
              <Typography variant="h3" weight="bold" className="text-fg mb-2">
                {t(`compliance.howItWorks.${step.id}.title`, step.titleDefault)}
              </Typography>
              <Typography variant="body" className="text-fg-secondary leading-relaxed text-sm flex-1">
                {t(`compliance.howItWorks.${step.id}.body`, step.bodyDefault)}
              </Typography>

              {!isLast && (
                <div
                  aria-hidden
                  className="hidden desktop-s:flex absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 items-center justify-center bg-primary-500 rounded-full shadow-md z-10"
                >
                  <ArrowRight size={14} className="text-white" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {cta && <div className="mt-10">{cta}</div>}
    </div>
  );
}
