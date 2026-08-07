import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, AlertTriangle, BadgeCheck } from 'lucide-react';
import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { SectionEyebrow, GoldWord, SectionNote, Reveal, Stagger, StaggerItem } from './SectionHeading';
import { TierSummaryPanel, demoPartnerData as d } from '../partner-preview';

// ─── S3 — Performance Tracker (Provider) · Figma 1798:817 ─────────────────────
// "Stay Top-Tier. We tell you how — before you slip." A tier dashboard panel:
// gold tier banner + 4 KPI cells + a warning heads-up. Visibility earned through
// performance, not ad spend. Light section. At-risk = amber (never red).
// Copy lives in the 'providersLp' namespace.

const FEATURES = [
  { key: '0', icon: CalendarClock },
  { key: '1', icon: BadgeCheck },
  { key: '2', icon: AlertTriangle },
] as const;

export function PerformanceSection() {
  const { t } = useTranslation('providersLp');
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="performance" className="bg-surface py-20 lg:py-28">
      <Container size="xl">
        {/* Heading */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('performance.eyebrow')}</SectionEyebrow>
          <Typography variant="h2" weight="semibold" className="!text-[2rem] leading-tight tracking-tight text-neutral-900 sm:!text-[2.5rem]">
            {t('performance.title.pre')} <GoldWord>{t('performance.title.gold')}</GoldWord>
            {t('performance.title.post')}
          </Typography>
          <p className="text-lg font-medium text-primary-600">{t('performance.tagline')}</p>
          <p className="max-w-2xl text-base leading-relaxed text-neutral-600">{t('performance.lead')}</p>
        </Reveal>

        {/* Dashboard panel — shared TierSummaryPanel block */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mx-auto mt-14 max-w-4xl"
        >
          <TierSummaryPanel tier={d.tier} />
        </motion.div>

        {/* Feature columns */}
        <Stagger className="mt-16 grid gap-10 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.key}>
              <f.icon size={24} className="text-primary-600" strokeWidth={1.75} />
              <p className="mt-4 text-[16px] font-semibold text-neutral-900">{t(`performance.features.${f.key}.title`)}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">{t(`performance.features.${f.key}.desc`)}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-14">
          <SectionNote>{t('performance.note')}</SectionNote>
        </div>
      </Container>
    </section>
  );
}
