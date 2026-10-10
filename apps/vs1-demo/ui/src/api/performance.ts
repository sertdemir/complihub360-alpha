import { apiFetch, ApiError } from './client';
import { myProviderKey } from './provider';
import { isMockApi } from '../lib/supabase';
import type {
  ProviderPerformanceResponse, ProviderOverviewResponse, PerformanceFacts, PerformanceCounted,
  ProviderEnforcement, OverviewTask, AnalyticsLevel, PerformanceTrendRow,
} from '@complihub360/types/src/provider';

// ─── Performance aus Fakten · Übersicht (Phase 6, ADR-0009) ───────────────────
// Server: services/compliance-api/src/performanceRoutes.ts.
//
//   GET /provider/:key/performance   Buchungs-Fakten der letzten 90 Tage, jede
//                                    Zahl mit `count`, `of`, `rate` (Quote erst
//                                    ab rate_min_bookings); `trends` nur ab
//                                    enhanced; `?format=csv` nur ab advanced.
//   GET /provider/:key/overview      Spec B „Overview": Status, Tarif, Leads,
//                                    Guthaben, naechste Termine, Aufgaben.
//   POST …/enforcement/:id/appeal    Einspruch gegen eine Buchungspause.
//
// Was hier NICHT steht: ein „Score". Die Seite zeigt Fakten und ihre Basis;
// das Ranking rechnet mit denselben Fakten, und was fehlt, zaehlt dort
// neutral (Spec A §17).

export type {
  ProviderPerformanceResponse, ProviderOverviewResponse, PerformanceFacts, PerformanceCounted,
  ProviderEnforcement, OverviewTask, AnalyticsLevel, PerformanceTrendRow,
};

export async function fetchPerformance(providerKey?: string): Promise<ProviderPerformanceResponse> {
  const key = providerKey ?? await myProviderKey();
  return apiFetch<ProviderPerformanceResponse>(`/api/v1/provider/${key}/performance`);
}

export async function fetchOverview(providerKey?: string): Promise<ProviderOverviewResponse> {
  const key = providerKey ?? await myProviderKey();
  return apiFetch<ProviderOverviewResponse>(`/api/v1/provider/${key}/overview`);
}

/** CSV-Export (nur `advanced`). Antwortet der Server 403 ANALYTICS_LEVEL, wirft ApiError. */
export async function fetchPerformanceCsv(providerKey?: string): Promise<string> {
  const key = providerKey ?? await myProviderKey();
  const base = isMockApi ? '' : ((import.meta.env.VITE_API_URL as string | undefined) || '');
  const { getAccessToken } = await import('../lib/supabase');
  const token = await getAccessToken();
  const res = await fetch(`${base}/api/v1/provider/${key}/performance?format=csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new ApiError(String(body.message ?? `HTTP ${res.status}`), res.status, String(body.correlationId ?? ''), undefined, body);
  }
  // Der Mock antwortet immer JSON; dort steht die Datei im Feld `csv`.
  if ((res.headers.get('content-type') ?? '').includes('json')) {
    const body = (await res.json()) as { csv?: string };
    return body.csv ?? '';
  }
  return res.text();
}

export async function appealEnforcement(id: string, note: string, providerKey?: string): Promise<ProviderEnforcement> {
  const key = providerKey ?? await myProviderKey();
  const r = await apiFetch<{ ok: boolean; enforcement: ProviderEnforcement }>(`/api/v1/provider/${key}/enforcement/${id}/appeal`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  return r.enforcement;
}

/** „9 von 12" — Zaehler mit Basis; ohne Basis nur der Zaehler. */
export function countedLabel(c: PerformanceCounted, ofWord: string): string {
  return c.of > 0 ? `${c.count} ${ofWord} ${c.of}` : String(c.count);
}

/** Quote als Prozent, oder null, wenn die Stichprobe nicht reicht. */
export function ratePct(c: PerformanceCounted): string | null {
  return c.rate == null ? null : `${Math.round(c.rate * 100)} %`;
}
