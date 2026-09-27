import { apiFetch } from './client';
import { getAccessToken } from '../lib/supabase';

// ─── Provider profile API (wiring map B5) ────────────────────────────────────
// Coverage read + market add.

// ─── Welcher Anbieter bin ich? ───────────────────────────────────────────────
// Bis 2026-09-22 war der ganze Workspace fest auf 'dahlmann-cpa' verdrahtet —
// jeder Partner-Login sah und aenderte denselben Anbieter. Jetzt fragt die UI
// die API (GET /api/v1/me/provider, Grundlage provider_members) und nimmt den
// Anbieter, der zu DIESEM Login gehoert. Gehoert der Login zu keinem, wirft
// der Aufruf — die Seiten zeigen dann ihren Leerzustand statt fremder Daten.
//
// Ein Demo-Anbieter ohne Zuordnung nur noch explizit fuer die lokale
// Entwicklung: VITE_DEMO_PROVIDER_KEY=dahlmann-cpa. Der Mock-Modus
// (VITE_MOCK_API=1) liefert /me/provider selbst.

let resolved: { token: string | null; key: Promise<string> } | null = null;

export interface MyProvider { provider_key: string; role: string; name: string | null; lifecycle_status: string | null }

/** GET /me/provider ungecacht — fuer Stellen, die den Lebenszyklus brauchen, nicht nur den Schluessel. */
export async function fetchMyProvider(): Promise<MyProvider & { lifecycle_status: import('./application').LifecycleStatus }> {
  const r = await apiFetch<{ ok: boolean } & MyProvider>('/api/v1/me/provider');
  return { ...r, lifecycle_status: (r.lifecycle_status ?? 'draft') as import('./application').LifecycleStatus };
}

export async function myProviderKey(): Promise<string> {
  const token = await getAccessToken();
  // Pro Login cachen: meldet sich jemand anderes an, gilt der alte Schluessel nicht.
  if (!resolved || resolved.token !== token) {
    const key = apiFetch<{ ok: boolean; provider_key: string }>('/api/v1/me/provider')
      .then((r) => r.provider_key)
      .catch((err: unknown) => {
        resolved = null;
        const demo = import.meta.env.DEV ? (import.meta.env.VITE_DEMO_PROVIDER_KEY as string | undefined) : undefined;
        if (demo) return demo;
        throw err;
      });
    resolved = { token, key };
  }
  return resolved.key;
}

export interface ProviderCoverage {
  provider_key: string;
  name: string;
  countries_supported: string[];
  languages: string[];
  sla_target_confirm_hours: number;
  availability?: 'available' | 'ooo';
  ooo_until?: string | null;
  partner_status?: 'active' | 'inactive' | 'downgraded'; // vetting state (v2 §10)
}

// C2: cross-component sync — the shell pill and the requests banner both
// listen so a toggle anywhere updates everywhere without a reload.
export const AVAILABILITY_EVENT = 'ch360:availability';

export function broadcastAvailability(status: 'available' | 'ooo') {
  window.dispatchEvent(new CustomEvent(AVAILABILITY_EVENT, { detail: status }));
}

export async function setAvailability(status: 'available' | 'ooo', providerKey?: string): Promise<void> {
  const key = providerKey ?? await myProviderKey();
  await apiFetch(`/api/v1/provider/${key}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  broadcastAvailability(status);
}

export async function fetchCoverage(providerKey?: string): Promise<ProviderCoverage> {
  const key = providerKey ?? await myProviderKey();
  const res = await apiFetch<{ ok: boolean; coverage: ProviderCoverage }>(`/api/v1/provider/${key}/coverage`);
  return res.coverage;
}

// ─── Matchmaking profile (v2 §10) ────────────────────────────────────────────
// Provider self-service: billing model, full pricing table (detail page) and
// the anonymized listing-card fields.
export type BillingModel = 'abo' | 'hourly' | 'project' | 'mixed';

export interface PricingRow { service: string; price: string }

export interface MatchmakingProfile {
  billing_model: BillingModel;
  pricing_table: PricingRow[] | null;
  pseudonym_label: string | null;
  region: string | null;
  active_since: number | null;
}

export async function updateMatchmakingProfile(patch: Partial<MatchmakingProfile>, providerKey?: string): Promise<void> {
  await apiFetch(`/api/v1/provider/${providerKey ?? await myProviderKey()}/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function addMarket(country: string, providerKey?: string): Promise<string[]> {
  const res = await apiFetch<{ ok: boolean; countries_supported: string[] }>(`/api/v1/provider/${providerKey ?? await myProviderKey()}/coverage`, {
    method: 'PATCH',
    body: JSON.stringify({ add_country: country }),
  });
  return res.countries_supported;
}
