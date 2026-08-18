import React from 'react';
import { Lock, ArrowRight, Check, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WizardScreen } from './WizardScreen';
import { Button } from '../ui/Button';
import { RiskBadge, type RiskLevel } from '../ui/RiskBadge';

// ─── RiskMapResult — wizard RESULT screen (Risk Map) ──────────────────────────
// Mode-aware (light + .dark) result page. No step rail, no footer. Stat strip ·
// risk table (petrol RiskBadge severities, never red) · locked partner cards ·
// bottom conversion band. Token-driven surfaces; gold = accent-500 + primary-900.

// ─── State pills used in the table's STATE column ─────────────────────────────
function ConfirmedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-fg-secondary">
      <Check size={12} /> Confirmed
    </span>
  );
}

function LikelyPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-stroke px-2.5 py-1 text-[11px] font-semibold text-fg-tertiary">
      <Info size={12} /> Likely
    </span>
  );
}

function AnswerButton() {
  return (
    <Button size="sm" variant="primary" className="bg-brand text-fg-on-brand hover:bg-brand">
      Answer 2 questions →
    </Button>
  );
}

interface Row {
  level: RiskLevel;
  obligation: string;
  detail: string;
  market: string;
  due: string;
  state: React.ReactNode;
}

const ROWS: Row[] = [
  {
    level: 'critical',
    obligation: 'OSS quarterly return',
    detail: 'Last filed: Q1 2025 · Penalty: €5,000 + 1%/month · UStG §18i (OSS)',
    market: 'DE · NL',
    due: 'Apr 30 / 6 days',
    state: <ConfirmedPill />,
  },
  {
    level: 'critical',
    obligation: 'VAT registration — UK',
    detail: 'Post-Brexit threshold check needed · Penalty: up to €20,000 · UK VATA 1994 §3',
    market: 'UK',
    due: 'May 15 / 21 days',
    state: <LikelyPill />,
  },
  {
    level: 'critical',
    obligation: 'EPR packaging registration (LUCID)',
    detail: 'Producer status to confirm · Penalty: up to €50,000 · VerpackG Art. 9 Abs. 1',
    market: 'DE',
    due: 'May 02 / 8 days',
    state: <LikelyPill />,
  },
  {
    level: 'high',
    obligation: 'EPR registration renewal (PackUK)',
    detail: 'Last filed: Apr 2024 · Penalty: 4% of UK revenue · UK Packaging Regs. 2023 §7',
    market: 'UK',
    due: 'May 15 / 21 days',
    state: <LikelyPill />,
  },
  {
    level: 'high',
    obligation: 'Cookie banner + consent records',
    detail: 'B2C EU users + required · GDPR Art. 6/7 · TTDSG §25',
    market: 'EU-wide',
    due: 'Ongoing / Live',
    state: <ConfirmedPill />,
  },
  {
    level: 'medium',
    obligation: 'DPIA for tracking pixels',
    detail: 'Depends on tracking stack · GDPR Art. 35',
    market: 'EU-wide',
    due: '— / Depends on tools',
    state: <AnswerButton />,
  },
  {
    level: 'medium',
    obligation: 'Reverse-charge mechanism',
    detail: 'Applies only if cross-border B2B share >0 · UStG §13b',
    market: 'DE · NL',
    due: '— / depends on B2B mix',
    state: <AnswerButton />,
  },
  {
    level: 'medium',
    obligation: 'Beneficial-owner update',
    detail: 'Last filed: Mar 2025 · Penalty: €1,000–5,000 · GwG §20 Abs. 1',
    market: 'DE',
    due: 'Jun 30 / ongoing',
    state: <ConfirmedPill />,
  },
];

// Storybook-only screen showcase. Kept in step with the live risk map so the
// design reference does not drift back into fear-first framing (Brand Map §11).
const STATS: { value: string; label: string }[] = [
  { value: '8', label: 'obligations identified' },
  { value: '4', label: 'with a deadline in 30 days' },
  { value: '14 days', label: 'median deadline' },
  { value: '3', label: 'Verified Partners ready' },
];

const PARTNERS = [94, 88, 81];

