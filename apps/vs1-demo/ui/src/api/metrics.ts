import { apiFetch } from './client';
import type { StatTrend } from '../components/ui/Stat';

// ─── Metrics API ──────────────────────────────────────────────────────────────
// GET /api/v1/metrics → provider performance KPIs, mapped onto the KPICard rows
// the PerformancePage consumes. Time averages are backend approximations until
// per-transition events exist.

interface MetricsResponse {
  ok: boolean;
  metrics: {
    total: number;
    confirm_rate: number | null;
    reply_rate: number | null;
    sla_breach_rate: number | null;
    avg_confirm_ms: number | null;
    avg_reply_ms: number | null;
  };
}

export interface KpiFixture {
  label: string;
  value: string;
  trend: StatTrend;
}

const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const dur = (ms: number | null) => {
  if (ms == null) return '—';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

export async function fetchPerformanceKpis(): Promise<KpiFixture[]> {
  const { metrics } = await apiFetch<MetricsResponse>('/api/v1/metrics');
  if (!metrics.total) return []; // empty → let the caller keep its fixture
  return [
    { label: 'CONFIRM_RATE', value: pct(metrics.confirm_rate), trend: { value: '—', direction: 'neutral', label: 'of routed requests confirmed' } },
    { label: 'REPLY_RATE', value: pct(metrics.reply_rate), trend: { value: '—', direction: 'neutral', label: 'confirmed → reply sent' } },
    { label: 'AVG_CONFIRM_TIME', value: dur(metrics.avg_confirm_ms), trend: { value: '—', direction: 'neutral', label: 'top-quartile <2h' } },
    { label: 'AVG_REPLY_TIME', value: dur(metrics.avg_reply_ms), trend: { value: '—', direction: 'neutral', label: 'top-quartile <12h' } },
    { label: 'SLA_BREACH_RATE', value: pct(metrics.sla_breach_rate), trend: { value: '—', direction: 'neutral', label: `last ${metrics.total} requests · target <5%` } },
  ];
}
