import { describe, it, expect, vi } from 'vitest';

// invoiceRetry.ts zieht Supabase, Stripe und Mailer auf Modulebene mit; die
// Tagesrechnung hier beruehrt sie nie.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import { daysPastDue, retryDates, retryDaysWithin, retryStage } from '../invoiceRetry.js';

// ─── ADR-0008 B2a: wann versucht wird — und wann nicht ───────────────────────
describe('Einzug in der Kulanzfrist', () => {
    const due = '2026-10-10';
    const at = (d: string) => new Date(`${d}T15:30:00Z`);

    it('zaehlt Kalendertage, nicht Stunden', () => {
        expect(daysPastDue(due, at('2026-10-09'))).toBe(-1);
        expect(daysPastDue(due, at('2026-10-10'))).toBe(0);
        expect(daysPastDue('2026-10-10T00:00:00Z', at('2026-10-11'))).toBe(1);
    });

    it('versucht an Tag 1, 3 und 6 — nie am Faelligkeitstag', () => {
        expect(retryStage(due, at('2026-10-10'), 7)).toBeNull();
        expect(retryStage(due, at('2026-10-11'), 7)).toBe(1);
        expect(retryStage(due, at('2026-10-12'), 7)).toBe(1);
        expect(retryStage(due, at('2026-10-13'), 7)).toBe(3);
        expect(retryStage(due, at('2026-10-16'), 7)).toBe(6);
        expect(retryStage(due, at('2026-10-17'), 7)).toBe(6);
    });

    it('bleibt in der Frist: eine kuerzere Frist streicht die spaeten Versuche', () => {
        expect(retryDaysWithin(7)).toEqual([1, 3, 6]);
        expect(retryDaysWithin(3)).toEqual([1, 3]);
        expect(retryDaysWithin(0)).toEqual([]);
        expect(retryStage(due, at('2026-10-20'), 3)).toBe(3);
    });

    it('nennt die Daten der Versuche fuer die Vorab-Nachricht', () => {
        expect(retryDates(due, 7)).toEqual(['2026-10-11', '2026-10-13', '2026-10-16']);
    });
});
