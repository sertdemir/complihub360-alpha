import type { PriceRange, SearchCoverage } from '../api/search';

// ─── Treffer-Zustaende (EN-Launch Schritt 2, Checklist v1.0) ──────────────────
// "Zero, one, limited, and multiple match results use the correct singular or
// plural copy." — und: "One active provider returns the singular one-match
// state, not 'Compare your best matches'." Die Entscheidung faellt hier, an
// einer Stelle, statt in jeder Flaeche neu.

export type MatchCount = 'none' | 'one' | 'multiple';

export function matchCountOf(n: number): MatchCount {
  return n <= 0 ? 'none' : n === 1 ? 'one' : 'multiple';
}

/** Ein Markt mit Bereichen, die kein freigegebener Anbieter abdeckt. */
export interface CoverageGap {
  market: string;
  areas: string[];
}

/** Die Luecken der Matrix. Ohne `coverage` (aeltere Antwort) keine — der
 *  Befund "begrenzt" wird nie geraten. */
export function coverageGaps(coverage: SearchCoverage | null | undefined): CoverageGap[] {
  if (!coverage || !coverage.areas.length) return [];
  return coverage.markets
    .map((m) => ({ market: m, areas: coverage.areas.filter((a) => !(coverage.covered[m] ?? []).includes(a)) }))
    .filter((g) => g.areas.length > 0);
}

/** Begrenzt (Entscheidung 2026-10-09): es gibt Treffer, aber nicht fuer jeden
 *  gewaehlten Bereich in jedem gewaehlten Markt. Ohne Treffer ist es
 *  noProviderMatch, nicht "begrenzt". */
export function isLimitedCoverage(providerCount: number, coverage: SearchCoverage | null | undefined): boolean {
  return providerCount > 0 && coverageGaps(coverage).length > 0;
}

/** "€900 – €1,600" in der Sprache des Lesers; eine Seite allein als
 *  { from } / { upTo }, damit die Oberflaeche ihr eigenes Wort davorsetzt. */
export function formatPriceRange(range: PriceRange | null | undefined, locale: string):
  | { kind: 'range'; text: string }
  | { kind: 'from'; price: string }
  | { kind: 'upTo'; price: string }
  | null {
  if (!range || (range.min == null && range.max == null)) return null;
  let fmt: Intl.NumberFormat;
  try {
    fmt = new Intl.NumberFormat(locale, { style: 'currency', currency: range.currency, maximumFractionDigits: 0 });
  } catch {
    return null;
  }
  if (range.min != null && range.max != null) {
    return range.min === range.max
      ? { kind: 'range', text: fmt.format(range.min) }
      : { kind: 'range', text: `${fmt.format(range.min)} – ${fmt.format(range.max)}` };
  }
  return range.min != null ? { kind: 'from', price: fmt.format(range.min) } : { kind: 'upTo', price: fmt.format(range.max!) };
}
