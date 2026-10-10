import { supabaseApi } from "./supabase.js";

// ─── Stripe: ein Modul statt drei Kopien ─────────────────────────────────────
//
// Bis Phase 4 hatten billing.ts (Abo-Rechnungen), assistant.ts (Checkout fuer
// Assistant Pro) und die Portal-Route in index.ts je eine eigene
// `stripeForm`-Funktion. Phase 4 bringt die erste Belastung, die eine
// Buchung entscheidet — und damit den Grund, alle Aufrufe durch EINE Tuer zu
// schicken: ein Ort fuer den Idempotency-Key, ein Fehlertyp, den die Buchung
// unterscheiden kann (Karte abgelehnt vs. Stripe nicht erreichbar), und ein
// Modul, das der API-Test als Ganzes ersetzen kann, ohne `globalThis.fetch`
// anzufassen (die Testsuite spricht den eigenen Server darueber).
//
// Kein SDK, weiter form-encoded `fetch`: die Oberflaeche, die wir brauchen,
// sind sechs Pfade. Der Schluessel kommt aus STRIPE_SECRET_KEY (auf Staging
// ein Restricted Key in der VPS-.env, nie im Repo). Fuer Phase 4 braucht er
// zusaetzlich `payment_intents: write`, `customers: write`, `refunds: write`,
// `payment_methods: read` (docs/stripe-setup.md).

export function isStripeConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
}

/** Ein Stripe-Fehler, der sagt, ob die Karte oder Stripe das Problem war. */
export class StripeError extends Error {
    readonly status: number;
    readonly code: string | null;
    readonly declineCode: string | null;
    readonly type: string | null;
    constructor(path: string, status: number, body: { error?: { message?: string; code?: string; decline_code?: string; type?: string } } | null) {
        super(`Stripe ${path}: ${body?.error?.message || status}`);
        this.name = 'StripeError';
        this.status = status;
        this.code = body?.error?.code ?? null;
        this.declineCode = body?.error?.decline_code ?? null;
        this.type = body?.error?.type ?? null;
    }
    /** `card_error` ist die Karte; alles andere (Netz, 5xx, Konfiguration) ist Stripe oder wir. */
    get isCardError(): boolean { return this.type === 'card_error'; }
}

export async function stripeRequest(
    method: 'POST' | 'GET',
    path: string,
    params?: Record<string, string>,
    opts: { idempotencyKey?: string } = {},
): Promise<Record<string, any>> {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new StripeError(path, 503, { error: { message: 'STRIPE_NOT_CONFIGURED', type: 'config' } });
    const url = `https://api.stripe.com/v1/${path}${method === 'GET' && params ? `?${new URLSearchParams(params)}` : ''}`;
    const headers: Record<string, string> = { 'Authorization': `Bearer ${stripeKey}` };
    if (method === 'POST') headers['Content-Type'] = 'application/x-www-form-urlencoded';
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
    const resp = await fetch(url, {
        method,
        headers,
        ...(method === 'POST' && params ? { body: new URLSearchParams(params).toString() } : {}),
    });
    const body = await resp.json().catch(() => null) as Record<string, any> | null;
    if (!resp.ok) throw new StripeError(path, resp.status, body);
    return body ?? {};
}

/** Den Stripe-Kunden eines Anbieters holen oder anlegen (Name, Kontaktadresse, provider_key als Metadatum). */
export async function ensureStripeCustomer(providerKey: string): Promise<string> {
    const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as
        Array<{ name: string; contact_email?: string | null; stripe_customer_id?: string | null }>;
    if (!rows[0]) throw new Error(`Provider not found: ${providerKey}`);
    if (rows[0].stripe_customer_id) return rows[0].stripe_customer_id;
    const customer = await stripeRequest('POST', 'customers', {
        name: rows[0].name || providerKey,
        ...(rows[0].contact_email ? { email: rows[0].contact_email } : {}),
        'metadata[provider_key]': providerKey,
    });
    const customerId = String(customer.id);
    await supabaseApi.update('providers', { provider_key: providerKey }, { stripe_customer_id: customerId });
    return customerId;
}

