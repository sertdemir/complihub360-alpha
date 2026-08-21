import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

// KPI codes (CONFIRM_RATE, …) are canonical metric identifiers and stay
// untranslated; only the trend captions are localized.
function buildKpiFixture(t: (k: string) => string) {
  return [
    { label: 'CONFIRM_RATE', value: '87%', trend: { value: '+5%', direction: 'up' as const, label: t('performance.kpiConfirmRateNote') } },
    { label: 'REPLY_RATE', value: '78%', trend: { value: '+4%', direction: 'up' as const, label: t('performance.kpiReplyRateNote') } },
    { label: 'AVG_CONFIRM_TIME', value: '4h 12m', trend: { value: '—', direction: 'neutral' as const, label: t('performance.kpiAvgConfirmNote') } },
    { label: 'AVG_REPLY_TIME', value: '18h', trend: { value: '—', direction: 'neutral' as const, label: t('performance.kpiAvgReplyNote') } },
    { label: 'SLA_BREACH_RATE', value: '3%', trend: { value: '—', direction: 'neutral' as const, label: t('performance.kpiSlaBreachNote') } },
  ];
}

const RANK_FACTORS = [
  { factorKey: 'performance.factorResponseTime', moveKey: 'performance.movePlus3', tone: 'brand' as const, noteKey: 'performance.factorResponseTimeNote' },
  { factorKey: 'performance.factorAcceptanceRate', moveKey: 'performance.movePlus1', tone: 'brand' as const, noteKey: 'performance.factorAcceptanceRateNote' },
  { factorKey: 'performance.factorMatchQuality', moveKey: 'performance.movePlus1', tone: 'brand' as const, noteKey: 'performance.factorMatchQualityNote' },
  { factorKey: 'performance.factorCoverageBreadth', moveKey: 'performance.moveNoChange', tone: 'neutral' as const, noteKey: 'performance.factorCoverageBreadthNote' },
];

// avg_confirm_time / confirm_rate are canonical metric ids — kept as-is.
const QUALITY = [
  { labelKey: 'performance.qualityProfileCompleteness', label: undefined, value: '100%', pct: 100, color: 'accent' as const },
  { labelKey: 'performance.qualityProjectCompletion', label: undefined, value: '96%', pct: 96, color: 'accent' as const },
  { labelKey: 'performance.qualityClientSatisfaction', label: undefined, value: '4.7/5', pct: 94, color: 'accent' as const },
  { labelKey: undefined, label: 'avg_confirm_time', value: '4h 12m', pct: 82, color: 'brand' as const },
  { labelKey: undefined, label: 'confirm_rate', value: '87%', pct: 84, color: 'brand' as const },
];

export function PerformancePage() {
  const { t } = useTranslation('providerws');
  const [rankingOpen, setRankingOpen] = useState(false);
  // Live KPIs when the compliance-api answers; the design fixture otherwise.
  const { data: kpis } = useApiData(fetchPerformanceKpis, buildKpiFixture(t));
  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('performance.title')}</h1>
          <button type="button" className="mt-2 flex shrink-0 items-center gap-1 text-[12px] text-fg-secondary transition-colors hover:text-fg">
            {t('performance.range30d')} <ChevronDown size={12} />
          </button>
        </div>
        <p className="-mt-4 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">
          {t('performance.subtitle')}
        </p>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {kpis.map((k) => (
            <KPICard key={k.label} label={k.label} value={k.value} trend={k.trend} />
          ))}
        </div>

        <Card styleVariant="filled" className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-semibold text-fg">{t('performance.rankingTitle')}</h2>
              <p className="mt-0.5 text-[12px] text-fg-secondary">{t('performance.rankingSub')}</p>
            </div>
            <button type="button" onClick={() => setRankingOpen(true)} className="shrink-0 text-[12px] font-medium text-fg-brand underline-offset-2 hover:underline">{t('performance.whyThisMatters')}</button>
          </div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[240px,1fr]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('performance.currentRankLabel')}</p>
              <p className="mt-1 font-serif text-[44px] font-bold leading-none text-fg-brand">#3</p>
              <p className="mt-2 text-[12px] text-fg-secondary">{t('performance.rankOf')} <span className="text-fg-brand">{t('performance.rankUpFrom')}</span></p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('performance.whatMovesRank')}</p>
              <div className="mt-2 divide-y divide-elevate/5">
                {RANK_FACTORS.map((r) => (
                  <div key={r.factorKey} className="flex items-center gap-3 py-2">
                    <span className="w-56 shrink-0 text-[13px] text-fg">{t(r.factorKey)}</span>
                    <Tag tone={r.tone}>{t(r.moveKey)}</Tag>
                    <span className="truncate text-[12px] text-fg-tertiary">{t(r.noteKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="text-[15px] font-semibold text-fg">
            {t('performance.qualityTitle')} · <span className="text-fg-accent">94 / 100</span>
          </h2>
          <p className="mt-0.5 text-[12px] text-fg-secondary">{t('performance.qualitySub')}</p>
          <div className="mt-4 space-y-4">
            {QUALITY.map((tr) => {
              const label = tr.labelKey ? t(tr.labelKey) : tr.label!;
              return (
                <div key={label}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[12px] font-medium text-fg">{label}</span>
                    <span className="text-[12px] font-medium text-fg-brand">{tr.value}</span>
                  </div>
                  <ProgressBar value={tr.pct} size="sm" color={tr.color} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <RankingImpactDrawer open={rankingOpen} onClose={() => setRankingOpen(false)} />
    </ProviderShell>
  );
}
