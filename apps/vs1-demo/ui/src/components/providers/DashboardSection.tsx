import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { MessageSquare, CalendarClock, Globe } from 'lucide-react';
import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { SectionEyebrow, GoldWord, SectionNote, Reveal, Stagger, StaggerItem } from './SectionHeading';
import { PartnerInboxList, ActiveEngagementCard, CoveragePanel, demoPartnerData as d } from '../partner-preview';

// ─── S2 — One-Stop Dashboard (Provider) · Figma 1792:814 ──────────────────────
// "Every active engagement, in one place." Three workspace panels rendered with
// the SHARED partner-preview blocks (same components the real dashboard adopts) +
// three supporting feature columns. Light section.

const FEATURES = [
  { icon: MessageSquare, title: 'Full context on accept', desc: "When you accept, the user's risk map, statutory citations, and timeline arrive structured — ready to act on." },
  { icon: CalendarClock, title: 'SLA reminders built-in', desc: '24h confirm, 48h reply. We ping you before you breach. Repeated breaches → downgrade warning.' },
  { icon: Globe, title: 'Coverage stays under your control', desc: 'Edit categories + jurisdictions anytime. Auto-pause when your active queue fills. No surprise requests.' },
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
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="dashboard" className="bg-neutral-50 py-20 lg:py-28">
      <Container size="2xl">
        {/* Heading */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">One-stop-dashboard</SectionEyebrow>
          <Typography variant="h2" weight="semibold" className="!text-[2rem] leading-tight tracking-tight text-neutral-900 sm:!text-[2.5rem]">
            Every active engagement, in <GoldWord>one</GoldWord> place.
          </Typography>
          <p className="max-w-2xl text-base leading-relaxed text-neutral-600">
            Inbox, active engagements, response history, billing, profile settings — all in one workspace. Click
            Accept once. We hand the lead over with full structured context. From there, it's your relationship.
          </p>
        </Reveal>

        {/* Three panels — shared partner-preview blocks */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mt-14 grid gap-6 lg:grid-cols-3"
        >
          <PanelCard caption="Inbox · new requests">
            <PartnerInboxList title="Inbox · 3 new" rightSlot="Filter ▾" leads={INBOX_LEADS} />
          </PanelCard>

          <PanelCard caption="Active engagement · post-accept">
            <ActiveEngagementCard engagement={d.activeEngagement} />
          </PanelCard>

          <PanelCard caption="Profile · coverage settings">
            <CoveragePanel coverage={d.coverage} />
          </PanelCard>
        </motion.div>

        {/* Feature columns */}
        <Stagger className="mt-16 grid gap-10 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <f.icon size={24} className="text-primary-600" strokeWidth={1.75} />
              <p className="mt-4 text-[16px] font-semibold text-neutral-900">{f.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">{f.desc}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-14">
          <SectionNote>
            On Accept, we hand the lead over — full context, structured. From there, it's your relationship. We step out of the way.
          </SectionNote>
        </div>
      </Container>
    </section>
  );
}
