// ─── Bearbeitungs-Stand der Pflichten ────────────────────────────────────────
// Zwei Achsen je Pflicht, die nie verschmelzen duerfen:
//   GELTUNG     — Sache des Systems (gilt die Pflicht ueberhaupt?)
//   BEARBEITUNG — Sache des Nutzers (habe ich sie getan?)
// Dieses Modul deckt die zweite ab. Schluessel ist die Engine-Template-ID
// ('tax-vat-registration', 'prod-epr', …) — ein fester Slug aus
// packages/compliance-engine/domain-schema.ts, der eine Neuberechnung
// ueberlebt.

import { apiFetch } from './client';

export type ObligationStatus = 'open' | 'in_progress' | 'done' | 'not_applicable';

export interface ObligationStatusRow {
  obligation_id: string;
  status: Exclude<ObligationStatus, 'open'>;
  done_at: string | null;
  note: string | null;
  updated_at: string;
}

/** Nur die ABWEICHUNGEN — was nicht zurueckkommt, ist 'open'. */
export async function fetchObligationStatus(sessionId: string): Promise<Record<string, ObligationStatusRow>> {
  const data = await apiFetch<{ items?: ObligationStatusRow[] }>(`/api/v1/session/${sessionId}/obligations`);
  const map: Record<string, ObligationStatusRow> = {};
  for (const item of data.items ?? []) map[item.obligation_id] = item;
  return map;
}

/** Setzt einen Zustand. 'open' loescht die Zeile serverseitig.
 *  Das Erledigt-Datum vergibt der Server — "erledigt am" ist eine
 *  Systemaussage, keine Eingabe. */
export async function setObligationStatus(
  sessionId: string,
  obligationId: string,
  status: ObligationStatus,
  note?: string,
): Promise<void> {
  await apiFetch(`/api/v1/session/${sessionId}/obligations/${obligationId}`, {
    method: 'PUT',
    body: JSON.stringify({ status, ...(note ? { note } : {}) }),
  });
}
