// ─── Abdeckung und Preisspanne fuer die Suche (EN-Launch Schritt 2) ──────────
//
// Zwei Fragen, die die Trefferliste allein nicht beantwortet:
//
//   1. Ist die Abdeckung begrenzt? (Canvas C2, Checklist v1.0 "Limited
//      coverage is distinguishable from broad coverage"). Begrenzt heisst
//      (Entscheidung 2026-10-09): es gibt Treffer, aber nicht fuer jeden
//      gewaehlten Bereich in jedem gewaehlten Markt.
//   2. Welche Preisspanne erwartet den Nutzer? (Canvas B3, abgenommener Satz
//      "Review the provider's … expected price range …").
//
// Beides liest nur `matchable_provider_services` — dieselbe Grenze, die
// entscheidet, wer ueberhaupt erscheint. Plan, Zahlung und Lead-Baender
// kommen hier nicht vor (Spec A §14).

interface MatchableRow {
  provider_key: string;
  country_code: string | null;
  area_code?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  currency?: string | null;
}

export interface PublicCoverage {
  /** Maerkte, die die Engine kennt — in der Reihenfolge der Anfrage. */
  markets: string[];
  /** Die angefragten Bereiche (Slugs des Aufrufers). */
  areas: string[];
  /** Je Markt die Bereiche, die mindestens ein freigegebener Anbieter abdeckt. */
  covered: Record<string, string[]>;
}

export function searchCoverage(rows: MatchableRow[], markets: string[], areas: string[]) {
  const byMarket = new Map<string, Set<string>>();
  const marketsByProvider = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.country_code || !markets.includes(r.country_code)) continue;
    if (!marketsByProvider.has(r.provider_key)) marketsByProvider.set(r.provider_key, new Set());
    marketsByProvider.get(r.provider_key)!.add(r.country_code);
    if (!r.area_code || !areas.includes(r.area_code)) continue;
    if (!byMarket.has(r.country_code)) byMarket.set(r.country_code, new Set());
    byMarket.get(r.country_code)!.add(r.area_code);
  }
  const covered: Record<string, string[]> = {};
  for (const m of markets) covered[m] = areas.filter((a) => byMarket.get(m)?.has(a));
  return {
    // Nur Booleans je Zelle auf dem Draht: welcher Anbieter etwas abdeckt,
    // und wie viele, verraet die Matrix nicht.
    public: { markets: [...markets], areas: [...areas], covered } as PublicCoverage,
    /** Die angefragten Maerkte, in denen dieser Anbieter freigegeben ist. */
    marketsOf: (providerKey: string) => markets.filter((m) => marketsByProvider.get(providerKey)?.has(m)),
  };
}

export interface PriceRange {
  min: number | null;
  max: number | null;
  currency: string;
}

/** Spanne ueber die freigegebenen Leistungen eines Anbieters in den
 *  angefragten Bereichen (ohne Bereich: alle). Mehrere Waehrungen lassen
 *  sich nicht ehrlich zu einer Spanne verbinden — dann keine. Ohne Preis:
 *  null, die Oberflaeche sagt "Pricing on request." */
export function priceRangeOf(rows: MatchableRow[], areas: string[]): PriceRange | null {
  const relevant = rows.filter((r) => !areas.length || (r.area_code && areas.includes(r.area_code)));
  const priced = relevant.filter((r) => r.currency && (r.price_min != null || r.price_max != null));
  if (!priced.length) return null;
  const currencies = new Set(priced.map((r) => String(r.currency).toUpperCase()));
  if (currencies.size !== 1) return null;
  const nums = (k: 'price_min' | 'price_max') =>
    priced.map((r) => (r[k] == null ? null : Number(r[k]))).filter((n): n is number => n != null && Number.isFinite(n));
  const mins = nums('price_min');
  const maxs = nums('price_max');
  return {
    min: mins.length ? Math.min(...mins) : null,
    max: maxs.length ? Math.max(...maxs) : null,
    currency: [...currencies][0],
  };
}
