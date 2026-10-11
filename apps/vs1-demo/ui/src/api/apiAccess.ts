import { apiFetch } from './client';
import { myProviderKey } from './provider';
import type {
  ApiAccessResponse, ApiAccessRequest, ApiClientView, ApiKeyIssuedResponse, ApiScope, ApiClientStatus,
  AdminApiClientRow, AdminApiClientPatch, ApiEventType,
} from '@complihub360/types/src/provider';

// ─── Enterprise-API · Zugang des Anbieters und Freigabe des Teams (Phase 7) ──
// Server: services/compliance-api/src/apiRoutes.ts (ADR-0010).
//
//   GET    /provider/:key/api-access       Stand: eligible, Tarif, Client ohne Hash
//   POST   /provider/:key/api-access       Antrag (Name, Zweck, Kontakt, Scopes, Bedingungen)
//   POST   /provider/:key/api-access/key   Schluessel erzeugen oder rotieren — Klartext EINMAL
//   DELETE /provider/:key/api-access       Widerruf
//   GET    /provider/:key/api-access/log   letzte Aufrufe, Tageszahlen, juengste Ereignisse
//   GET    /admin/api-access               alle Clients (Admin)
//   PATCH  /admin/api-clients/:id          approve · reject · suspend · reinstate · revoke · update
//
// Was hier NICHT steht: ein Upgrade-Hinweis. Ist der Tarif nicht berechtigt
// (`eligible: false`), zeigt die Oberflaeche den Abschnitt gar nicht.

export type { ApiAccessResponse, ApiAccessRequest, ApiClientView, ApiKeyIssuedResponse, ApiScope, ApiClientStatus, AdminApiClientRow, AdminApiClientPatch, ApiEventType };

export interface ApiCallRow { id: string; method: string; route: string; status: number; duration_ms: number; at: string }
export interface ApiEventRow { id: string; type: ApiEventType; at: string; booking_id: string | null; data: Record<string, unknown> }
export interface ApiAccessLog { ok: true; calls: ApiCallRow[]; today: { count: number; limited: number; failed: number }; events: ApiEventRow[] }

export async function fetchApiAccess(providerKey?: string): Promise<ApiAccessResponse> {
  const key = providerKey ?? await myProviderKey();
  return apiFetch<ApiAccessResponse>(`/api/v1/provider/${key}/api-access`);
}

export async function requestApiAccess(body: ApiAccessRequest, providerKey?: string): Promise<ApiClientView> {
  const key = providerKey ?? await myProviderKey();
  const r = await apiFetch<{ ok: boolean; client: ApiClientView }>(`/api/v1/provider/${key}/api-access`, { method: 'POST', body: JSON.stringify(body) });
  return r.client;
}

/** Erzeugt (nach Freigabe) oder rotiert (wenn aktiv). Der Klartext steht nur in dieser Antwort. */
export async function issueApiKey(providerKey?: string): Promise<ApiKeyIssuedResponse> {
  const key = providerKey ?? await myProviderKey();
  return apiFetch<ApiKeyIssuedResponse>(`/api/v1/provider/${key}/api-access/key`, { method: 'POST', body: '{}' });
}

export async function revokeApiAccess(providerKey?: string): Promise<ApiClientView> {
  const key = providerKey ?? await myProviderKey();
  const r = await apiFetch<{ ok: boolean; client: ApiClientView }>(`/api/v1/provider/${key}/api-access`, { method: 'DELETE' });
  return r.client;
}

export async function fetchApiAccessLog(providerKey?: string): Promise<ApiAccessLog> {
  const key = providerKey ?? await myProviderKey();
  return apiFetch<ApiAccessLog>(`/api/v1/provider/${key}/api-access/log`);
}

export async function adminListApiClients(status?: ApiClientStatus): Promise<AdminApiClientRow[]> {
  const r = await apiFetch<{ ok: boolean; clients: AdminApiClientRow[] }>(`/api/v1/admin/api-access${status ? `?status=${status}` : ''}`);
  return r.clients;
}

export async function adminDecideApiClient(id: string, patch: AdminApiClientPatch): Promise<AdminApiClientRow> {
  const r = await apiFetch<{ ok: boolean; client: AdminApiClientRow }>(`/api/v1/admin/api-clients/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  return r.client;
}

/** Die Scopes, die der Anbieter beantragen kann — availability:write vergibt nur das Team. */
export const REQUESTABLE_SCOPES: ApiScope[] = ['leads:read', 'leads:write', 'events:read', 'billing:read'];
export const ALL_SCOPES: ApiScope[] = ['leads:read', 'leads:write', 'events:read', 'billing:read', 'availability:write'];
