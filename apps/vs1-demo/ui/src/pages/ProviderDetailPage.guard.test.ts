import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Nutzer-Entscheidung 2026-10-01 (TKT-PROV-06): ist ein Anbieter nicht
// abrechenbar, erscheint KEIN Buchen-Knopf. Vorher durfte der Nutzer einen
// Termin waehlen und wurde erst beim Absenden mit 409 BILLING_NOT_READY
// abgewiesen — ein Korb nach der Terminwahl ist die schlechteste Variante.
//
// WAS DIESER TEST BELEGT: dass der Zweig existiert und VOR dem Knopf greift.
// WAS ER NICHT BELEGT: wie die Flaeche aussieht. Die ganze Seite zu rendern
// braucht Routing, i18n und API-Attrappen; dieser Waechter kostet nichts und
// faellt, sobald jemand den Zweig entfernt — mehr soll er nicht.

const HIER = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HIER, 'ProviderDetailPage.tsx'), 'utf8');
const RAIL = SRC.slice(SRC.indexOf('function BookingRail'));

describe('ProviderDetailPage · kein Buchen-Knopf ohne Buchbarkeit', () => {
    it('prueft die Buchbarkeit, bevor irgendein Buchen-Aufruf steht', () => {
        const zweig = RAIL.indexOf('p.bookable_chargeable === false');
        const ersterKnopf = RAIL.indexOf('onBook(');
        expect(zweig).toBeGreaterThan(-1);
        expect(ersterKnopf).toBeGreaterThan(-1);
        expect(zweig).toBeLessThan(ersterKnopf);
    });

    it('der Zweig kehrt zurueck, statt nur etwas auszublenden', () => {
        // Zwischen dem Zweig und dem ersten onBook muss ein return stehen,
        // sonst faellt der Code doch in die Knopf-Variante.
        const zweig = RAIL.indexOf('p.bookable_chargeable === false');
        const ersterKnopf = RAIL.indexOf('onBook(');
        expect(RAIL.slice(zweig, ersterKnopf)).toContain('return (');
    });

    it('nennt im gesperrten Zweig keinen Termin-Aufruf und keine Slot-Liste', () => {
        const zweig = RAIL.indexOf('p.bookable_chargeable === false');
        const ende = RAIL.indexOf('return (', RAIL.indexOf('return (', zweig) + 1);
        const gesperrt = RAIL.slice(zweig, ende);
        expect(gesperrt).not.toContain('onBook');
        expect(gesperrt).not.toContain('detail.slotsTitle');
        expect(gesperrt).toContain('detail.notBookableTitle');
    });
});
