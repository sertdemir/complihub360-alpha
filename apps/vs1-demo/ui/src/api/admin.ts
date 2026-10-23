import { apiFetch } from './client';

// ─── Admin API ────────────────────────────────────────────────────────────────
// GET /api/v1/admin/stats → one aggregated read for the Control Center.
// Seit 20.10.2026 aus Buchungen (`scheduling`), Audit-Log und Nachweisen —
// vorher aus Tabellen, in die nichts mehr schreibt (Rechnung und Begruendung:
// services/compliance-api/src/adminStats.ts). Quoten ohne Grundlage sind null.

export type AdminWatchFlag = 'dispute' | 'reminder_missing' | 'soon' | 'upcoming';

export interface AdminWatchRow {
  id: string;
  provider_key: string;
  slot_start: string;
  flag: AdminWatchFlag;
  msUntil: number;
}

export interface AdminEventRow {
  type: string;
  payload?: Record<string, unknown>;
  created_at?: string | null;
}

export interface AdminSeries {
  /** 7 day labels, oldest → newest, "DD.MM". */
  dates: string[];
  bookings: number[];
  cancelled: number[];
  noShows: number[];
  aiRequests: number[];
  aiRedacted: number[];
  reveals: number[];
}

export type AdminSource = 'scheduling' | 'event_log' | 'provider_evidence';

export interface AdminStats {
  generatedAt: string;
  /** Quellen, deren Lesegrenze erreicht ist — Zahlen daraus sind eine Untergrenze. */
  truncated: AdminSource[];
  bookings: {
    today: number;
    last7: number;
    total: number;
    upcoming7: number;
    cancelled7: number;
    noShows7: number;
    disputesOpen: number;
    unreported: number;
    heldRate: number | null;
    /** Anteil mit Audit-Spur der Offenlegung (lead.revealed / booking_rebooked). */
    disclosureAuditedRate: number | null;
    reminderRate: number | null;
  };
  watchlist: AdminWatchRow[];
  privacy: {
    aiRequests7: number;
    aiRedacted7: number;
    reveals7: number;
    evidenceStored: number;
    evidenceToReview: number;
    /** Upload-Pipeline fuer Kundendokumente ist nicht live — immer null. */
    customerUploads: null;
  };
  security: { rateLimitPerMinute: number; accessEvents7: number; errorEvents7: number };
  events: AdminEventRow[];
  series: AdminSeries;
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
