import { describe, it, expect, vi } from 'vitest';

// subscriptions.ts zieht den Supabase-Client auf Modulebene mit; die
// Datums-Mathematik hier beruehrt ihn nie.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import { addMonths, cycleEndFor, renewalAfter, rollCycle } from '../subscriptions.js';

// ─── Zwei Termine, nicht einer ───────────────────────────────────────────────
//
// `current_period_*` ist der RABATT-Zyklus und immer einen Monat lang — bei
// jeder Zahlweise. Spec B: "The counter resets on the monthly billing-cycle
// date and does not roll over." `renewal_date` ist die Verlaengerung und
// richtet sich nach der Zahlweise; Spec B nennt sie in den
// Backend-Anforderungen als eigenes Feld.
//
// Die erste Fassung dieses PRs hat beides in einen Topf geworfen und bei einem
// Jahresabo einen ein Jahr langen Zyklus gesetzt. Der Anbieter haette seine
// 3 bzw. 6 rabattierten Leads dann einmal im JAHR bekommen statt im Monat.

describe('addMonths — Tagesueberlauf wird gekuerzt, nicht uebersprungen', () => {
    it('zaehlt den einfachen Fall', () => {
        expect(addMonths('2026-10-01', 1)).toBe('2026-11-01');
        expect(addMonths('2026-10-15', 1)).toBe('2026-11-15');
    });

    it('kuerzt den 31. auf den letzten Tag des Zielmonats', () => {
        // Ohne Kuerzung sprang der 31.01. auf den 03.03.
        expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
        expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
    });

    it('kennt den Schalttag', () => {
        expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
        expect(addMonths('2028-02-29', 12)).toBe('2029-02-28');
    });

    it('wechselt das Jahr', () => {
        expect(addMonths('2026-12-05', 1)).toBe('2027-01-05');
        expect(addMonths('2026-10-01', 12)).toBe('2027-10-01');
    });
});

describe('cycleEndFor — der Rabattzyklus ist ein Monat, auch beim Jahresabo', () => {
    it('ist von der Zahlweise unabhaengig', () => {
        expect(cycleEndFor('2026-10-01')).toBe('2026-11-01');
        expect(cycleEndFor('2026-08-05')).toBe('2026-09-05');
    });
});

describe('renewalAfter — die Verlaengerung richtet sich nach der Zahlweise', () => {
    it('Jahresabo: der naechste Jahrestag', () => {
        expect(renewalAfter('2026-08-05', 'annual', '2026-08-05')).toBe('2027-08-05');
        expect(renewalAfter('2026-08-05', 'annual', '2027-08-04')).toBe('2027-08-05');
        expect(renewalAfter('2026-08-05', 'annual', '2027-08-05')).toBe('2028-08-05');
    });

    it('Monatsabo: der naechste Monatstag — gleich dem Zyklusende', () => {
        expect(renewalAfter('2026-09-01', 'monthly', '2026-09-01')).toBe('2026-10-01');
        expect(renewalAfter('2026-09-01', 'monthly', '2026-09-15')).toBe('2026-10-01');
    });

    it('rechnet vom Beginn, nicht vom letzten Termin — auch nach einer Luecke', () => {
        // Lief der Waechter ein Jahr nicht, muss der Termin trotzdem stimmen.
        expect(renewalAfter('2020-03-10', 'annual', '2026-10-01')).toBe('2027-03-10');
        expect(renewalAfter('2020-03-10', 'monthly', '2026-10-01')).toBe('2026-10-10');
    });

    it('trifft die beiden Staging-Zeilen, die es schon gibt', () => {
        // studio-bianchi: monatlich, Beginn 2026-08-01, Zyklus 09-01 → 10-01,
        // renewal 10-01. schmidt-partner: jaehrlich, Beginn 2026-08-05,
        // Zyklus 09-05 → 10-05, renewal 2027-08-05. Beide von Hand angelegt,
        // und beide bestaetigen die Trennung der zwei Termine.
        expect(cycleEndFor('2026-09-01')).toBe('2026-10-01');
        expect(renewalAfter('2026-08-01', 'monthly', '2026-09-30')).toBe('2026-10-01');
        expect(cycleEndFor('2026-09-05')).toBe('2026-10-05');
        expect(renewalAfter('2026-08-05', 'annual', '2026-09-30')).toBe('2027-08-05');
    });
});

describe('rollCycle', () => {
    it('rollt nicht, solange der Zyklus laeuft', () => {
        expect(rollCycle('2026-10-01', '2026-11-01', '2026-10-15')).toBeNull();
    });

    it('rollt genau einmal, wenn today auf dem Zyklusende liegt', () => {
        // Das Ende ist exklusiv: am 01.11. laeuft schon der naechste Zyklus.
        expect(rollCycle('2026-10-01', '2026-11-01', '2026-11-01'))
            .toEqual({ start: '2026-11-01', end: '2026-12-01' });
    });

    it('holt mehrere verpasste Zyklen nach', () => {
        expect(rollCycle('2026-01-01', '2026-02-01', '2026-10-15'))
            .toEqual({ start: '2026-10-01', end: '2026-11-01' });
    });

    it('rollt beim Jahresabo genauso in Monatsschritten', () => {
        // Der Kern der Korrektur: ein Jahresabo bekommt zwoelf Zyklen im Jahr,
        // nicht einen. Die Zahlweise kommt hier gar nicht mehr vor.
        expect(rollCycle('2026-08-05', '2026-09-05', '2026-09-20'))
            .toEqual({ start: '2026-09-05', end: '2026-10-05' });
    });

    it('bleibt beim Monatsende stabil, statt nach vorne zu wandern', () => {
        expect(rollCycle('2026-01-31', '2026-02-28', '2026-02-28'))
            .toEqual({ start: '2026-02-28', end: '2026-03-28' });
    });

    it('gibt null zurueck, wenn der Deckel nicht reicht — statt endlos zu rollen', () => {
        // 400 Monatsschritte sind ueber 33 Jahre. Eine Zeile, die so alt ist,
        // ist ein Datenfehler; dann lieber nichts anfassen.
        expect(rollCycle('1900-01-01', '1900-02-01', '2026-10-15')).toBeNull();
    });
});
