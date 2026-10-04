import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// stripe.ts importiert Supabase auf Modulebene (ensureStripeCustomer); hier
// wird es nicht gebraucht.
vi.mock('../supabase.js', () => ({ supabaseApi: {} }));

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
