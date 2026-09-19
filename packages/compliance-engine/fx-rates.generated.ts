// GENERIERT von scripts/fetch-fx-rates.mjs — nicht von Hand bearbeiten.
//
// EZB-Referenzkurse, eingefroren. Einheit: Fremdwaehrung je 1 EUR, also
// EUR = Betrag / kurs. Die EZB veroeffentlicht werktags gegen 16:00 MEZ;
// an Wochenenden und Feiertagen bleibt der letzte Werktag stehen.
//
// Erneuern mit:  node scripts/fetch-fx-rates.mjs

/** Tag, fuer den die Kurse gelten — nicht der Tag des Abrufs. */
export const FX_STAND = '2026-09-18';

/** Fremdwaehrung je 1 EUR. */
export const FX_JE_EUR = {
    USD: 1.146,
    GBP: 0.8588,
    TRY: 55.9077,
} as const;

export type FxWaehrung = keyof typeof FX_JE_EUR;

/** Rechnet einen Betrag in seiner Waehrung nach Euro um, auf ganze Euro
 *  gerundet. EUR bleibt unveraendert. Gibt null zurueck, wenn fuer die
 *  Waehrung kein Kurs eingefroren ist — dann fehlt lieber eine Zahl als dass
 *  eine falsche entsteht. */
export function inEuro(betrag: number, waehrung: string): number | null {
    if (waehrung === 'EUR') return Math.round(betrag);
    const kurs = (FX_JE_EUR as Record<string, number | undefined>)[waehrung];
    if (!kurs) return null;
    return Math.round(betrag / kurs);
}
