import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { SectionEyebrow, GoldWord } from '../providers/SectionHeading';

// ─── S5 — How CompliHub Acts · Figma 1247:435 ───────────────────────────────
// "What happens between the match and the resolution." Three numbered cards —
// cost, response SLA, and the engagement trail — each with a detail panel, laid
// out as wide landscape rows (number · text · panel). Cards reveal top-to-bottom
// on scroll.

const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

function Card({ n, panel, title, desc }: { n: string; panel: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      variants={item}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="grid gap-6 rounded-2xl bg-surface p-7 shadow-[0_30px_70px_-34px_rgba(2,22,17,0.3)] md:grid-cols-[auto_1fr_minmax(300px,400px)] md:items-center md:gap-10 md:p-9"
    >
      <p className="font-serif text-[2.5rem] font-bold leading-none text-fg-brand md:text-[3rem]">{n}</p>
      <div>
        <p className="font-serif text-[20px] font-bold text-fg md:text-[24px]">{title}</p>
        <p className="mt-3 text-[14px] leading-relaxed text-fg-secondary md:text-[15px]">{desc}</p>
      </div>
      <div className="rounded-xl bg-surface-secondary p-5">{panel}</div>
    </motion.div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{children}</p>;
}

const TIMELINE = [
  { date: 'Apr 24', label: 'Request sent' },
  { date: 'Apr 25', label: 'Partner accepted · 21h' },
  { date: 'Apr 28', label: 'Proposal received' },
  { date: 'May 02', label: 'Scope agreed' },
];

export function HowItActs() {
  return (
    <section id="engagement" className="bg-surface-secondary py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1320px] px-4 md:px-6 lg:px-10">
        {/* Heading (left-aligned) */}
        <div className="max-w-2xl">
          <SectionEyebrow tone="brand">Inside one engagement</SectionEyebrow>
          <h2 className="mt-4 font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.75rem]">
            What happens <GoldWord>between</GoldWord> the match and the resolution.
          </h2>
          <p className="mt-5 text-body leading-relaxed text-fg-secondary">
            Once you&rsquo;re matched, three things stop being assumptions: what it costs, when you&rsquo;ll hear back,
            and what you take with you. Each is set before the first email.
          </p>
        </div>

        {/* Cards — landscape rows, top-to-bottom stagger reveal */}
        <motion.div
          className="mt-14 flex flex-col gap-6"
          variants={{ show: { transition: { staggerChildren: 0.14 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          <Card
            n="01"
            title="Cost, before you commit."
            desc="Every Verified Partner publishes a fixed estimate before you accept the engagement. No discovery calls just to find out what something costs."
            panel={
              <div className="divide-y divide-stroke">
                <div className="pb-3">
                  <Label>Estimated cost</Label>
                  <p className="mt-1 text-[15px] font-semibold text-fg">€2,400 — €3,800</p>
                </div>
                <div className="py-3">
                  <Label>Scope</Label>
                  <p className="mt-1 text-[14px] font-medium text-fg">OSS quarterly returns · DE + NL + FR</p>
                </div>
                <div className="pt-3">
                  <Label>Approval</Label>
                  <p className="mt-1 text-[14px] font-medium text-fg">Set before any work begins</p>
                </div>
              </div>
            }
          />
          <Card
            n="02"
            title="Response, on the clock."
            desc="24–48h to first response, or we route to the next available partner — automatically. The clock is part of the contract, not a promise."
            panel={
              <div>
                <Label>Initial response SLA</Label>
                <p className="mt-2 text-[2rem] font-bold leading-none text-fg-brand">&le; 48h</p>
                <p className="mt-3 text-[13px] leading-relaxed text-fg-secondary">
                  Auto-routed to the next partner if missed. Contractually agreed.
                </p>
              </div>
            }
          />
          <Card
            n="03"
            title="A trail you keep."
            desc="Every step is logged on a private timeline — request, reply, agreed scope, deliverables. Yours to keep, exportable any time, in any format your auditor needs."
            panel={
              <div>
                <ul className="space-y-2.5">
                  {TIMELINE.map((t) => (
                    <li key={t.label} className="flex items-center gap-3 text-[13px]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span className="w-12 shrink-0 font-semibold text-fg">{t.date}</span>
                      <span className="text-fg-secondary">{t.label}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-center gap-1.5 border-t border-stroke pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-brand">
                  Export <Download size={12} /> <span className="text-fg-tertiary">PDF · CSV · API</span>
                </p>
              </div>
            }
          />
        </motion.div>
      </div>
    </section>
  );
}
