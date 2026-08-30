import { apiFetch } from './client';

// ─── Kennzahlen des Arbeitsbereichs ──────────────────────────────────────────
// Ein Aufruf statt acht: die Pflichten einer Sitzung liegen nirgends
// gespeichert, sie entstehen jedes Mal neu aus `answers`. Der Server laesst
// die Engine je Sitzung laufen und liefert die Summen — Begruendung in
// services/compliance-api/src/dashboard.ts.

export interface DashboardSession {
  id: string;
  label: string | null;
  country: string | null;
  categories: string[];
  /** Pflichten, die weder erledigt noch als nicht zutreffend markiert sind. */
  open: number;
  total: number;
  /** Hoechster Schweregrad unter den OFFENEN Pflichten; null = nichts offen. */
  severity: 'critical' | 'high' | 'medium' | 'low' | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  sessions: { total: number; items: DashboardSession[] };
  obligations: {
    open: number;
    by_severity: Record<string, number>;
    by_market: Record<string, number>;
    by_market_high: Record<string, number>;
    by_domain: Record<string, number>;
    by_domain_high: Record<string, number>;
  };
}

const LEER: DashboardData = {
  sessions: { total: 0, items: [] },
  obligations: { open: 0, by_severity: {}, by_market: {}, by_market_high: {}, by_domain: {}, by_domain_high: {} },
};

/** Ohne Anmeldung gibt es nichts zu zeigen — das ist kein Fehler, sondern
 *  der Normalfall. Deshalb ein leeres Ergebnis statt einer Ausnahme. */
export async function fetchDashboard(): Promise<DashboardData> {
  try {
    const res = await apiFetch<{ ok: boolean } & DashboardData>('/api/v1/dashboard');
    return { sessions: res.sessions, obligations: res.obligations };
  } catch {
    return LEER;
  }
}

export const EMPTY_DASHBOARD = LEER;
