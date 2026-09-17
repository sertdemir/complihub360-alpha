// ─── Welcher Wert gilt hier? ─────────────────────────────────────────────────
// `jurisdiction_facts` fuehrt seit der Migration 20260917000000 Zeilen auf drei
// Ebenen: Land ('US'), Region ('US-CA') und Ort ('US-CA-08031'). Fuer die neun
// europaeischen Maerkte aendert das nichts — dort steht alles auf Landesebene.
// Fuer die USA ist es die Voraussetzung dafuer, ueberhaupt etwas Richtiges
// sagen zu koennen: es gibt keinen US-weiten Umsatzsteuersatz und keine
// US-weite Nexus-Schwelle.
//
// DIE REGEL: das Spezifischere gewinnt. Liegt derselbe `fact_key` auf 'US' und
// auf 'US-CA' vor, gilt in Kalifornien die zweite Zeile. So bleibt der
// Landeswert der Normalfall, und nur die Abweichung braucht eine eigene Zeile.
//
// OHNE BEKANNTE REGION gelten NUR die Landeszeilen. Das ist die wichtige
// Haelfte: wer nicht weiss, wo der Nutzer sitzt, darf ihm nicht die
// kalifornische Schwelle neben die texanische legen und beides "ground truth"
// nennen. Der Assistent bekommt dann lieber den allgemeinen Wert — mit der
// Anmerkung, dass er je Staat abweicht — als ein Paar sich widersprechender
// Zahlen. Genau dieses Paar entstuende sonst, weil assistant.ts die Zeilen
// ungefiltert als "verified ground truth — prefer these for numbers" in den
// Kontext schreibt.

export interface JurisdictionFact {
    fact_key: string;
    value_text: string;
    notes?: string | null;
    /** 'US' · 'US-CA' · 'US-CA-08031'; fehlt bei Zeilen vor der Migration. */
    jurisdiction_code?: string | null;
    [k: string]: unknown;
}

/** 'US-CA-08031' → ['US', 'US-CA', 'US-CA-08031'] — grob nach fein. */
export function jurisdictionChain(code: string): string[] {
    const parts = code.split('-').filter(Boolean);
    return parts.map((_, i) => parts.slice(0, i + 1).join('-'));
}

/**
 * Je `fact_key` die Zeile der spezifischsten passenden Ebene.
 *
 * @param rows  was die Abfrage geliefert hat (ein Land, alle Ebenen)
 * @param scope die Jurisdiktion des Nutzers: 'US' oder 'US-CA' oder
 *              'US-CA-08031'. Nur Zeilen auf dieser Kette gelten; alles
 *              daneben — etwa Texas, wenn der Nutzer in Kalifornien sitzt —
 *              faellt weg.
 */
export function resolveFacts<T extends JurisdictionFact>(rows: T[], scope: string): T[] {
    const chain = jurisdictionChain(scope);
    const rank = new Map(chain.map((c, i) => [c, i]));
    const best = new Map<string, { row: T; rank: number }>();

    for (const row of rows) {
        // Zeilen aus der Zeit vor der Migration tragen keinen Code. Sie sind
        // per Definition Landeszeilen — die Migration fuellt sie nach, aber ein
        // Leser, der aelteren Bestand sieht, darf daran nicht scheitern.
        const code = row.jurisdiction_code || chain[0];
        const r = rank.get(code);
        if (r === undefined) continue;              // andere Region, geht uns nichts an
        const cur = best.get(row.fact_key);
        if (!cur || r > cur.rank) best.set(row.fact_key, { row, rank: r });
    }
    return [...best.values()].map((b) => b.row);
}
