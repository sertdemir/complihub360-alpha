import { apiFetch } from './client';

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

export type Metrics = MetricsResponse['metrics'];

/** Die rohen Kennzahlen. Bei `total = 0` kommt die echte Null zurueck —
 *  bis TKT-PROV-12 gab es hier `[]` als Signal, die Fixture zu behalten. */
export async function fetchMetrics(): Promise<Metrics> {
  const { metrics } = await apiFetch<MetricsResponse>('/api/v1/metrics');
  return metrics;
}

/** Ab so vielen Anfragen zeigt die Seite Quoten (Canvas-Wahl C3, Nutzer
 *  09.10.2026). Nur Anzeige — das Ranking rechnet unabhaengig davon. */
export const RATE_THRESHOLD = 5;

export const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
export const dur = (ms: number | null) => {
  if (ms == null) return '—';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};
