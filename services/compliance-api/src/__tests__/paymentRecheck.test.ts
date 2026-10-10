import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── ADR-0008 A2: das Fenster und die Antwort der Bank ───────────────────────
//
// Drei Dinge koennen hier still schiefgehen, und jedes davon kostet den
// Anbieter entweder seine Buchbarkeit oder sein Kontingent:
//
//   1. `requires_action` als Erfolg lesen. Dann faellt eine Sperre, ohne dass
//      die Bank je zugestimmt hat — off-session kann die verlangte
//      Bestaetigung niemand geben.
//   2. Das Fenster kalendertaeglich rechnen. Um 23:50 drei Versuche, um 00:10
//      drei weitere, und „morgen wieder" je nach Zeitzone falsch.
//   3. `nextAt` immer am aeltesten Versuch festmachen. Wird die Grenze
//      gesenkt, nennt das einen Zeitpunkt, an dem noch gar nichts frei ist.

vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import { recheckAllowance, RECHECK_MAX_FALLBACK_PER_24H } from '../billing.js';
import { verifyPaymentMethod } from '../stripe.js';

const JETZT = new Date('2026-10-10T12:00:00Z');
/** Ein Versuch vor `h` Stunden. */
const vor = (h: number) => ({ created_at: new Date(JETZT.getTime() - h * 3_600_000).toISOString() });

describe('recheckAllowance — das rollende 24-Stunden-Fenster', () => {
    it('zaehlt nur, was im Fenster liegt', () => {
        const r = recheckAllowance([vor(1), vor(23.5), vor(25), vor(100)], 3, JETZT);
        expect(r).toEqual({ allowed: true, used: 2, max: 3, nextAt: null });
    });

    it('ohne Versuche ist alles frei', () => {
        expect(recheckAllowance([], 3, JETZT)).toEqual({ allowed: true, used: 0, max: 3, nextAt: null });
    });

    it('voll: frei wird es, wenn der aelteste gezaehlte Versuch herausfaellt', () => {
        const r = recheckAllowance([vor(20), vor(5), vor(1)], 3, JETZT);
        expect(r.allowed).toBe(false);
        expect(r.used).toBe(3);
        // Der aelteste war vor 20 h (09-10 16:00 UTC); in 4 h ist er draussen.
        expect(r.nextAt).toBe('2026-10-10T16:00:00.000Z');
    });

    it('gesenkte Grenze: nextAt haengt am Versuch mit Index used - max, nicht am aeltesten', () => {
        // Fuenf Versuche im Fenster, Grenze nachtraeglich auf 2 gesenkt. Frei
        // wird erst, wenn vier herausgefallen sind — also beim Vierten (Index 3).
        const r = recheckAllowance([vor(20), vor(18), vor(16), vor(14), vor(2)], 2, JETZT);
        expect(r.allowed).toBe(false);
        expect(r.used).toBe(5);
        expect(r.nextAt).toBe('2026-10-10T22:00:00.000Z');          // vor(14) + 24 h
        // Der aelteste haette 16:00 ergeben — dann waeren noch vier im Fenster.
        expect(r.nextAt).not.toBe('2026-10-10T16:00:00.000Z');
    });

    it('die Grenze genau erreicht heisst gesperrt, nicht „noch einer"', () => {
        expect(recheckAllowance([vor(1)], 1, JETZT).allowed).toBe(false);
        expect(recheckAllowance([], 1, JETZT).allowed).toBe(true);
    });

    it('Grenze 0 nennt keinen Zeitpunkt — es wird nie einer frei', () => {
        expect(recheckAllowance([vor(1)], 0, JETZT)).toEqual({ allowed: false, used: 1, max: 0, nextAt: null });
        expect(recheckAllowance([], 0, JETZT)).toEqual({ allowed: false, used: 0, max: 0, nextAt: null });
    });

    it('Zeilen ohne lesbaren Zeitstempel zaehlen nicht mit', () => {
        const r = recheckAllowance([{ created_at: null }, { created_at: 'kaputt' }, {}, vor(1)], 3, JETZT);
        expect(r.used).toBe(1);
    });

    it('der Rueckfall nimmt dem Anbieter den Weg nicht: er ist 3, nicht 0', () => {
        expect(RECHECK_MAX_FALLBACK_PER_24H).toBe(3);
        expect(recheckAllowance([], RECHECK_MAX_FALLBACK_PER_24H, JETZT).allowed).toBe(true);
    });
});