export interface CustomerBilling {
    defaultPaymentMethodId: string | null;
    /** Kartenmarke und letzte vier Ziffern, nur zur Anzeige im eigenen Dashboard. */
    paymentMethodLabel: string | null;
    email: string | null;
    /** Name und Land des Kunden stehen — mehr verlangt der Processor fuer eine Belastung nicht. */
    billingInfoComplete: boolean;
    delinquent: boolean;
    /** Die Karte hing am Kunden, war aber kein Standard — dieser Aufruf hat sie dazu gemacht. */
    promotedDefault: boolean;
}

/**
 * Was Stripe ueber den Kunden weiss, soweit die Zahlungsbereitschaft davon
 * abhaengt.
 *
 * Das Kundenportal haengt eine neue Karte an den Kunden, setzt sie aber nicht
 * als Standard (`invoice_settings.default_payment_method`) — Befund Staging
 * 2026-10-05: Karte 4242 hinterlegt, Abgleich meldet weiter „kein
 * Zahlungsmittel". Ohne Standard laeuft weder die Belastung off-session noch
 * die Monatsrechnung. Haengt also eine Karte am Kunden und keine ist Standard,
 * wird die juengste es; der Aufrufer erfaehrt das ueber `promotedDefault` und
 * protokolliert es.
 */
export async function getCustomerBilling(customerId: string): Promise<CustomerBilling> {
    const c = await stripeRequest('GET', `customers/${customerId}`, { 'expand[]': 'invoice_settings.default_payment_method' });
    let pm = c.invoice_settings?.default_payment_method ?? null;
    let promotedDefault = false;
    if (!pm) {
        const list = await stripeRequest('GET', 'payment_methods', { customer: customerId, type: 'card', limit: '1' });
        const attached = Array.isArray(list.data) ? list.data[0] : null;
        if (attached?.id) {
            await stripeRequest('POST', `customers/${customerId}`, { 'invoice_settings[default_payment_method]': String(attached.id) });
            pm = attached;
            promotedDefault = true;
        }
    }
    const pmId = typeof pm === 'string' ? pm : pm?.id ?? null;
    const card = typeof pm === 'object' && pm ? pm.card : null;
    return {
        defaultPaymentMethodId: pmId,
        paymentMethodLabel: card ? `${String(card.brand || 'card')} ····${String(card.last4 || '')}` : null,
        email: c.email ?? null,
        billingInfoComplete: !!(c.name && (c.address?.country || c.tax_ids?.data?.length)),
        delinquent: !!c.delinquent,
        promotedDefault,
    };
}

export type ChargeFailureReason =
    | 'card_declined' | 'insufficient_funds' | 'expired_card' | 'authentication_required'
    | 'no_payment_method' | 'stripe_error';

export type ChargeResult =
    | { ok: true; paymentIntentId: string; status: 'succeeded' }
    | { ok: false; kind: 'card' | 'stripe'; reason: ChargeFailureReason; stripeRef: string | null; detail: string };

/**
 * Off-session belasten, synchron bestaetigt. Der Idempotency-Key ist die
 * Ledger-Zeile, die VOR diesem Aufruf existiert: ein Wiederholungsversuch mit
 * demselben Key liefert dasselbe Ergebnis statt einer zweiten Belastung.
 * `requires_action` (SCA) kann off-session niemand beantworten — das zaehlt
 * als Kartenfehler mit Grund `authentication_required`.
 */
