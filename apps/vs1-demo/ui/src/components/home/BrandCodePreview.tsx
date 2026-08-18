import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { GoldWord } from '../providers/SectionHeading';
import { RiskBadge } from '../ui/RiskBadge';
import { Avatar } from '../ui/Avatar';
import { PartnerStatusBadge } from '../ui/ProviderBadges';

// ─── S6 — Brand Code Preview · Figma 1232:169 ───────────────────────────────
// "Three quiet defaults." A dark petrol section whose three white cards each
// hold one product principle. Default state shows only the label + serif claim +
// a "hover to see" cue; on hover the live preview (risk scale / wizard stepper /
// verified mark) and the explanation expand into view.

const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

function CodeCard({ label, demo, title, desc }: { label: string; demo: ReactNode; title: string; desc: string }) {
  const { t } = useTranslation('home');
  return (
    <motion.article
      variants={item}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="group flex h-[300px] flex-col rounded-2xl bg-surface p-7 shadow-[0_10px_15px_-3px_rgba(15,23,42,0.1),0_4px_6px_-2px_rgba(15,23,42,0.06)]"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">{label}</p>

      <div className="flex flex-1 flex-col justify-center">
        {/* Live preview — collapsed until hover */}
        <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-[450ms] ease-out group-hover:mb-5 group-hover:grid-rows-[1fr] group-hover:opacity-100">
          <div className="overflow-hidden">{demo}</div>
        </div>

        <h3 className="font-serif text-[26px] font-bold leading-[1.15] text-fg">{title}</h3>

        {/* Explanation — collapsed until hover */}
        <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-[450ms] ease-out group-hover:mt-3 group-hover:grid-rows-[1fr] group-hover:opacity-100">
          <p className="overflow-hidden text-[14px] leading-relaxed text-fg-secondary">{desc}</p>
        </div>
      </div>

      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-brand transition-opacity duration-300 group-hover:opacity-0">
        {t('brandCode.hoverCue')}
        <ArrowRight size={13} />
      </span>
    </motion.article>
  );
}

// ── Demo previews (reused Compass components) ────────────────────────────────

function RiskScaleDemo() {
  const { t } = useTranslation('home');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RiskBadge level="low" styleVariant="soft" size="sm">{t('risk.severity.low')}</RiskBadge>
      <RiskBadge level="medium" styleVariant="soft" size="sm">{t('risk.severity.medium')}</RiskBadge>
      <RiskBadge level="high" styleVariant="soft" size="sm">{t('risk.severity.high')}</RiskBadge>
      <RiskBadge level="critical" styleVariant="soft" size="sm">{t('risk.severity.critical')}</RiskBadge>
    </div>
  );
}

function WizardPathDemo() {
  const { t } = useTranslation('home');
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-7 rounded-full bg-brand" />
        <span className="rounded-full bg-accent-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-on-accent">
          {t('brandCode.demo.step')}
        </span>
        <span className="h-1.5 w-7 rounded-full bg-neutral-200" />
        <span className="h-1.5 w-7 rounded-full bg-neutral-200" />
      </div>
      <p className="mt-3 text-[13px] font-medium text-fg">{t('brandCode.demo.question')}</p>
    </div>
  );
}

function VerifiedPartnerDemo() {
  const { t } = useTranslation('home');
  return (
    <div className="flex items-center gap-3">
      <Avatar size="md" initials="MP" tone="soft" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-fg">Müller &amp; Partner KG</p>
        <p className="truncate text-[12px] text-fg-secondary">{t('brandCode.demo.partnerSpecialty')}</p>
      </div>
      <PartnerStatusBadge status="verified" styleVariant="solid" label={t('badge.verified')} />
    </div>
  );
}

export function BrandCodePreview() {
  const { t } = useTranslation('home');
  return (
    <section id="brand-code" className="relative overflow-hidden bg-brand py-20 lg:py-28">
      {/* Soft petrol-light glow (Figma "Petrol inner light") */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[1100px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(ellipse at center, rgba(13,148,114,0.45), transparent 70%)' }}
      />

      <div className="relative mx-auto w-full max-w-[1320px] px-4 md:px-6 lg:px-10">
        {/* Header (left-aligned) */}
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-accent-300 dark:text-accent-950">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {t('brandCode.eyebrow')}
          </span>
          <h2 className="mt-4 font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg-on-brand sm:text-[2.75rem]">
            <span className="whitespace-nowrap text-accent-300 dark:text-accent-950">{t('brandCode.title.gold')}</span>{t('brandCode.title.post')}
          </h2>
          <p className="mt-5 text-body leading-relaxed text-fg-on-brand/75">
            {t('brandCode.subtitle')}
          </p>
        </motion.div>

        {/* Cards row — stagger reveal */}
        <motion.div
          className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={{ show: { transition: { staggerChildren: 0.14 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          <CodeCard
            label={t('brandCode.cards.0.label')}
            demo={<RiskScaleDemo />}
            title={t('brandCode.cards.0.title')}
            desc={t('brandCode.cards.0.desc')}
          />
          <CodeCard
            label={t('brandCode.cards.1.label')}
            demo={<WizardPathDemo />}
            title={t('brandCode.cards.1.title')}
            desc={t('brandCode.cards.1.desc')}
          />
          <CodeCard
            label={t('brandCode.cards.2.label')}
            demo={<VerifiedPartnerDemo />}
            title={t('brandCode.cards.2.title')}
            desc={t('brandCode.cards.2.desc')}
          />
        </motion.div>
      </div>
    </section>
  );
}
