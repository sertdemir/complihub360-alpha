import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { CalendarClock, AlertTriangle, BadgeCheck } from 'lucide-react';
import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { SectionEyebrow, GoldWord, SectionNote, Reveal, Stagger, StaggerItem } from './SectionHeading';
import { TierSummaryPanel, demoPartnerData as d } from '../partner-preview';

// ─── S3 — Performance Tracker (Provider) · Figma 1798:817 ─────────────────────
// "Stay Top-Tier. We tell you how — before you slip." A tier dashboard panel:
// gold tier banner + 4 KPI cells + a warning heads-up. Visibility earned through
// performance, not ad spend. Light section. At-risk = amber (never red).

const FEATURES = [
  { icon: CalendarClock, title: 'Real-time SLA timers', desc: 'See your 24h confirm and 48h reply countdowns live. The same timer the user sees on their side.' },
  { icon: BadgeCheck, title: 'Tier badge that travels', desc: 'Founding-Partner status appears in your profile and on every request a user sees. Carries social proof, not just a vanity mark.' },
  { icon: AlertTriangle, title: '7-day early-warning', desc: "If you're trending toward downgrade, we ping you a week ahead with concrete actions. No silent demotions." },
] as const;

export function PerformanceSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="performance" className="bg-surface py-20 lg:py-28">
      <Container size="xl">
        {/* Heading */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">Performance Tracker</SectionEyebrow>
          <Typography variant="h2" weight="semibold" className="!text-[2rem] leading-tight tracking-tight text-neutral-900 sm:!text-[2.5rem]">
            Stay Top-Tier. We tell you <GoldWord>how</GoldWord> — before you slip.
          </Typography>
          <p className="text-lg font-medium text-primary-600">Earn visibility through performance, not advertising spend.</p>
          <p className="max-w-2xl text-base leading-relaxed text-neutral-600">
            We track only what's in your control: how fast you respond, how often you accept, how reliably you meet
            SLA. Outcome stays between you and the client. Your tier ranking, breach count, and projected standing —
            visible to you in real-time, with 7-day early-warning if you're trending toward downgrade.
          </p>
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
            <StaggerItem key={f.title}>
              <f.icon size={24} className="text-primary-600" strokeWidth={1.75} />
              <p className="mt-4 text-[16px] font-semibold text-neutral-900">{f.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">{f.desc}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-14">
          <SectionNote>
            Founding partners get the badge. Top performers keep their tier. Everyone sees the same numbers — there's no hidden ranking.
          </SectionNote>
        </div>
      </Container>
    </section>
  );
}