// ─── verifyPaymentMethod: was von Stripe als Bestaetigung zaehlt ─────────────

type Call = { url: string; method: string; body: string | null };

function stripeFetch(antwort: { status?: number; body: unknown }) {
    const calls: Call[] = [];
    const fn = vi.fn(async (input: string | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: init?.method || 'GET', body: typeof init?.body === 'string' ? init.body : null });
        return new Response(JSON.stringify(antwort.body), { status: antwort.status ?? 200 });
    });
    return { fn, calls };
}

describe('verifyPaymentMethod — die Frage an die Bank, ohne Betrag', () => {
    const realFetch = globalThis.fetch;
    beforeEach(() => { process.env.STRIPE_SECRET_KEY = 'rk_test_unit'; });
    afterEach(() => { globalThis.fetch = realFetch; delete process.env.STRIPE_SECRET_KEY; });

    const pruefen = () => verifyPaymentMethod({ customerId: 'cus_a', paymentMethodId: 'pm_1', idempotencyKey: 'k1' });

    it('fragt einen SetupIntent fuer die spaetere Nutzung off-session an — nie einen Betrag', async () => {
        const f = stripeFetch({ body: { id: 'seti_1', status: 'succeeded' } });
        globalThis.fetch = f.fn as unknown as typeof fetch;
        expect(await pruefen()).toEqual({ ok: true, setupIntentId: 'seti_1' });
        expect(f.calls[0].url).toBe('https://api.stripe.com/v1/setup_intents');
        const body = new URLSearchParams(f.calls[0].body ?? '');
        expect(body.get('customer')).toBe('cus_a');
        expect(body.get('payment_method')).toBe('pm_1');
        expect(body.get('usage')).toBe('off_session');
        expect(body.get('confirm')).toBe('true');
        expect(body.get('amount')).toBeNull();                       // kein Betrag, auch kein Cent
    });

    it('`requires_action` ist eine Ablehnung, keine Bestaetigung', async () => {
        const f = stripeFetch({ body: { id: 'seti_2', status: 'requires_action' } });
        globalThis.fetch = f.fn as unknown as typeof fetch;
        const r = await pruefen();
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.kind).toBe('card');
        expect(r.reason).toBe('authentication_required');
    });

    it('eine abgelehnte Karte kommt als Kartenfehler mit normalisiertem Grund', async () => {
        const f = stripeFetch({ status: 402, body: { error: { type: 'card_error', code: 'card_declined', decline_code: 'insufficient_funds', message: 'Your card has insufficient funds.' } } });
        globalThis.fetch = f.fn as unknown as typeof fetch;
        const r = await pruefen();
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r).toMatchObject({ kind: 'card', reason: 'insufficient_funds' });
    });

    it('Stripe selbst kaputt heisst `kind: stripe` — das darf kein Kontingent kosten', async () => {
        const f = stripeFetch({ status: 500, body: { error: { type: 'api_error', message: 'boom' } } });
        globalThis.fetch = f.fn as unknown as typeof fetch;
        const r = await pruefen();
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.kind).toBe('stripe');
        expect(r.reason).toBe('stripe_error');
    });

    it('ein fehlendes Recht am Restricted Key ist kein Kartenfehler', async () => {
        // `setup_intents: write` fehlt: Stripe antwortet permission_error. Wer
        // das als Ablehnung der Karte liest, sagt dem Anbieter, seine Bank
        // habe nicht bestaetigt — und laesst ihn eine Karte wechseln, mit der
        // nichts ist (Befund-Muster aus Staging 2026-10-04 bei billing/sync).
        const f = stripeFetch({ status: 403, body: { error: { type: 'invalid_request_error', code: 'api_key_expired', message: 'This API key does not have permission' } } });
        globalThis.fetch = f.fn as unknown as typeof fetch;
        const r = await pruefen();
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.kind).toBe('stripe');
    });
});
