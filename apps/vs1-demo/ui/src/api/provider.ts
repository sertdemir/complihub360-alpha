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
}

export async function fetchCoverage(providerKey: string = DEMO_PROVIDER_KEY): Promise<ProviderCoverage> {
  const res = await apiFetch<{ ok: boolean; coverage: ProviderCoverage }>(`/api/v1/provider/${providerKey}/coverage`);
  return res.coverage;
}

export async function addMarket(country: string, providerKey: string = DEMO_PROVIDER_KEY): Promise<string[]> {
  const res = await apiFetch<{ ok: boolean; countries_supported: string[] }>(`/api/v1/provider/${providerKey}/coverage`, {
    method: 'PATCH',
    body: JSON.stringify({ add_country: country }),
  });
  return res.countries_supported;
}
