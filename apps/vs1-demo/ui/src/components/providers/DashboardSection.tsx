import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, CalendarClock, Globe } from 'lucide-react';
import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { SectionEyebrow, GoldWord, SectionNote, Reveal, Stagger, StaggerItem } from './SectionHeading';
import { PartnerInboxList, ActiveEngagementCard, CoveragePanel, demoPartnerData as d } from '../partner-preview';

// ─── S2 — One-Stop Dashboard (Provider) · Figma 1792:814 ──────────────────────
// "Every active engagement, in one place." Three workspace panels rendered with
// the SHARED partner-preview blocks (same components the real dashboard adopts) +
// three supporting feature columns. Light section.
// Copy lives in the 'providersLp' namespace.

const FEATURES = [
  { key: '0', icon: MessageSquare },
  { key: '1', icon: CalendarClock },
  { key: '2', icon: Globe },
] as const;

// Compact inbox rows for the panel-1 list (featured highlighted + dimmed leads).
const INBOX_LEADS = [d.inboxFeatured, ...d.inboxLeads];

function PanelCard({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <p className="mb-4 text-caption font-sans font-semibold uppercase tracking-[0.12em] text-primary-600">{caption}</p>
      <div className="flex-1 rounded-xl border border-stroke bg-surface p-5 shadow-sm">{children}</div>
    </div>
  );
}

export function OneStopDashboardSection() {
  const { t } = useTranslation('providersLp');
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="dashboard" className="bg-neutral-50 py-20 lg:py-28">
      <Container size="2xl">
        {/* Heading */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('dashboard.eyebrow')}</SectionEyebrow>
          <Typography variant="h2" weight="semibold" className="!text-[2rem] leading-tight tracking-tight text-neutral-900 sm:!text-[2.5rem]">
            {t('dashboard.title.pre')} <GoldWord>{t('dashboard.title.gold')}</GoldWord>
            {t('dashboard.title.post')}
          </Typography>
          <p className="max-w-2xl text-base leading-relaxed text-neutral-600">{t('dashboard.lead')}</p>
        </Reveal>

        {/* Three panels — shared partner-preview blocks */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mt-14 grid gap-6 lg:grid-cols-3"
        >
          <PanelCard caption={t('dashboard.panels.inbox.caption')}>
            <PartnerInboxList title={t('dashboard.panels.inbox.title')} rightSlot={t('dashboard.panels.inbox.filter')} leads={INBOX_LEADS} />
          </PanelCard>

          <PanelCard caption={t('dashboard.panels.active.caption')}>
            <ActiveEngagementCard engagement={d.activeEngagement} />
          </PanelCard>

          <PanelCard caption={t('dashboard.panels.coverage.caption')}>
            <CoveragePanel coverage={d.coverage} />
          </PanelCard>
        </motion.div>

        {/* Feature columns */}
        <Stagger className="mt-16 grid gap-10 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.key}>
              <f.icon size={24} className="text-primary-600" strokeWidth={1.75} />
              <p className="mt-4 text-[16px] font-semibold text-neutral-900">{t(`dashboard.features.${f.key}.title`)}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">{t(`dashboard.features.${f.key}.desc`)}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-14">
          <SectionNote>{t('dashboard.note')}</SectionNote>
        </div>
      </Container>
    </section>
  );
}
