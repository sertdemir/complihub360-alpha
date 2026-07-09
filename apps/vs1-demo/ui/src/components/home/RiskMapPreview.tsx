import { Lock, Check, Info, ArrowRight } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { RiskBadge, type RiskLevel } from '../ui/RiskBadge';

// Risk-map result preview (Figma 1694:1789) at the SAME 760×588 footprint as the
// AnimatedWizard, so the hero can cross-fade wizard → result without any reflow.
// Light window chrome · eyebrow + title · stat strip · obligation table (clipped).

const STATS = [
  { n: '8', l: 'obligations' },
  { n: '€25k', l: 'total exposure' },
  { n: '14 days', l: 'median deadline' },
  { n: '3', l: 'partners ready' },
] as const;

type State = { kind: 'confirmed' | 'likely' | 'action'; label: string };

const ROWS: {
  level: RiskLevel;
  sev: string;
  title: string;
  detail: string;
  market: string;
  due: string;
  dueSub: string;
  state: State;
}[] = [
  { level: 'critical', sev: 'Critical', title: 'OSS quarterly return', detail: 'Last filed: Q1 2025 · Penalty: €5,000 + 1%/mo · UStG §18i', market: 'DE · NL', due: 'Apr 30', dueSub: '6 days', state: { kind: 'confirmed', label: 'Confirmed' } },
  { level: 'critical', sev: 'Critical', title: 'VAT registration — UK', detail: 'Post-Brexit threshold check · up to €20,000 · VATA §3', market: 'UK', due: 'May 15', dueSub: '21 days', state: { kind: 'likely', label: 'Likely' } },
  { level: 'critical', sev: 'Critical', title: 'EPR packaging registration (LUCID)', detail: 'Producer status to confirm · up to €50,000 · VerpackG', market: 'DE', due: 'May 02', dueSub: '8 days', state: { kind: 'likely', label: 'Likely' } },
  { level: 'high', sev: 'High', title: 'EPR registration renewal (PackUK)', detail: 'Last filed: Apr 2024 · 4% of UK revenue · Packaging Regs', market: 'UK', due: 'May 15', dueSub: '21 days', state: { kind: 'likely', label: 'Likely' } },
  { level: 'high', sev: 'High', title: 'Cookie banner + consent records', detail: 'B2C EU users required · GDPR Art. 6/7 · TTDSG §25', market: 'EU-wide', due: 'Ongoing', dueSub: 'Live', state: { kind: 'confirmed', label: 'Confirmed' } },
  { level: 'medium', sev: 'Medium', title: 'DPIA for tracking pixels', detail: 'Depends on tracking stack · GDPR Art. 35', market: 'EU-wide', due: '—', dueSub: 'Depends on tools', state: { kind: 'action', label: 'Answer 2 questions' } },
  { level: 'medium', sev: 'Medium', title: 'Reverse-charge mechanism', detail: 'Cross-border B2B share >0 · UStG §13b', market: 'DE · NL', due: '—', dueSub: 'Depends on mix', state: { kind: 'action', label: 'Answer 2 questions' } },
];

const COLS = 'grid grid-cols-[78px_1fr_64px_72px_124px] items-center gap-2';

function StateCell({ state }: { state: State }) {
  if (state.kind === 'action') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-1 text-[10px] font-semibold text-fg-on-brand">
        {state.label} <ArrowRight size={11} />
      </span>
    );
  }
  if (state.kind === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-1 text-[10px] font-medium text-fg-secondary">
        <Check size={11} className="text-fg-brand" /> {state.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-stroke px-2 py-1 text-[10px] font-medium text-fg-secondary">
      <Info size={11} /> {state.label}
    </span>
  );
}

export function RiskMapPreview() {
  return (
    <div className="relative flex h-[588px] w-[760px] flex-col overflow-hidden rounded-[20px] border border-stroke-subtle bg-surface">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-stroke-subtle px-7 py-3">
        <Logo lockup="horizontal" tone="on-light" href={null} markClassName="h-7" />
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">
          <Lock size={12} /> Guest map · expires in 30 min
        </span>
      </div>

      {/* Header + stats */}
      <div className="px-7 pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-brand">Your risk map</p>
        <h3 className="mt-1 font-serif text-[22px] font-bold leading-tight text-fg">Here&rsquo;s what applies to you.</h3>
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-1 rounded-xl bg-surface-secondary px-5 py-2.5">
          {STATS.map((s) => (
            <span key={s.l} className="text-[13px]">
              <b className="font-bold text-fg">{s.n}</b> <span className="text-fg-secondary">{s.l}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Obligation table (clipped to the window) */}
      <div className="mt-3 flex-1 overflow-hidden px-7 pb-2">
        <div className="overflow-hidden rounded-xl border border-stroke">
          <div className={`${COLS} bg-surface-secondary px-4 py-2 text-[9px] font-semibold uppercase tracking-wide text-fg-tertiary`}>
            <span>Severity</span>
            <span>Obligation</span>
            <span>Market</span>
            <span>Due</span>
            <span>State</span>
          </div>
          {ROWS.map((r) => (
            <div key={r.title} className={`${COLS} border-t border-stroke px-4 py-2.5`}>
              <span>
                <RiskBadge level={r.level} size="sm">{r.sev}</RiskBadge>
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-fg">{r.title}</p>
                <p className="truncate text-[10px] text-fg-tertiary">{r.detail}</p>
              </div>
              <span className="text-[11px] text-fg-secondary">{r.market}</span>
              <span>
                <p className="text-[11px] font-semibold text-fg">{r.due}</p>
                <p className="text-[9px] text-fg-tertiary">{r.dueSub}</p>
              </span>
              <StateCell state={r.state} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
