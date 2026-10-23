// ─── Die besten drei Treffer ──────────────────────────────────────────────────
//
// Nutzer-Entscheidung 23.10.2026 (Beta-Testbuchung): Mit 25 Test-Providern
// standen in der Risk Map neun Karten untereinander, darunter sechs, die den
// gefragten Bereich gar nicht abdecken (60 %). Jetzt hoechstens drei, volle
// Treffer zuerst; Teil-Treffer fuellen nur auf, wenn es weniger als drei
// volle gibt. Kein "Alle anzeigen" (Entscheidung 29.08.: kein Sammellink).
//
// Die Ueberschrift nennt weiter die echte Trefferzahl — wie die Gast-Ansicht
// seit #193. Sortiert wird stabil: Bei gleichem Match bleibt die Reihenfolge
// der Engine (ihr Ranking) erhalten.

export const MAX_MATCH_CARDS = 3;

export function topMatches<T extends { match: number }>(providers: T[], max = MAX_MATCH_CARDS): T[] {
  return providers
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.match - a.p.match || a.i - b.i)
    .slice(0, max)
    .map(({ p }) => p);
}
