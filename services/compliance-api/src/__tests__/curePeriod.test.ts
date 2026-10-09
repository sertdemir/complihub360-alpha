import { describe, it, expect, vi } from 'vitest';

// billing.ts zieht den Supabase-Client auf Modulebene mit; `overdueState` ist
// rein und beruehrt ihn nie.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

const { overdueState, billingReadiness, CURE_PERIOD_FALLBACK_DAYS } = await import('../billing.js');

// ─── Die Kulanzfrist ─────────────────────────────────────────────────────────
//
// Bis zum 2026-10-07 sperrte eine offene Rechnung in der Sekunde, in der
// `due_at` verstrich — nicht als Beschluss, sondern weil niemand eine Frist
// eingetragen hatte. Spec A §21.1 nennt eine "configured cure period";
// ADR-0006 (Wahl A2) setzt sie auf sieben Tage.
//
// Die Grenze ist der Teil, an dem sich ein Fehler still versteckt: ein
// `<=` statt `<` verschiebt die Sperre um einen ganzen Tag, und niemand merkt
// es, bis ein Anbieter einen Tag zu frueh keine Anfragen mehr bekommt.

const JETZT = new Date('2026-10-20T12:00:00Z');
/** Eine offene Rechnung, faellig vor `tageHer` Tagen. */
const faellig = (tageHer: number) => ({
    due_at: new Date(JETZT.getTime() - tageHer * 86_400_000).toISOString().slice(0, 10),
});

describe('overdueState — ab wann eine Rechnung sperrt', () => {
    it('sperrt nicht, solange nichts faellig ist', () => {
        const s = overdueState([{ due_at: '2026-10-30' }], 7, JETZT);
        expect(s).toEqual({ blocking: 0, inGrace: 0, nextBlockAt: null, oldestDueAt: null });
    });

    it('zaehlt eine faellige Rechnung als kulant, nicht als sperrend', () => {
        const s = overdueState([faellig(1)], 7, JETZT);
        expect(s.blocking).toBe(0);
        expect(s.inGrace).toBe(1);
    });

    // Die Grenze. Tag 7 ist der letzte kulante, Tag 8 der erste sperrende.
    it('ist am siebten Tag noch kulant', () => {
        expect(overdueState([faellig(7)], 7, JETZT).blocking).toBe(0);
        expect(overdueState([faellig(7)], 7, JETZT).inGrace).toBe(1);
    });

    it('sperrt ab dem achten Tag', () => {
        expect(overdueState([faellig(8)], 7, JETZT).blocking).toBe(1);
        expect(overdueState([faellig(8)], 7, JETZT).inGrace).toBe(0);
    });

    // Gegenprobe: mit Frist 0 muss sich das alte Verhalten exakt einstellen.
    // Sonst waere die Frist nicht konfigurierbar, sondern nur umbenannt.
    it('verhaelt sich bei Frist 0 wie der alte Zustand', () => {
        expect(overdueState([faellig(1)], 0, JETZT).blocking).toBe(1);
        expect(overdueState([{ due_at: '2026-10-30' }], 0, JETZT).blocking).toBe(0);
    });

    it('nennt den Sperrtermin der aeltesten noch kulanten Rechnung', () => {
        // Faellig vor 6 und vor 2 Tagen: die aeltere sperrt zuerst.
        const s = overdueState([faellig(2), faellig(6)], 7, JETZT);
        expect(s.inGrace).toBe(2);
        expect(s.nextBlockAt).toBe('2026-10-22');  // faellig 14.10., Kulanz bis 21.10., Sperre ab 22.10.
        expect(s.oldestDueAt).toBe('2026-10-14');
    });

    it('trennt sperrende und kulante Rechnungen im selben Stapel', () => {
        const s = overdueState([faellig(20), faellig(3)], 7, JETZT);
        expect(s.blocking).toBe(1);
        expect(s.inGrace).toBe(1);
        // Der Sperrtermin gilt der kulanten; die andere sperrt laengst.
        expect(s.nextBlockAt).toBe('2026-10-25');  // faellig 17.10. + 7 Tage Kulanz
    });

    // Eine Rechnung ohne Faelligkeit darf nicht stillschweigend sperren — und
    // auch nicht stillschweigend als kulant zaehlen.
    it('uebergeht Rechnungen ohne due_at', () => {
        const s = overdueState([{ due_at: null }, { due_at: undefined }, {}], 7, JETZT);
        expect(s).toEqual({ blocking: 0, inGrace: 0, nextBlockAt: null, oldestDueAt: null });
    });

    it('uebergeht ein unlesbares Datum, statt es als faellig zu lesen', () => {
        expect(overdueState([{ due_at: 'übermorgen' }], 7, JETZT).blocking).toBe(0);
    });

    it('behandelt eine negative Frist wie null', () => {
        expect(overdueState([faellig(1)], -5, JETZT).blocking).toBe(1);
    });
});

describe('Das Netz unter der Konfiguration', () => {
    // Faellt `billing_policy` aus, darf die Regel sich nicht STILL zulasten des
    // Anbieters verschaerfen. Der Rueckfall ist deshalb die beschlossene Frist,
    // nicht der alte Zustand ohne Kulanz.
    it('faellt auf sieben Tage zurueck, nicht auf null', () => {
        expect(CURE_PERIOD_FALLBACK_DAYS).toBe(7);
        expect(overdueState([faellig(3)], CURE_PERIOD_FALLBACK_DAYS, JETZT).blocking).toBe(0);
    });
});

describe('billingReadiness nimmt nur die sperrenden entgegen', () => {
    const basis = {
        hasDefaultPaymentMethod: true,
        billingInfoComplete: true,
        subscriptionStatus: 'active' as const,
        authorizationAccepted: true,
        paused: false,
        lastPaymentFailed: false,
    };

    it('bleibt bereit, solange die Rechnung in der Frist ist', () => {
        const s = overdueState([faellig(3)], 7, JETZT);
        const r = billingReadiness({ ...basis, overdueInvoices: s.blocking });
        expect(r.ready).toBe(true);
        expect(r.reasons).toEqual([]);
    });

    it('sperrt, sobald die Frist abgelaufen ist', () => {
        const s = overdueState([faellig(9)], 7, JETZT);
        const r = billingReadiness({ ...basis, overdueInvoices: s.blocking });
        expect(r.ready).toBe(false);
        expect(r.reasons).toContain('overdue_invoice');
    });
});
