// „Aktiv seit" (Punkt 3, 18.10.2026): ein Jahr von 1900 bis heute oder leer.
// Bis hierher machte `parseInt(x) || null` aus „seit 2013" null (still
// verworfen), aus „2O13" das Jahr 2 und aus „15" das Jahr 15. Der Server prueft
// dieselbe Spanne (services/compliance-api/src/activeSince.ts).

export const ACTIVE_SINCE_MIN = 1900;
export const activeSinceMax = (now: Date = new Date()) => now.getFullYear();

/** Leer → `null` (nicht anzeigen); vier Ziffern in der Spanne → das Jahr; sonst `'invalid'`. */
export function parseActiveSince(input: string, now: Date = new Date()): number | null | 'invalid' {
  const s = input.trim();
  if (!s) return null;
  if (!/^\d{4}$/.test(s)) return 'invalid';
  const y = Number(s);
  return y >= ACTIVE_SINCE_MIN && y <= activeSinceMax(now) ? y : 'invalid';
}
