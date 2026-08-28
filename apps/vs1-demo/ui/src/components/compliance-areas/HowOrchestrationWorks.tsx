import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Crosshair, ClipboardList, Users, MessageSquare } from 'lucide-react';
import { SectionEyebrow } from '../providers/SectionHeading';

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
   * leaves it off — the steps are context there. The area, market and pricing
   * pages pass their wizard CTA, because that is where the section sits last
   * on the page and a reader who has followed the steps has nowhere else to
   * go.
   */
  cta?: ReactNode;
}

// The hub's dress, and since 2026-08-28 the only one (canvas "Orchestrierung
// im Hub" · Variante B "Ohne Gradient", 2026-08-27): no shell around the
// block, eyebrow + serif header, white step cards with hairline border and a
// soft shadow, pure brand icon + kicker instead of the petrol icon tile, and
// the optional CTA row behind a hairline. The `inverse` petrol-band variant
// retired with the pricing page's close — the last dark closing band on the
// site — after the area and market pages had already moved to the light
// close.
export function HowOrchestrationWorks({ cta }: Props = {}) {
  const { t } = useTranslation('common');

  return (
    <div>
      <div className="mb-8 max-w-2xl">
        <SectionEyebrow tone="brand">
          {t('compliance.howItWorks.overline', 'Orchestration, not directory')}
        </SectionEyebrow>
        <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
          {t('compliance.howItWorks.title', 'From uncertainty to structured action — in four steps')}
        </h2>
        <p className="mt-3 text-body leading-relaxed text-fg-secondary">
          {t(
            'compliance.howItWorks.body',
            'CompliHub360 controls the engagement funnel and enforces response accountability. You stay in control end-to-end.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop-s:grid-cols-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col rounded-xl border border-stroke-subtle bg-surface p-5 shadow-[0_18px_44px_-30px_rgba(2,22,17,0.25)] dark:bg-surface-secondary desktop-s:p-6"
            >
              <div className="mb-3.5 flex items-center gap-3">
                <Icon size={38} strokeWidth={1.6} className="shrink-0 text-fg-brand" aria-hidden />
                <span className="text-body-3xs font-bold uppercase tracking-[0.1em] tabular-nums text-fg-brand">
                  {t('compliance.howItWorks.stepLabel', 'Step {{num}}', { num: i + 1 })}
                </span>
              </div>
              <span className="font-serif text-[1.1875rem] font-bold leading-snug text-fg">
                {t(`compliance.howItWorks.${step.id}.title`, step.titleDefault)}
              </span>
              <p className="mt-2 flex-1 text-body-xs leading-relaxed text-fg-secondary">
                {t(`compliance.howItWorks.${step.id}.body`, step.bodyDefault)}
              </p>
            </motion.div>
          );
        })}
      </div>

      {cta && <div className="mt-10 border-t border-stroke-subtle pt-8">{cta}</div>}
    </div>
  );
}
