import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Crosshair, ClipboardList, Users, MessageSquare } from 'lucide-react';
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
  /**
   * `inverse` drops the card shell and repaints for the petrol band, which is
   * where an area page closes. The block cannot simply be dropped onto that
   * ground as it is: its own tinted card inside a dark section reads as a
   * light panel someone forgot to restyle, and fg-secondary on petrol is
   * unreadable rather than merely quiet.
   */
  tone?: 'default' | 'inverse';
}

export function HowOrchestrationWorks({ cta, tone = 'default' }: Props = {}) {
  const { t } = useTranslation('common');
  const dark = tone === 'inverse';

  return (
    <div
      className={
        dark ? '' : 'bg-surface-tertiary/40 border border-stroke-subtle rounded-xl p-7 desktop-s:p-10'
      }
    >
      <div className="max-w-2xl mb-8">
        <Typography
          variant="caption"
          className={`font-semibold uppercase tracking-wider mb-2 block ${
            dark ? 'text-white/70' : 'text-fg-brand'
          }`}
        >
          {t('compliance.howItWorks.overline', 'Orchestration, not directory')}
        </Typography>
        <Typography variant="h2" weight="bold" className={dark ? 'text-white' : 'text-fg'}>
          {t('compliance.howItWorks.title', 'From uncertainty to structured action — in four steps')}
        </Typography>
        <Typography
          variant="body"
          className={`mt-2 leading-relaxed ${dark ? 'text-primary-100' : 'text-fg-secondary'}`}
        >
          {t(
            'compliance.howItWorks.body',
            'CompliHub360 controls the engagement funnel and enforces response accountability. You stay in control end-to-end.',
          )}
        </Typography>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop-s:grid-cols-4 gap-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`rounded-xl p-5 desktop-s:p-6 border flex flex-col ${
                dark
                  ? 'bg-white/[0.04] border-white/[0.14]'
                  : 'bg-surface border-stroke-subtle shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    dark ? 'bg-white/10' : 'bg-primary-500'
                  }`}
                >
                  <Icon size={20} className="text-white" />
                </div>
                <span
                  className={`text-body-2xs font-bold uppercase tracking-wider tabular-nums ${
                    dark ? 'text-white/70' : 'text-fg-brand'
                  }`}
                >
                  {t('compliance.howItWorks.stepLabel', 'Step {{num}}', { num: i + 1 })}
                </span>
              </div>
              <Typography variant="h3" weight="bold" className={`mb-2 ${dark ? 'text-white' : 'text-fg'}`}>
                {t(`compliance.howItWorks.${step.id}.title`, step.titleDefault)}
              </Typography>
              <Typography
                variant="body"
                className={`leading-relaxed text-body-sm flex-1 ${dark ? 'text-primary-200' : 'text-fg-secondary'}`}
              >
                {t(`compliance.howItWorks.${step.id}.body`, step.bodyDefault)}
              </Typography>
            </motion.div>
          );
        })}
      </div>

      {cta && <div className="mt-10">{cta}</div>}
    </div>
  );
}
