import { describe, it, expect, vi } from 'vitest';

// subscriptions.ts zieht den Supabase-Client auf Modulebene mit; die
// Datums-Mathematik hier beruehrt ihn nie.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import { addMonths, periodEndFor, rollPeriod } from '../subscriptions.js';

describe('addMonths — Tagesueberlauf wird gekuerzt, nicht uebersprungen', () => {
    it('zaehlt den einfachen Fall', () => {
        expect(addMonths('2026-10-01', 1)).toBe('2026-11-01');
        expect(addMonths('2026-10-15', 1)).toBe('2026-11-15');
    });

    it('kuerzt den 31. auf den letzten Tag des Zielmonats', () => {
        // Ohne Kuerzung sprang der 31.01. auf den 03.03. — die Periode waere
        // laenger als ein Monat und der Rabattzyklus verschoben.
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

describe('periodEndFor', () => {
    it('monatlich einen Monat, jaehrlich zwoelf', () => {
        // Spec B: "Annual subscriptions charge ten months ... and provide
        // twelve months of access." Die zehn Monate stehen im Preis.
        expect(periodEndFor('2026-10-01', 'monthly')).toBe('2026-11-01');
        expect(periodEndFor('2026-10-01', 'annual')).toBe('2027-10-01');
    });
});

describe('rollPeriod', () => {
    it('rollt nicht, solange die Periode laeuft', () => {
        expect(rollPeriod('2026-10-01', '2026-11-01', 'monthly', '2026-10-15')).toBeNull();
    });

    it('rollt genau eine Periode weiter', () => {
        expect(rollPeriod('2026-10-01', '2026-11-01', 'monthly', '2026-11-01'))
            .toEqual({ start: '2026-11-01', end: '2026-12-01' });
    });

    it('holt mehrere verpasste Perioden nach', () => {
        // Der Fall, der ohne diesen Pass entstand: niemand rollte, die Zeile
        // blieb Monate stehen.
        expect(rollPeriod('2026-01-01', '2026-02-01', 'monthly', '2026-10-15'))
            .toEqual({ start: '2026-10-01', end: '2026-11-01' });
    });

    it('rollt ein Jahresabo in Jahresschritten', () => {
        expect(rollPeriod('2025-10-01', '2026-10-01', 'annual', '2026-10-02'))
            .toEqual({ start: '2026-10-01', end: '2027-10-01' });
    });

    it('bleibt beim Monatsende stabil, statt nach vorne zu wandern', () => {
        // Der 31.01. kuerzt auf den 28.02.; die naechste Periode darf dann
        // nicht auf dem 28. haengen bleiben und das Monatsende verlieren —
        // sie darf aber auch nicht zurueckspringen.
        const a = rollPeriod('2026-01-31', '2026-02-28', 'monthly', '2026-02-28');
        expect(a).toEqual({ start: '2026-02-28', end: '2026-03-28' });
    });

    it('rollt genau einmal, wenn today auf dem Periodenende liegt', () => {
        // Das Ende ist exklusiv: am 01.11. laeuft schon die naechste Periode.
        expect(rollPeriod('2026-10-01', '2026-11-01', 'monthly', '2026-11-01'))
            .toEqual({ start: '2026-11-01', end: '2026-12-01' });
    });

    it('gibt null zurueck, wenn der Deckel nicht reicht — statt endlos zu rollen', () => {
        // 400 Monatsschritte sind ueber 33 Jahre. Eine Zeile, die so alt ist,
        // ist ein Datenfehler; dann lieber nichts anfassen als die Schleife
        // drehen. Ohne Deckel liefe das hier durch ~1500 Schritte.
        expect(rollPeriod('1900-01-01', '1900-02-01', 'monthly', '2026-10-15')).toBeNull();
    });
});
