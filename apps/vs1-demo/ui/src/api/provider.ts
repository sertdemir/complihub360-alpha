import { apiFetch } from './client';

// ─── Provider profile API (wiring map B5) ────────────────────────────────────
// Coverage read + market add. The demo workspace acts as 'dahlmann-cpa' until
// real provider auth lands (B8).

export const DEMO_PROVIDER_KEY = 'dahlmann-cpa';

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

export async function setAvailability(status: 'available' | 'ooo', providerKey: string = DEMO_PROVIDER_KEY): Promise<void> {
  await apiFetch(`/api/v1/provider/${providerKey}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  broadcastAvailability(status);
}

export async function fetchCoverage(providerKey: string = DEMO_PROVIDER_KEY): Promise<ProviderCoverage> {
  const res = await apiFetch<{ ok: boolean; coverage: ProviderCoverage }>(`/api/v1/provider/${providerKey}/coverage`);
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

export async function updateMatchmakingProfile(patch: Partial<MatchmakingProfile>, providerKey: string = DEMO_PROVIDER_KEY): Promise<void> {
  await apiFetch(`/api/v1/provider/${providerKey}/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function addMarket(country: string, providerKey: string = DEMO_PROVIDER_KEY): Promise<string[]> {
  const res = await apiFetch<{ ok: boolean; countries_supported: string[] }>(`/api/v1/provider/${providerKey}/coverage`, {
    method: 'PATCH',
    body: JSON.stringify({ add_country: country }),
  });
  return res.countries_supported;
}