export async function createPaymentIntent(args: {
    customerId: string;
    paymentMethodId: string;
    amountCents: number;
    currency: string;
    description: string;
    metadata: Record<string, string>;
    idempotencyKey: string;
    receiptEmail?: string | null;
}): Promise<ChargeResult> {
    const params: Record<string, string> = {
        amount: String(args.amountCents),
        currency: args.currency.toLowerCase(),
        customer: args.customerId,
        payment_method: args.paymentMethodId,
        off_session: 'true',
        confirm: 'true',
        description: args.description,
        ...(args.receiptEmail ? { receipt_email: args.receiptEmail } : {}),
    };
    for (const [k, v] of Object.entries(args.metadata)) params[`metadata[${k}]`] = v;
    try {
        const pi = await stripeRequest('POST', 'payment_intents', params, { idempotencyKey: args.idempotencyKey });
        const status = String(pi.status || '');
        if (status === 'succeeded') return { ok: true, paymentIntentId: String(pi.id), status: 'succeeded' };
        if (status === 'requires_action' || status === 'requires_confirmation') {
            return { ok: false, kind: 'card', reason: 'authentication_required', stripeRef: String(pi.id), detail: status };
        }
        return { ok: false, kind: 'card', reason: 'card_declined', stripeRef: String(pi.id), detail: status || 'unknown_status' };
    } catch (err) {
        if (err instanceof StripeError && err.isCardError) {
            const ref = typeof (err as any).paymentIntentId === 'string' ? (err as any).paymentIntentId : null;
            return { ok: false, kind: 'card', reason: mapDecline(err.code, err.declineCode), stripeRef: ref, detail: err.declineCode || err.code || err.message };
        }
        if (err instanceof StripeError && err.code === 'resource_missing' && /payment_method/.test(err.message)) {
            return { ok: false, kind: 'card', reason: 'no_payment_method', stripeRef: null, detail: err.message };
        }
        return { ok: false, kind: 'stripe', reason: 'stripe_error', stripeRef: null, detail: err instanceof Error ? err.message : String(err) };
    }
}

function mapDecline(code: string | null, declineCode: string | null): ChargeFailureReason {
    if (code === 'authentication_required') return 'authentication_required';
    if (code === 'expired_card' || declineCode === 'expired_card') return 'expired_card';
    if (declineCode === 'insufficient_funds') return 'insufficient_funds';
    return 'card_declined';
}

export type VerifyResult =
    | { ok: true; setupIntentId: string }
    | { ok: false; kind: 'card' | 'stripe'; reason: ChargeFailureReason; detail: string };

/**
 * ADR-0008 A2: das hinterlegte Zahlungsmittel pruefen, ohne Geld zu bewegen —
 * ein SetupIntent ueber das Mittel, sofort bestaetigt. Bestaetigt Stripe es,
 * ist die Karte wieder brauchbar; eine echte Belastung kann trotzdem scheitern
 * (eine Pruefung ist keine Deckungszusage). `requires_action` kann hier
 * niemand beantworten und zaehlt wie bei der Belastung als
 * `authentication_required`.
 */
export async function verifyPaymentMethod(args: { customerId: string; paymentMethodId: string; idempotencyKey: string }): Promise<VerifyResult> {
    try {
        const si = await stripeRequest('POST', 'setup_intents', {
            customer: args.customerId,
            payment_method: args.paymentMethodId,
            'payment_method_types[]': 'card',
            usage: 'off_session',
            confirm: 'true',
            'metadata[purpose]': 'payment_method_recheck',
        }, { idempotencyKey: args.idempotencyKey });
        const status = String(si.status || '');
        if (status === 'succeeded') return { ok: true, setupIntentId: String(si.id) };
        if (status === 'requires_action' || status === 'requires_confirmation') return { ok: false, kind: 'card', reason: 'authentication_required', detail: status };
        return { ok: false, kind: 'card', reason: 'card_declined', detail: status || 'unknown_status' };
    } catch (err) {
        if (err instanceof StripeError && err.isCardError) return { ok: false, kind: 'card', reason: mapDecline(err.code, err.declineCode), detail: err.declineCode || err.code || err.message };
        return { ok: false, kind: 'stripe', reason: 'stripe_error', detail: err instanceof Error ? err.message : String(err) };
    }
}

/** Erstattung einer Belastung, deren Buchung nach dem Capture nicht zustande kam. */
export async function refundPaymentIntent(paymentIntentId: string, idempotencyKey: string): Promise<{ refundId: string }> {
    const r = await stripeRequest('POST', 'refunds', { payment_intent: paymentIntentId }, { idempotencyKey });
    return { refundId: String(r.id) };
}
