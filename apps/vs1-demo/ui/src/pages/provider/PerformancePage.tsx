import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { RankingImpactDrawer } from '../../components/provider/ProviderDrawers';
import { KPICard } from '../../components/ui/Cards';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/Progress';
import { Tag } from '../../components/ui/Tag';
import { useApiData } from '../../lib/useApiData';
import { fetchPerformanceKpis } from '../../api/metrics';

// ─── Provider /performance ────────────────────────────────────────────────────
// Mirrors "Provider Dashboard v1 · /performance (Desktop)" (1911:183): 5 KPI
// cards · ranking-transparency panel (current rank + what moves it) · trust-
// score breakdown bars. Design fixture data until the metrics API lands.

const KPIS = [
  { label: 'CONFIRM_RATE', value: '87%', trend: { value: '+5%', direction: 'up' as const, label: 'of routed requests confirmed' } },
  { label: 'REPLY_RATE', value: '78%', trend: { value: '+4%', direction: 'up' as const, label: 'confirmed → reply sent' } },
  { label: 'AVG_CONFIRM_TIME', value: '4h 12m', trend: { value: '—', direction: 'neutral' as const, label: 'top-quartile <2h' } },
  { label: 'AVG_REPLY_TIME', value: '18h', trend: { value: '—', direction: 'neutral' as const, label: 'top-quartile <12h' } },
  { label: 'SLA_BREACH_RATE', value: '3%', trend: { value: '—', direction: 'neutral' as const, label: 'last 30d · target <5%' } },
];

const RANK_FACTORS = [
  { factor: 'Response time', move: '+3 positions', tone: 'brand' as const, note: 'avg_confirm_time dropped 18% in 30d' },
  { factor: 'Acceptance rate', move: '+1 position', tone: 'brand' as const, note: 'confirm_rate +5% vs prior period' },
  { factor: 'Match quality (client reviews)', move: '+1 position', tone: 'brand' as const, note: '4.7/5 across 12 new reviews' },
  { factor: 'Coverage breadth', move: 'no change', tone: 'neutral' as const, note: '2 markets · 3 domains (DE focus)' },
];

const TRUST = [
  { label: 'Profile completeness', value: '100%', pct: 100, color: 'accent' as const },
  { label: 'Project completion (no cancels)', value: '96%', pct: 96, color: 'accent' as const },
  { label: 'Client satisfaction', value: '4.7/5', pct: 94, color: 'accent' as const },
  { label: 'avg_confirm_time', value: '4h 12m', pct: 82, color: 'brand' as const },
  { label: 'confirm_rate', value: '87%', pct: 84, color: 'brand' as const },
];

export function PerformancePage() {
  const [rankingOpen, setRankingOpen] = useState(false);
  // Live KPIs when the compliance-api answers; the design fixture otherwise.
  const { data: kpis } = useApiData(fetchPerformanceKpis, KPIS);
  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">Performance</h1>
          <button type="button" className="mt-2 flex shrink-0 items-center gap-1 text-[12px] text-fg-secondary transition-colors hover:text-fg">
            Range: 30d <ChevronDown size={12} />
          </button>
        </div>
        <p className="-mt-4 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">
          Canonical KPIs from Provider Flows §12 + ranking transparency. Pre-downgrade warnings surface here AND as a
          sticky banner across all tabs (§7.2).
        </p>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {kpis.map((k) => (
            <KPICard key={k.label} label={k.label} value={k.value} trend={k.trend} />
          ))}
        </div>

        <Card styleVariant="filled" className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-semibold text-fg">Ranking transparency</h2>
              <p className="mt-0.5 text-[12px] text-fg-secondary">Where you stand · what affects it · last 7-day change history</p>
            </div>
            <button type="button" onClick={() => setRankingOpen(true)} className="shrink-0 text-[12px] font-medium text-fg-brand underline-offset-2 hover:underline">Why this matters</button>
          </div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[240px,1fr]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">Current rank · DE · VAT</p>
              <p className="mt-1 font-serif text-[44px] font-bold leading-none text-fg-brand">#3</p>
              <p className="mt-2 text-[12px] text-fg-secondary">of 47 verified partners · <span className="text-fg-brand">↑ from #5 (last week)</span></p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">What moves your rank</p>
              <div className="mt-2 divide-y divide-white/5">
                {RANK_FACTORS.map((r) => (
                  <div key={r.factor} className="flex items-center gap-3 py-2">
                    <span className="w-56 shrink-0 text-[13px] text-fg">{r.factor}</span>
                    <Tag tone={r.tone}>{r.move}</Tag>
                    <span className="truncate text-[12px] text-fg-tertiary">{r.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="text-[15px] font-semibold text-fg">
            Trust score breakdown · <span className="text-fg-accent">94 / 100</span>
          </h2>
          <p className="mt-0.5 text-[12px] text-fg-secondary">Composite of 5 signals · improve lowest to climb fastest</p>
          <div className="mt-4 space-y-4">
            {TRUST.map((t) => (
              <div key={t.label}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[12px] font-medium text-fg">{t.label}</span>
                  <span className="text-[12px] font-medium text-fg-brand">{t.value}</span>
                </div>
                <ProgressBar value={t.pct} size="sm" color={t.color} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <RankingImpactDrawer open={rankingOpen} onClose={() => setRankingOpen(false)} />
    </ProviderShell>
  );
}
