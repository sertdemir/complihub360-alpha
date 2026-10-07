import type { PenaltyCeiling } from '@complihub/compliance-engine';
import { apiFetch } from './client';
import type { SearchProfile } from '../components/wizard/WizardContext';

// ─── Search API (Phase-3 wiring) ─────────────────────────────────────────────
// POST /api/v1/search: compliance engine → laws, scored + ANONYMIZED providers
// (0.6 relevance + 0.3 quality + 0.1 priority, spec §6). The wire shape is the
// anonymous stage-1 card — no name/contact before booking.

/** Die Fakten hinter der REIHENFOLGE — Verifikationstiefe, Antwortzeit,
 *  Bestaetigungsrate, Bewertungen aus Buchungen. Fakten, keine Gewichte
 *  (Canvas 2B, ADR-0004). */
export interface RankBasis {
  verification: 'independent' | 'reviewed' | 'partial' | 'none';
  verified_count: number;
  required_count: number;
  response_hours: number | null;
  confirmation_rate: number | null;
  rating: number | null;
  reviews_count: number | null;
}

// Phase 3 (ADR-0004): kein provider_key, kein pseudonym_label mehr auf dem
// Draht. Der Anbieter heisst vor der Buchung "Verified Provider B" — der
// Buchstabe ist seine Position in DIESER Liste, nicht ueber Sitzungen stabil —
// und traegt eine Beschreibung aus freigegebenen Bereichen und Region, die
// das System bildet, nicht der Anbieter.
export interface AnonProvider {
  /** Opaker Bezeichner (zwoelf Hex-Zeichen). Das Einzige, womit die UI einen Anbieter anspricht. */
  public_ref: string;
  /** "Verified Provider B" */
  title: string;
  /** "B" — fuer die Monogramm-Kachel (Canvas 1A). */
  letter: string;
  /** "Tax and VAT · Norditalien" — vom System, nie vom Anbieter. */
  descriptor: string;
  /** 3 V3: freigegebene Bereiche als Codes — das UI uebersetzt sie. */
  area_codes?: string[];
  /** Region der Beschreibung (identitaets-geprueft). */
  descriptor_region?: string | null;
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
  /** The percentage decomposed. Optional: older payloads predate it, and the UI
   *  must fall back to showing the bare number rather than inventing a reason. */
  match_basis?: {
    country: string | null;
    country_covered: boolean;
    domains_requested: string[];   // the caller's own domain slugs
    domains_matched: string[];     // subset this provider actually covers
  };
  rank_basis?: RankBasis;
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
  /** `<subdomainId>.<Land|default>` — unter diesem Schluessel steht `penalty`
   *  in vier Sprachen (common:compliance.penaltyText.*). */
  penalty_key?: string | null;
  penalty_max_eur?: number | null;
  /** Die belegte Obergrenze mit Fundstelle und Stand. Seit dem 19.09. die
   *  Quelle fuer die Bussgeldzeile der Karte; `penalty` bleibt nur noch der
   *  Rueckfall, wo keine Obergrenze belegt ist. */
  penalty_ceiling?: PenaltyCeiling | null;
  due?: string | null;
  due_days?: number | null;
  /** ISO date (YYYY-MM-DD) the obligation starts to apply; null = already in
   *  force. Drives the "applies in N days" countdown on the risk map. */
  applies_from?: string | null;
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