export function RiskMapResult() {
  return (
    <WizardScreen
      eyebrow="Your risk map"
      title="Here's what applies to you."
      subtitle="Based on Germany · United Kingdom · Netherlands. D2C e-commerce, €2M—€5M revenue. VAT · EPR · Privacy in scope."
      topbarRight={
        <>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-fg-tertiary">
            <Lock size={13} /> Guest map · expires in 30 min
          </span>
          <Button className="bg-accent-500 text-fg-on-accent hover:bg-accent-600">
            Save this map <ArrowRight size={14} className="ml-1.5" />
          </Button>
        </>
      }
    >
      {/* 1 — Stat strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 rounded-xl bg-surface-secondary px-6 py-4">
        {STATS.map((s) => (
          <span key={s.label}>
            <span className="text-[20px] font-bold text-fg">{s.value}</span>{' '}
            <span className="text-[13px] text-fg-secondary">{s.label}</span>
          </span>
        ))}
      </div>

      {/* 2 — Risk table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-stroke">
        {/* Header row */}
        <div className="hidden grid-cols-[90px_1fr_90px_90px_140px] gap-4 bg-surface-secondary px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary sm:grid">
          <span>Severity</span>
          <span>Obligation</span>
          <span>Market</span>
          <span>Due</span>
          <span>State</span>
        </div>

        <div className="divide-y divide-stroke">
          {ROWS.map((r) => (
            <div
              key={r.obligation}
              className="grid grid-cols-1 gap-2 px-4 py-3.5 sm:grid-cols-[90px_1fr_90px_90px_140px] sm:items-center sm:gap-4"
            >
              {/* Severity */}
              <div className="flex items-start">
                <RiskBadge level={r.level} size="sm">
                  {r.level.charAt(0).toUpperCase() + r.level.slice(1)}
                </RiskBadge>
              </div>

              {/* Obligation + detail */}
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-fg">{r.obligation}</p>
                <p className="mt-0.5 text-[12px] text-fg-tertiary">{r.detail}</p>
              </div>

              {/* Market */}
              <div className="text-[12px] text-fg-secondary">
                <span className="font-medium uppercase tracking-wide text-fg-tertiary sm:hidden">Market: </span>
                {r.market}
              </div>

              {/* Due */}
              <div className="text-[12px] text-fg-secondary">
                <span className="font-medium uppercase tracking-wide text-fg-tertiary sm:hidden">Due: </span>
                {r.due}
              </div>

              {/* State */}
              <div className="flex items-center">{r.state}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 — Partners section */}
      <p className="mt-10 text-[11px] font-semibold uppercase tracking-wide text-fg-brand">3 Verified Partners matched</p>
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-[22px] font-bold text-fg">We've found who can act on this.</h3>
        <a className="flex items-center gap-1.5 text-[13px] font-medium text-fg-brand" href="#">
          <Lock size={13} /> Unlock matches with a free account →
        </a>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {PARTNERS.map((match) => (
          <div key={match} className="rounded-xl bg-surface-secondary p-6 text-center">
            <Lock size={20} className="mx-auto text-fg-tertiary" />
            <div className="mt-4 flex flex-col items-center gap-2">
              <span className="h-2.5 w-[60%] rounded bg-neutral-300 dark:bg-white/10" />
              <span className="h-2.5 w-[40%] rounded bg-neutral-300 dark:bg-white/10" />
            </div>
            <p className="mt-3 text-[14px] font-semibold text-fg-brand">{match}% match</p>
          </div>
        ))}
      </div>

      {/* 4 — Bottom CTA band */}
      <div className="mt-12 rounded-2xl bg-surface-secondary px-6 py-10 text-center">
        <h3 className="font-serif text-[24px] font-bold text-fg">Save this map. Unlock the partners.</h3>
        <p className="mt-2 text-[14px] text-fg-secondary">
          Free account. No credit card. Founding-member access through Beta launch.
        </p>
        <div className="mt-6 flex justify-center">
          <Button className="bg-accent-500 text-fg-on-accent hover:bg-accent-600">
            Create free account <ArrowRight size={16} className="ml-1.5" />
          </Button>
        </div>
      </div>
    </WizardScreen>
  );
}
