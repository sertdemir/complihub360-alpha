import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Waechter: der Stichtag und der Zustand, in dem nichts anzubieten ist ────
//
// Zwei Dinge auf dieser Seite brechen still — Typecheck, Build und Tests
// bleiben gruen, und auffallen wuerde es erst einem Anbieter:
//
//   1. DER STICHTAG. `renewal_date` und `current_period_end` sind nur bei
//      monatlicher Zahlweise derselbe Tag. Wer den Zyklus nimmt, zeigt einem
//      Jahresabo einen Stichtag vier Wochen nach der Wahl — und kuendigt es
//      im schlimmsten Fall elf Monate zu frueh. Dieselbe Verwechslung hat
//      schon einmal fast die Rabatt-Leads von Monat auf Jahr gestreckt
//      (TKT-PROV-07, #240).
//
//   2. DIE FUSSLEISTE, SOLANGE ETWAS VORGEMERKT IST. Das Backend lehnt eine
//      zweite Vormerkung mit ALREADY_SCHEDULED ab. Steht der Knopf trotzdem
//      da, klickt der Anbieter auf etwas, das sicher fehlschlaegt.
//
// Was dieser Test NICHT prueft: wie die Flaechen aussehen. Er prueft die zwei
// Stellen, an denen eine spaetere Aenderung unbemerkt Schaden anrichtet.

const quelle = readFileSync(resolve(__dirname, 'SubscriptionPage.tsx'), 'utf8');

describe('Der Stichtag ist die Verlaengerung', () => {
    it('zieht renewal_date VOR current_period_end', () => {
        const zeile = quelle.split('\n').find((l) => l.includes('const stichtag ='));
        expect(zeile, 'die Stichtags-Zeile wurde umbenannt oder entfernt').toBeTruthy();
        const i = zeile!.indexOf('renewal_date');
        const j = zeile!.indexOf('current_period_end');
        expect(i, 'renewal_date kommt in der Stichtags-Zeile nicht vor').toBeGreaterThan(-1);
        // Der Zyklus darf nur der Rueckfall sein, nie die erste Wahl.
        expect(i).toBeLessThan(j === -1 ? Number.MAX_SAFE_INTEGER : j);
    });

    it('nennt den Stichtag aus der Vormerkung zuerst', () => {
        // Steht eine Vormerkung, ist IHR Termin massgeblich — der Watcher-Lauf
        // koennte renewal_date inzwischen weitergerollt haben.
        const zeile = quelle.split('\n').find((l) => l.includes('const stichtag ='))!;
        expect(zeile.indexOf('vorgemerkt?.effective_on')).toBeGreaterThan(-1);
        expect(zeile.indexOf('vorgemerkt?.effective_on')).toBeLessThan(zeile.indexOf('renewal_date'));
    });
});

describe('Keine Aktion, die sicher fehlschlaegt', () => {
    it('zeigt die Fussleiste nur, wenn nichts vorgemerkt ist', () => {
        expect(quelle).toContain('{!vorgemerkt && (');
        // Und die beiden Knoepfe stehen innerhalb dieses Blocks.
        const ab = quelle.indexOf('{!vorgemerkt && (');
        const bis = quelle.indexOf('</section>', ab);
        const block = quelle.slice(ab, bis);
        expect(block).toContain("subscription.manage.change");
        expect(block).toContain("subscription.manage.cancel");
    });

    it('bietet keinen Tarif an, den der Server ablehnen wuerde', () => {
        // `fits_released` kommt aus dem GET; ohne diese Pruefung sieht der
        // Anbieter die Grenze erst nach dem Klick als 409.
        expect(quelle).toContain('fits_released !== false');
    });
});

describe('Der Satz, der nicht mehr stimmt, ist weg', () => {
    it('nennt noChangeReason nirgends mehr', () => {
        // Er sagte, dass es Wechsel und Kuendigung nicht gibt. Seit ADR-0006
        // gibt es beide.
        expect(quelle).not.toContain('noChangeReason');
    });
});
