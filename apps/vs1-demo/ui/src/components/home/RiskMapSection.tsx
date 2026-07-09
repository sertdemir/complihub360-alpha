import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Lock, Check, Info, ArrowRight } from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { RiskBadge, type RiskLevel } from '../ui/RiskBadge';
import { Stat } from '../ui/Stat';
import { SectionEyebrow, GoldWord } from '../providers/SectionHeading';

// ─── S2 — Risk Map example (User LP) · Figma 2470:1774 ───────────────────────
// "Here's what applies to you." — an anonymized full risk-map result inline on
// the landing: stat strip · obligation table · locked partner matches · save CTA.
// Light section; severities use the petrol RiskBadge scale (never red).

// Compass "Stat" (1100:2): eyebrow label over a large tabular value.
const STATS = [
  { value: '8', label: 'Obligations identified' },
  { value: '€25k', label: 'Total exposure' },
  { value: '14 days', label: 'Median deadline' },
  { value: '3', label: 'Verified Partners ready' },
] as const;

type RowState = { kind: 'confirmed' | 'likely' | 'action'; label: string };

const ROWS: {
  level: RiskLevel;
  sev: string;
  title: string;
  detail: string;
  market: string;
  due: string;
  dueSub: string;
  state: RowState;
}[] = [
  { level: 'critical', sev: 'Critical', title: 'OSS quarterly return', detail: 'Last filed: Q1 2025 · Penalty: €5,000 + 1%/month · UStG §18i (OSS)', market: 'DE · NL', due: 'Apr 30', dueSub: '6 days', state: { kind: 'confirmed', label: 'Confirmed' } },
  { level: 'critical', sev: 'Critical', title: 'VAT registration — UK', detail: 'Post-Brexit threshold check needed · Penalty: up to €20,000 · UK VATA 1994 §3', market: 'UK', due: 'May 15', dueSub: '21 days', state: { kind: 'likely', label: 'Likely' } },
  { level: 'critical', sev: 'Critical', title: 'EPR packaging registration (LUCID)', detail: 'Producer status to confirm · Penalty: up to €50,000 · VerpackG Art. 9 Abs. 1', market: 'DE', due: 'May 02', dueSub: '8 days', state: { kind: 'likely', label: 'Likely' } },
  { level: 'high', sev: 'High', title: 'EPR registration renewal (PackUK)', detail: 'Last filed: Apr 2024 · Penalty: 4% of UK revenue · UK Packaging Regs. 2023 §7', market: 'UK', due: 'May 15', dueSub: '21 days', state: { kind: 'likely', label: 'Likely' } },
  { level: 'high', sev: 'High', title: 'Cookie banner + consent records', detail: 'B2C EU users → required · GDPR Art. 6/7 · TTDSG §25', market: 'EU-wide', due: 'Ongoing', dueSub: 'Live', state: { kind: 'confirmed', label: 'Confirmed' } },
  { level: 'medium', sev: 'Medium', title: 'DPIA for tracking pixels', detail: 'Depends on tracking stack · GDPR Art. 35', market: 'EU-wide', due: '—', dueSub: 'Depends on tools', state: { kind: 'action', label: 'Answer 2 questions' } },
  { level: 'medium', sev: 'Medium', title: 'Reverse-charge mechanism', detail: 'Applies only if cross-border B2B share >0 · UStG §13b', market: 'DE · NL', due: '—', dueSub: 'Depends on B2B mix', state: { kind: 'action', label: 'Answer 2 questions' } },
  { level: 'medium', sev: 'Medium', title: 'Beneficial-owner update', detail: 'Last filed: Mar 2025 · Penalty: €1,000–5,000 · GwG §20 Abs. 1', market: 'DE', due: 'Jun 30', dueSub: 'ongoing', state: { kind: 'confirmed', label: 'Confirmed' } },
];

const MATCHES = ['94% match', '88% match', '81% match'] as const;

const COLS = 'sm:grid sm:grid-cols-[100px_1fr_92px_92px_168px] sm:items-center sm:gap-3';

