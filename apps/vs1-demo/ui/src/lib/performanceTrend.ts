import type { PerformanceCounted, PerformanceFacts, ProviderPerformanceResponse } from '@complihub360/types/src/provider';

// ─── Trendpfeile des Performance-Cockpits (16.10.2026) ───────────────────────
// Jede Kennzahl vergleicht sich mit dem Fenster DAVOR (dieselbe Laenge). Die
// Richtung ist die Richtung der Daten; die Farbe ist die Bedeutung fuer den
// Anbieter (besser, schlechter, gleich). Beides getrennt, damit "weniger
// eigene No-Shows" als Pfeil nach unten in Gruen lesbar ist.
//
// Kein Pfeil, wenn eines der beiden Fenster die Mindeststichprobe nicht
// erreicht (Spec A §17: nichts bewerten, solange die Daten nicht tragen) oder
// wenn der Server kein Vorfenster liefert. Dann sagt die Zeile das — sie
// erfindet keinen Vergleich.

export type TrendDirection = 'up' | 'down' | 'flat';
export type TrendTone = 'better' | 'worse' | 'same';
export type TrendKind = 'pp' | 'count' | 'rating';

export interface Trend {
  direction: TrendDirection;
  tone: TrendTone;
  /** Prozentpunkte, Stueck oder Bewertungs-Zehntel — je nach `kind`. */
  delta: number;
  kind: TrendKind;
}

/** Das Vorfenster, sobald der Server es liefert (`previous`). Bis dahin null —
 *  der Vertrag in packages/types kennt das Feld noch nicht. */
export function previousOf(res: ProviderPerformanceResponse): PerformanceFacts | null {
  const p = (res as { previous?: PerformanceFacts | null }).previous;
  return p && typeof p === 'object' && typeof p.bookings === 'number' ? p : null;
}

function tone(delta: number, higherIsBetter: boolean | null): TrendTone {
  if (delta === 0 || higherIsBetter === null) return 'same';
  return (delta > 0) === higherIsBetter ? 'better' : 'worse';
}
function direction(delta: number): TrendDirection {
  return delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
}

/** Quote gegen Quote, in Prozentpunkten. Null, wenn eine Seite keine Quote traegt. */
export function rateTrend(cur: PerformanceCounted, prev: PerformanceCounted | null | undefined, higherIsBetter = true): Trend | null {
  if (!prev || cur.rate == null || prev.rate == null) return null;
  const delta = Math.round((cur.rate - prev.rate) * 100);
  return { direction: direction(delta), tone: tone(delta, higherIsBetter), delta, kind: 'pp' };
}

/** Stueck gegen Stueck. `higherIsBetter` null = nur Richtung, keine Wertung
 *  (Nutzer-No-Shows sind kein Verdienst und kein Versaeumnis des Anbieters). */
export function countTrend(cur: number, prev: number | null | undefined, higherIsBetter: boolean | null): Trend | null {
  if (prev == null) return null;
  const delta = cur - prev;
  return { direction: direction(delta), tone: tone(delta, higherIsBetter), delta, kind: 'count' };
}

/** Bewertung gegen Bewertung, auf eine Nachkommastelle. Null ohne Durchschnitt. */
export function ratingTrend(cur: { average: number | null }, prev: { average: number | null } | null | undefined): Trend | null {
  if (!prev || cur.average == null || prev.average == null) return null;
  const delta = Math.round((cur.average - prev.average) * 10) / 10;
  return { direction: direction(delta), tone: tone(delta, true), delta, kind: 'rating' };
}

/** "+8", "−1", "±0" — das Minus ist das typografische (U+2212). */
export function signed(n: number, fractionDigits = 0, locale = 'en'): string {
  if (n === 0) return '±' + (0).toLocaleString(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
  const abs = Math.abs(n).toLocaleString(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
  return (n > 0 ? '+' : '−') + abs;
}
