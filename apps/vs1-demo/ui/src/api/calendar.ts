import { apiFetch } from './client';
import { myProviderKey } from './provider';

// ─── Kalender verbinden (Nylas Hosted Auth) ──────────────────────────────────
// Server: services/compliance-api/src/nylasAuth.ts. Der Anbieter startet die
// Anmeldung bei Google/Microsoft ueber eine Auth-URL; der Rueckweg landet auf
// /partner-dashboard/settings?calendar=connected|failed.

export interface CalendarStatus {
  /** Hosted Auth eingerichtet (NYLAS_* in der API-Env). */
  configured: boolean;
  connected: boolean;
  /** Adresse des verbundenen Kontos. */
  email: string | null;
}

export async function fetchCalendar(): Promise<CalendarStatus> {
  const key = await myProviderKey();
  return apiFetch<CalendarStatus>(`/api/v1/provider/${key}/calendar`);
}

/** Auth-URL; 503 (ApiError) heisst: noch nicht eingerichtet. */
export async function startCalendarConnect(locale: string): Promise<string> {
  const key = await myProviderKey();
  const r = await apiFetch<{ url: string }>(`/api/v1/provider/${key}/calendar/connect`, {
    method: 'POST',
    body: JSON.stringify({ locale }),
  });
  return r.url;
}

export async function disconnectCalendar(): Promise<void> {
  const key = await myProviderKey();
  await apiFetch(`/api/v1/provider/${key}/calendar`, { method: 'DELETE' });
}