function StateCell({ state }: { state: RowState }) {
  if (state.kind === 'action') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12px] font-semibold text-fg-on-brand">
        {state.label} <ArrowRight size={13} />
      </span>
    );
  }
  if (state.kind === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5 text-[12px] font-medium text-fg-secondary">
        <Check size={13} className="text-fg-brand" /> {state.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke px-3 py-1.5 text-[12px] font-medium text-fg-secondary">
      <Info size={13} /> {state.label}
    </span>
  );
}

export function RiskMapSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="risk-map" className="bg-surface pt-20 lg:pt-28">
      <Container size="xl">
        {/* Heading */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">What a risk map looks like · anonymized example</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
            Here&rsquo;s what <GoldWord>applies</GoldWord> to you.
          </h2>
          <p className="text-body text-fg-secondary">
            Based on Germany · United Kingdom · Netherlands. D2C e-commerce, €2M—€5M revenue. VAT · EPR · Privacy in scope.
          </p>
        </div>

        {/* Stat strip — Compass Stat (1100:2), single line, same width as the table below */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-xl border border-stroke-subtle bg-surface-secondary px-10 py-6 shadow-[0_18px_44px_-24px_rgba(2,22,17,0.28)]">
          {STATS.map((s) => (
            <Stat
              key={s.label}
              value={<span className="text-accent-600">{s.value}</span>}
              label={s.label}
              size="md"
            />
          ))}
        </div>

        {/* Obligation table */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mt-8 overflow-hidden rounded-xl border border-stroke bg-surface shadow-[0_50px_110px_-28px_rgba(2,22,17,0.36)]"
        >
          <div className={`hidden px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary sm:px-6 ${COLS} sm:bg-surface-secondary`}>
            <span>Severity</span>
            <span>Obligation</span>
            <span>Market</span>
            <span>Due</span>
            <span>State</span>
          </div>
          {ROWS.map((r) => (
            <div key={r.title} className={`border-t border-stroke px-5 py-4 first:border-t-0 sm:border-t sm:px-6 ${COLS}`}>
              <span className="mb-2 inline-block sm:mb-0">
                <RiskBadge level={r.level} size="sm">{r.sev}</RiskBadge>
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-fg">{r.title}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-primary-600">{r.detail}</p>
              </div>
              <span className="mt-2 block text-[12px] text-fg-secondary sm:mt-0">{r.market}</span>
              <span className="mt-1 block sm:mt-0">
                <span className="text-[13px] font-semibold text-fg">{r.due}</span>{' '}
                <span className="text-[11px] text-fg-tertiary sm:block">{r.dueSub}</span>
              </span>
              <span className="mt-3 block sm:mt-0">
                <StateCell state={r.state} />
              </span>
            </div>
          ))}
        </motion.div>

        {/* Partners */}
        <div className="mt-14">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-fg-brand">3 Verified Partners matched</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-serif text-[24px] font-bold tracking-tight text-fg">We&rsquo;ve found who can act on this.</h3>
            <a className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-fg-brand">
              <Lock size={13} /> Unlock matches with a free account →
            </a>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {MATCHES.map((m) => (
              <div
                key={m}
                className="rounded-xl border border-stroke-subtle bg-surface-secondary px-6 py-8 text-center shadow-[0_24px_60px_-28px_rgba(2,22,17,0.25)]"
              >
                <Lock size={18} className="mx-auto text-fg-tertiary" />
                <div className="mx-auto mt-4 h-2.5 w-3/5 rounded bg-neutral-300/70" />
                <div className="mx-auto mt-2 h-2.5 w-2/5 rounded bg-neutral-300/70" />
                <p className="mt-4 text-[14px] font-semibold text-fg-brand">{m}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>

      {/* Save CTA band — full width */}
      <div className="mt-16 bg-surface-secondary px-6 py-14 text-center lg:py-16">
        <h3 className="font-serif text-[26px] font-bold tracking-tight text-fg">Save this map. Unlock the partners.</h3>
        <p className="mx-auto mt-2 text-[14px] text-fg-secondary">
          Free account. No credit card. Founding-member access through Beta launch.
        </p>
        <Button className="mt-7 bg-accent-500 text-primary-900 hover:bg-accent-600">
          Create free account <ArrowRight size={16} className="ml-1.5" />
        </Button>
      </div>
    </section>
  );
}
