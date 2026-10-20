// ─── „Aktiv seit" — ein Jahr oder nichts (Punkt 3, 18.10.2026) ──────────────
//
// Das Jahr steht auf der anonymen Karte ("active since 2013") und wird dort
// als Vertrauenssignal gelesen. Bis hierher galt `Number.isInteger(x) ? x :
// ignorieren`: Jahr 15 und 2031 gingen durch, null wurde still verworfen —
// ein geleertes Feld liess das alte Jahr oeffentlich stehen, waehrend die
// Oberflaeche „Gespeichert" sagte.

export const ACTIVE_SINCE_MIN = 1900;

/**
 * Liest `active_since` aus einem Request-Body.
 * - `undefined`: nicht geschickt, nichts aendern
 * - `{ value: null }`: geleert, nicht mehr anzeigen
 * - `{ value: 2013 }`: ganze Zahl von 1900 bis zum laufenden Jahr (UTC)
 * - `'invalid'`: alles andere — der Aufrufer antwortet mit 400 und `field`
 */
export function readActiveSince(v: unknown, now: Date = new Date()): { value: number | null } | 'invalid' | undefined {
    if (v === undefined) return undefined;
    if (v === null) return { value: null };
    if (typeof v === 'number' && Number.isInteger(v) && v >= ACTIVE_SINCE_MIN && v <= now.getUTCFullYear()) return { value: v };
    return 'invalid';
}
