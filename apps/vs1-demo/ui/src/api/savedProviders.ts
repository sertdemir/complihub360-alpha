import { apiFetch } from './client';
import type { PriceRange } from './search';

// ─── Gemerkte Anbieter (Handover 1.0 §5 "Add to Selection") ─────────────────
// Server: services/compliance-api/src/savedProviders.ts. Anonym bis zur
// Buchung; die Liste ist kein Detail-Aufruf und kostet keinen Anbieter etwas.

export type SavedProvider =
  | {
      available: true;
      public_ref: string;
      title: string;
      letter: string;
      descriptor: string;
      area_codes: string[];
      descriptor_region: string | null;
      specializations: string[];
      markets: string[];
      completed_count: number | null;
      avg_response_hours: number | null;
      billing_model: 'abo' | 'hourly' | 'project' | 'mixed';
      price_range: PriceRange | null;
      timeline_days: { min: number; max: number } | null;
      saved_at: string;
      session_id: string | null;
    }
  | { available: false; public_ref: string | null; saved_at: string };

export async function fetchSavedProviders(): Promise<SavedProvider[]> {
  const res = await apiFetch<{ ok: boolean; providers: SavedProvider[] }>('/api/v1/me/saved-providers');
  return res.providers ?? [];
}

export async function saveProvider(publicRef: string, sessionId?: string | null): Promise<void> {
  await apiFetch(`/api/v1/me/saved-providers/${publicRef}`, {
    method: 'PUT',
    body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
  });
}

export async function forgetProvider(publicRef: string): Promise<void> {
  await apiFetch(`/api/v1/me/saved-providers/${publicRef}`, { method: 'DELETE' });
}
