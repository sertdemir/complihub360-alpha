import { apiFetch } from './client';

// ─── Admin API ────────────────────────────────────────────────────────────────
// GET /api/v1/admin/stats → one aggregated read for the Control Center
// (engagements funnel + SLA watchlist + privacy pipeline + audit feed).

export interface AdminWatchRow {
  id: string;
  provider_key: string;
  country: string;
  category: string;
  status: string;
  deadline?: string;
  msLeft: number | null;
}

export interface AdminEventRow {
  type: string;
  payload?: Record<string, unknown>;
  created_at?: string;
}

export interface AdminStats {
  stats: {
    requestsToday: number;
    requestsTotal: number;
    confirmRate: number | null;
    replyRate: number | null;
    avgConfirmMs: number | null;
    breaches: number;
  };
  watchlist: AdminWatchRow[];
  privacy: {
    uploads: number;
    piiRedacted: number;
    consentRate: number | null;
    aiBlocks: number;
  };
  security: {
    invalidTokenBlocks: number;
    aiGateBlocks: number;
  };
  events: AdminEventRow[];
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { ok: _ok, ...data } = await apiFetch<{ ok: boolean } & AdminStats>('/api/v1/admin/stats');
  return data as AdminStats;
}

export function fmtMsLeft(msLeft: number | null): string {
  if (msLeft === null) return '—';
  if (msLeft < 0) return 'overdue';
  const h = Math.floor(msLeft / 3_600_000);
  const m = Math.floor((msLeft % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function fmtHours(ms: number | null): string {
  if (!ms) return '—';
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

export function relTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))} min ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
