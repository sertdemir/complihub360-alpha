import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { GoldWord } from '../providers/SectionHeading';

// ─── S7 — Beyond the Assessment · Figma 1229:157 ────────────────────────────
// "From one-time check to home base." A bento grid: a hero card (your persistent
// workspace) beside a stacked pair — live regulatory news + expert content (the
// Beta card carries the gold frame). The assessment is the door; this is the room.

const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

const STATS = [
  { label: 'Risk Map', value: '8 priorities' },
  { label: 'Engagements active', value: '2' },
  { label: 'Verified Partners matched', value: '3' },
  { label: 'Trail entries', value: '47' },
];

const NEWS = [
  { tag: 'DE · VAT', text: 'OSS threshold updated for Q3' },
  { tag: 'UK · EPR', text: 'PackUK opens 2026 register' },
];

function Pill({ children, tone }: { children: React.ReactNode; tone: 'live' | 'beta' }) {
  return tone === 'live' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-brand">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      {children}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-accent-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-700 ring-1 ring-inset ring-accent-200">
      {children}
    </span>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <p className="font-serif text-[2.25rem] font-bold leading-none text-fg-brand">{children}</p>;
}

export function BeyondAssessment() {
  return (
    <section id="beyond" className="bg-surface py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1320px] px-4 md:px-6 lg:px-10">
        {/* Header */}
        <motion.div
          className="max-w-3xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-brand">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            Beyond the assessment
          </span>
          <h2 className="mt-4 font-serif text-[2rem] font-bold leading-[1.1] tracking-tight text-fg sm:text-[3rem]">
            From one-time check to <GoldWord>home base</GoldWord> for everything compliance.
          </h2>
          <p className="mt-5 max-w-xl text-body leading-relaxed text-fg-secondary">
            The assessment is free. What comes after — your workspace, live news, expert content, your partners — is what
            makes CompliHub the place you come back to.
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          className="mt-12 grid gap-6 lg:grid-cols-[1.55fr_1fr]"
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {/* 01 — Workspace hero */}
          <motion.div
            variants={item}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col rounded-3xl border border-stroke-subtle bg-surface-secondary p-8 lg:p-10"
          >
            <div className="flex items-start justify-between">
              <Num>01</Num>
              <Pill tone="live">Available today</Pill>
            </div>

            <div className="mt-7 rounded-2xl border border-stroke-subtle bg-surface p-6">
              <ul className="space-y-4">
                {STATS.map((s) => (
                  <li key={s.label} className="flex items-center justify-between">
                    <span className="text-[14px] text-fg-secondary">{s.label}</span>
                    <span className="text-[14px] font-bold text-fg">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <h3 className="mt-8 font-serif text-[26px] font-bold leading-[1.2] text-fg">
              Your map. Your partners. Your trail. Persistent.
            </h3>
            <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-fg-secondary">
              The assessment becomes a saved dossier. Your engagement timeline lives in your dashboard. Provider
              relationships, compliance trail, risk map — all in one place, all yours.
            </p>
          </motion.div>

          {/* Right column — 02 News + 03 Learn */}
          <div className="grid gap-6">
            {/* 02 — News */}
            <motion.div
              variants={item}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="rounded-3xl border border-stroke-subtle bg-surface-secondary p-7"
            >
              <Num>02</Num>
              <div className="mt-6 rounded-2xl border border-stroke-subtle bg-surface p-4">
                <ul className="space-y-3">
                  {NEWS.map((n) => (
                    <li key={n.tag} className="flex items-baseline gap-2.5 text-[13px]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span className="shrink-0 font-semibold text-fg-brand">{n.tag}</span>
                      <span className="text-fg-secondary">{n.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <h3 className="mt-6 font-serif text-[22px] font-bold leading-tight text-fg">Updates that affect you.</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-fg-secondary">
                Real-time alerts when regulators move in markets you operate in. Curated by domain, scoped to your
                operation.
              </p>
            </motion.div>

            {/* 03 — Learn (gold frame) */}
            <motion.div
              variants={item}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="rounded-3xl border border-accent-300 bg-surface-secondary p-7"
            >
              <div className="flex items-start justify-between">
                <Num>03</Num>
                <Pill tone="beta">Launching with Beta</Pill>
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-stroke-subtle bg-surface p-3">
                <span className="grid h-10 w-16 shrink-0 place-items-center rounded-lg bg-brand text-white">
                  <Play size={16} fill="currentColor" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">Webinar · 24 min</p>
                  <p className="mt-0.5 truncate text-[14px] font-bold text-fg">Cross-border VAT for D2C</p>
                </div>
              </div>
              <h3 className="mt-6 font-serif text-[22px] font-bold leading-tight text-fg">Learn from the pros.</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-fg-secondary">
                Webinars with regulators. Tutorials from specialists. Experts you&rsquo;d recognize from YouTube.
              </p>
            </motion.div>
          </div>
        </motion.div>

        <p className="mt-8 text-[13px] leading-relaxed text-fg-tertiary">
          Workspace available today. News &amp; content library launching with Beta — early registrants get
          founding-member access.
        </p>
      </div>
    </section>
  );
}
