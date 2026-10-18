import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// stripe.ts importiert Supabase auf Modulebene (ensureStripeCustomer); hier
// wird es nicht gebraucht.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

import { createPaymentIntent, findPaymentIntentForLedger, StripeTransportError, stripeRequest } from '../stripe.js';
import { getCustomerBilling } from '../stripe.js';

// getCustomerBilling spricht Stripe direkt ueber `fetch`; hier gibt es keinen
// In-Process-Server, also darf `globalThis.fetch` ersetzt werden.

type Call = { url: string; method: string; body: string | null };

function stripeFetch(routes: Record<string, (call: Call) => unknown>) {
    const calls: Call[] = [];
    const fn = vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        const call: Call = { url, method: init?.method || 'GET', body: typeof init?.body === 'string' ? init.body : null };
        calls.push(call);
        const route = Object.entries(routes).find(([k]) => `${call.method} ${url}`.startsWith(k));
        if (!route) return new Response(JSON.stringify({ error: { message: `unrouted ${call.method} ${url}` } }), { status: 404 });
        return new Response(JSON.stringify(route[1](call)), { status: 200 });
    });
    return { fn, calls };
}

describe('getCustomerBilling', () => {
    const realFetch = globalThis.fetch;
    beforeEach(() => { process.env.STRIPE_SECRET_KEY = 'rk_test_unit'; });
    afterEach(() => { globalThis.fetch = realFetch; delete process.env.STRIPE_SECRET_KEY; });

    it('liest die Standard-Zahlungsmethode, wenn sie gesetzt ist, und ruft sonst nichts weiter auf', async () => {
        const f = stripeFetch({
            'GET https://api.stripe.com/v1/customers/cus_a': () => ({
                id: 'cus_a', name: 'Kanzlei', email: 'x@example.com', address: { country: 'DE' },
                invoice_settings: { default_payment_method: { id: 'pm_1', card: { brand: 'visa', last4: '4242' } } },
            }),
        });
        globalThis.fetch = f.fn as unknown as typeof fetch;
        const r = await getCustomerBilling('cus_a');
        expect(r).toEqual({ defaultPaymentMethodId: 'pm_1', paymentMethodLabel: 'visa ····4242', email: 'x@example.com', billingInfoComplete: true, delinquent: false, promotedDefault: false });
        expect(f.calls).toHaveLength(1);
    });

    it('macht eine angehaengte Karte ohne Standard zum Standard (Portal-Befund 2026-10-05)', async () => {
        const f = stripeFetch({
            'GET https://api.stripe.com/v1/customers/cus_b': () => ({ id: 'cus_b', name: 'Kanzlei', invoice_settings: { default_payment_method: null } }),
            'GET https://api.stripe.com/v1/payment_methods': () => ({ data: [{ id: 'pm_attached', card: { brand: 'mastercard', last4: '4444' } }] }),
            'POST https://api.stripe.com/v1/customers/cus_b': () => ({ id: 'cus_b' }),
        });
        globalThis.fetch = f.fn as unknown as typeof fetch;
        const r = await getCustomerBilling('cus_b');
        expect(r.defaultPaymentMethodId).toBe('pm_attached');
        expect(r.paymentMethodLabel).toBe('mastercard ····4444');
        expect(r.promotedDefault).toBe(true);
        // Rechnungsdaten bleiben unvollstaendig: kein Land am Kunden.
        expect(r.billingInfoComplete).toBe(false);
        const list = f.calls[1];
        expect(list.url).toContain('payment_methods?customer=cus_b&type=card&limit=1');
        const post = f.calls[2];
        expect(post.method).toBe('POST');
        expect(post.body).toContain('invoice_settings%5Bdefault_payment_method%5D=pm_attached');
    });

    it('meldet ohne jede Karte „kein Zahlungsmittel" und schreibt nichts', async () => {
        const f = stripeFetch({
            'GET https://api.stripe.com/v1/customers/cus_c': () => ({ id: 'cus_c', name: 'Kanzlei', invoice_settings: {} }),
            'GET https://api.stripe.com/v1/payment_methods': () => ({ data: [] }),
        });
        globalThis.fetch = f.fn as unknown as typeof fetch;
        const r = await getCustomerBilling('cus_c');
        expect(r.defaultPaymentMethodId).toBeNull();
        expect(r.promotedDefault).toBe(false);
        expect(f.calls.map((c) => c.method)).toEqual(['GET', 'GET']);
    });
});

// ─── B1: der dritte Ausgang ──────────────────────────────────────────────────

