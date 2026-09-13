import { apiFetch } from './client';

// ─── Bereichs-Querschnitt ────────────────────────────────────────────────────
// GET /api/v1/domain/:slug — die Pflichten EINES Bereichs ueber alle aktiven
// Sitzungen des Nutzers, serverseitig durch die Engine gerechnet (Canvas
// "Bereichsseite", Nutzer-Wahl 2026-09-13). Begruendung und Abbildung
// Engine-Domaene → Bereich in services/compliance-api/src/domain.ts.

export type DomainObligationStatus = 'open' | 'in_progress' | 'done' | 'not_applicable';

export interface DomainObligation {
  id: string;
  label: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Leer = EU-weit: gilt in jedem Markt der Sitzung. */
  markets: string[];
  source?: string;
  sourceUrl?: string | null;
  penalty?: string;
  due?: string;
  dueDays?: number | null;
  status: DomainObligationStatus;
}

export interface DomainSession {
  id: string;
  label: string | null;
  country: string | null;
  markets: string[];
  categories: string[];
  updated_at: string;
  obligations: DomainObligation[];
}

export interface DomainOverview {
  slug: string;
  sessions: DomainSession[];
  /** Archivierte Sitzungen mit diesem Bereich — der Leerzustand nennt sie. */
  archived: number;
  markets: string[];
  open: number;
  high: number;
  next_due_days: number | null;
}

export const EMPTY_DOMAIN: DomainOverview = {
  slug: '', sessions: [], archived: 0, markets: [], open: 0, high: 0, next_due_days: null,
};

/** Ohne Anmeldung (401) gibt es nichts zu zeigen — die Seite faellt dann in
 *  den Leerzustand, nicht in einen Fehler. */
export async function fetchDomainOverview(slug: string): Promise<DomainOverview> {
  const res = await apiFetch<{ ok: boolean } & DomainOverview>(`/api/v1/domain/${encodeURIComponent(slug)}`);
  return {
    slug: res.slug, sessions: res.sessions ?? [], archived: res.archived ?? 0, markets: res.markets ?? [],
    open: res.open ?? 0, high: res.high ?? 0, next_due_days: res.next_due_days ?? null,
  };
}
