import { apiFetch } from './client';
import type { SearchProfile } from '../components/wizard/WizardContext';

// ─── Search API (Phase-3 wiring) ─────────────────────────────────────────────
// POST /api/v1/search: compliance engine → laws, scored + ANONYMIZED providers
// (0.6 relevance + 0.3 quality + 0.1 priority, spec §6). The wire shape is the
// anonymous stage-1 card — no name/contact before booking.

export interface AnonProvider {
  provider_key: string;
  pseudonym_label: string;
  region: string | null;
  active_since: number | null;
  specializations: string[];
  languages: string[];
  rating: number | null;
  completed_count: number | null;
  avg_response_hours: number | null;
  billing_model: 'abo' | 'hourly' | 'project' | 'mixed';
  is_verified: boolean;
  match: number;            // relevance-normalised percentage
  match_tier: 'high' | 'strong' | 'moderate';
}

// Enriched obligation from the engine's editorial map. Older payloads carry
// only id/title/description — consumers must treat every extra field as
// optional and fall back to the design fixture when severity is absent.
export interface SearchLaw {
  id: string;
  title: string;
  description: string;
  domain?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  markets?: string[];            // [] = EU-wide
  source?: string | null;
  /** CELEX id of the underlying EU act, verified against EUR-Lex. */
  celex?: string | null;
  /** Deep link to the authoritative text — makes the source citable. */
  source_url?: string | null;
  penalty?: string | null;
  penalty_max_eur?: number | null;
  due?: string | null;
  due_days?: number | null;
  state?: 'confirmed' | 'likely';
}

export interface SearchResult {
  overview_summary: string;
  providers: AnonProvider[];
  laws: SearchLaw[];
}

export async function runSearch(profile: Partial<SearchProfile> & { country?: string }): Promise<SearchResult> {
  const res = await apiFetch<SearchResult>('/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      country: profile.country || 'DE',
      domains: profile.categories || [],
      structured_answers: profile,
    }),
  });
  return res;
}