describe('createPaymentIntent — card, stripe oder unknown', () => {
    const realFetch = globalThis.fetch;
    const args = { customerId: 'cus_a', paymentMethodId: 'pm_1', amountCents: 9900, currency: 'USD', description: 'lead', metadata: { ledger_id: 'led_1' }, idempotencyKey: 'led_1' };
    beforeEach(() => { process.env.STRIPE_SECRET_KEY = 'rk_test_unit'; });
    afterEach(() => { globalThis.fetch = realFetch; delete process.env.STRIPE_SECRET_KEY; });

    it('Verbindungsabbruch: Ausgang unbekannt, nicht gescheitert', async () => {
        globalThis.fetch = vi.fn(async () => { throw new TypeError('fetch failed: ECONNRESET'); }) as unknown as typeof fetch;
        const r = await createPaymentIntent(args);
        expect(r).toMatchObject({ ok: false, kind: 'unknown', reason: 'outcome_unknown' });
    });

    it('Timeout: der Aufruf traegt ein AbortSignal, und der Abbruch ist unbekannt', async () => {
        const f = vi.fn(async (_u: string, init?: RequestInit) => {
            expect(init?.signal).toBeInstanceOf(AbortSignal);
            const e = new Error('The operation was aborted due to timeout'); e.name = 'TimeoutError'; throw e;
        });
        globalThis.fetch = f as unknown as typeof fetch;
        const r = await createPaymentIntent(args);
        expect(r).toMatchObject({ ok: false, kind: 'unknown' });
        await expect(stripeRequest('GET', 'customers/cus_a')).rejects.toBeInstanceOf(StripeTransportError);
    });

    it('5xx von Stripe: unbekannt — die Belastung kann durch sein', async () => {
        globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'internal', type: 'api_error' } }), { status: 502 })) as unknown as typeof fetch;
        const r = await createPaymentIntent(args);
        expect(r).toMatchObject({ ok: false, kind: 'unknown' });
    });

    it('4xx ohne Karte: stripe — Stripe hat geantwortet, nichts belastet', async () => {
        globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'No such customer', type: 'invalid_request_error', code: 'resource_missing' } }), { status: 404 })) as unknown as typeof fetch;
        const r = await createPaymentIntent(args);
        expect(r).toMatchObject({ ok: false, kind: 'stripe', reason: 'stripe_error' });
    });

    it('B15: die Referenz des abgelehnten PaymentIntent kommt aus error.payment_intent.id', async () => {
        globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'declined', type: 'card_error', code: 'card_declined', decline_code: 'generic_decline', payment_intent: { id: 'pi_declined_1', status: 'requires_payment_method' } } }), { status: 402 })) as unknown as typeof fetch;
        const r = await createPaymentIntent(args);
        expect(r).toMatchObject({ ok: false, kind: 'card', reason: 'card_declined', stripeRef: 'pi_declined_1' });
    });

    it('Karte abgelehnt bleibt card', async () => {
        globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'declined', type: 'card_error', code: 'card_declined', decline_code: 'insufficient_funds' } }), { status: 402 })) as unknown as typeof fetch;
        const r = await createPaymentIntent(args);
        expect(r).toMatchObject({ ok: false, kind: 'card', reason: 'insufficient_funds' });
    });
});

describe('findPaymentIntentForLedger — Nachschau ohne Geldbewegung', () => {
    const realFetch = globalThis.fetch;
    beforeEach(() => { process.env.STRIPE_SECRET_KEY = 'rk_test_unit'; });
    afterEach(() => { globalThis.fetch = realFetch; delete process.env.STRIPE_SECRET_KEY; });

    it('findet den Intent ueber metadata.ledger_id, blaettert bei Bedarf, und sendet nur GETs', async () => {
        const f = stripeFetch({
            'GET https://api.stripe.com/v1/payment_intents?customer=cus_a&created%5Bgte%5D=': (call) => call.url.includes('starting_after=pi_1')
                ? { data: [{ id: 'pi_2', status: 'succeeded', metadata: { ledger_id: 'led_x' } }], has_more: false }
                : { data: [{ id: 'pi_1', status: 'succeeded', metadata: { ledger_id: 'other' } }], has_more: true },
        });
        globalThis.fetch = f.fn as unknown as typeof fetch;
        const r = await findPaymentIntentForLedger({ customerId: 'cus_a', ledgerId: 'led_x', createdAfter: new Date('2026-10-16T10:00:00Z') });
        expect(r).toEqual({ id: 'pi_2', status: 'succeeded' });
        expect(f.calls.map((c) => c.method)).toEqual(['GET', 'GET']);
        // Fuenf Minuten Puffer vor der Ledger-Zeile.
        expect(f.calls[0].url).toContain(`created%5Bgte%5D=${Math.floor(Date.parse('2026-10-16T10:00:00Z') / 1000) - 300}`);
    });

    it('nichts gefunden: null — Stripe hat den Aufruf nie bekommen', async () => {
        const f = stripeFetch({ 'GET https://api.stripe.com/v1/payment_intents': () => ({ data: [], has_more: false }) });
        globalThis.fetch = f.fn as unknown as typeof fetch;
        expect(await findPaymentIntentForLedger({ customerId: 'cus_a', ledgerId: 'led_x', createdAfter: new Date() })).toBeNull();
    });
});
