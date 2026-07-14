import { IncomingMessage, ServerResponse } from "http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";

// ─── Stripe invoicing (provider platform fees) ───────────────────────────────
// Monthly run: every engagement that reached confirmed/replied in the period
// becomes one €92 invoice item (pricing model: €92 per confirm; the €2 per
// affiliate click joins once A5 ships). Invoices are Stripe-issued
// (collection_method=send_invoice, 14 days) and mirrored into the invoices
// table with the hosted pay link + PDF. Staging sits behind Basic Auth, so
// there is NO webhook — status flows back via syncOpenInvoices() whenever the
// provider opens their invoice list.

const CONFIRM_FEE_CENTS = 9200;

const stripeForm = async (stripeKey: string, method: 'POST' | 'GET', path: string, params?: Record<string, string>) => {
    const url = `https://api.stripe.com/v1/${path}${method === 'GET' && params ? `?${new URLSearchParams(params)}` : ''}`;
    const resp = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${stripeKey}`, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        ...(method === 'POST' && params ? { body: new URLSearchParams(params).toString() } : {}),
    });
    const body = await resp.json() as Record<string, unknown> & { error?: { message?: string } };
    if (!resp.ok) throw new Error(`Stripe ${path}: ${body.error?.message || resp.status}`);
    return body;
};

async function ensureStripeCustomer(stripeKey: string, providerKey: string): Promise<string> {
    const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as
        Array<{ name: string; contact_email?: string | null; stripe_customer_id?: string | null }>;
    if (!rows[0]) throw new Error(`Provider not found: ${providerKey}`);
    if (rows[0].stripe_customer_id) return rows[0].stripe_customer_id;
    const customer = await stripeForm(stripeKey, 'POST', 'customers', {
        name: rows[0].name || providerKey,
        ...(rows[0].contact_email ? { email: rows[0].contact_email } : {}),
        'metadata[provider_key]': providerKey,
    });
    const customerId = String(customer.id);
    await supabaseApi.update('providers', { provider_key: providerKey }, { stripe_customer_id: customerId });
    return customerId;
}

type Engagement = { id: string; provider_key: string; country: string; category: string; status: string; updated_at: string };

// POST /api/v1/admin/billing/run — {period?: 'YYYY-MM', dry_run?: boolean}.
// Server-to-server only (x-api-key); JWT users must not trigger billing.
export function handleBillingRun(req: IncomingMessage, res: ServerResponse, correlationId: string, isAdminKey: boolean): void {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); if (raw.length > 4_000) req.destroy(); });
    req.on('end', async () => {
        res.setHeader('x-correlation-id', correlationId);
        try {
            if (!isAdminKey) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'FORBIDDEN', message: 'Billing runs are admin-only', correlationId }));
                return;
            }
            const stripeKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeKey) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not connected yet', correlationId }));
                return;
            }
            const d = JSON.parse(raw || '{}') as { period?: unknown; dry_run?: unknown };
            const period = typeof d.period === 'string' && /^\d{4}-\d{2}$/.test(d.period)
                ? d.period : new Date().toISOString().slice(0, 7);
            const dryRun = d.dry_run === true;

            // Billable = engagements whose status settled at confirmed/replied
            // within the period (updated_at bumps on the status transition).
            const billable: Engagement[] = [];
            for (const status of ['confirmed', 'replied']) {
                const rows = (await supabaseApi.select('engagement_requests', { status }, { limit: 500 })) as Engagement[];
                billable.push(...rows.filter((r) => (r.updated_at || '').slice(0, 7) === period));
            }
            const byProvider = new Map<string, Engagement[]>();
            for (const e of billable) {
                byProvider.set(e.provider_key, [...(byProvider.get(e.provider_key) || []), e]);
            }

            const results: Array<Record<string, unknown>> = [];
            for (const [providerKey, engagements] of byProvider) {
                // Idempotent: one Stripe invoice per provider and period.
                const existing = (await supabaseApi.select('invoices', { provider_key: providerKey, period }, { limit: 5 })) as
                    Array<{ stripe_invoice_id?: string | null }>;
                if (existing.some((r) => r.stripe_invoice_id)) {
                    results.push({ provider: providerKey, skipped: 'already invoiced' });
                    continue;
                }
                const lineItems = engagements.map((e) => ({
                    label: `Confirmed engagement RQ-${e.id.slice(0, 4).toUpperCase()} · ${e.country} / ${e.category}`,
                    qty: 1,
                    unit_cents: CONFIRM_FEE_CENTS,
                    amount_cents: CONFIRM_FEE_CENTS,
                }));
                const totalCents = lineItems.reduce((s, li) => s + li.amount_cents, 0);
                if (dryRun) {
                    results.push({ provider: providerKey, dry_run: true, items: lineItems.length, total_cents: totalCents });
                    continue;
                }

                const customerId = await ensureStripeCustomer(stripeKey, providerKey);
                const invoice = await stripeForm(stripeKey, 'POST', 'invoices', {
                    customer: customerId,
                    collection_method: 'send_invoice',
                    days_until_due: '14',
                    currency: 'eur',
                    description: `CompliHub360 platform fees · ${period}`,
                    'metadata[provider_key]': providerKey,
                    'metadata[period]': period,
                });
                const invoiceId = String(invoice.id);
                for (const li of lineItems) {
                    await stripeForm(stripeKey, 'POST', 'invoiceitems', {
                        customer: customerId,
                        invoice: invoiceId,
                        amount: String(li.amount_cents),
                        currency: 'eur',
                        description: li.label,
                    });
                }
                const finalized = await stripeForm(stripeKey, 'POST', `invoices/${invoiceId}/finalize`) as {
                    id: string; number?: string; status?: string; total?: number;
                    hosted_invoice_url?: string; invoice_pdf?: string; due_date?: number;
                };
                await supabaseApi.insert('invoices', {
                    provider_key: providerKey,
                    invoice_number: finalized.number || invoiceId,
                    period,
                    amount_cents: finalized.total ?? totalCents,
                    currency: 'EUR',
                    status: 'open',
                    line_items: lineItems,
                    due_at: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString() : null,
                    stripe_invoice_id: finalized.id,
                    hosted_invoice_url: finalized.hosted_invoice_url ?? null,
                    invoice_pdf: finalized.invoice_pdf ?? null,
                });
                await supabaseApi.insert('event_log', {
                    type: 'invoice_issued',
                    payload: { providerKey, period, total_cents: finalized.total ?? totalCents, items: lineItems.length },
                }).catch(() => { /* non-blocking */ });
                results.push({ provider: providerKey, invoice: finalized.number || invoiceId, items: lineItems.length, total_cents: finalized.total ?? totalCents });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, period, providers: results.length, results, correlationId }));
        } catch (err) {
            structuredLog('error', 'Billing run failed', { correlationId, errorCode: 'ERR_BILLING_RUN', severity: 'error', route: '/api/v1/admin/billing/run' });
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'BILLING_ERROR', message: 'Billing run failed', correlationId }));
        }
    });
}

// Webhook substitute: pull payment status for open Stripe invoices whenever
// the provider looks at their invoice list. Cheap (open rows only, cap 5).
export async function syncOpenInvoices(providerKey: string): Promise<void> {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return;
    const rows = (await supabaseApi.select('invoices', { provider_key: providerKey, status: 'open' }, { limit: 5 })) as
        Array<{ id: string; stripe_invoice_id?: string | null }>;
    for (const row of rows) {
        if (!row.stripe_invoice_id) continue;
        try {
            const inv = await stripeForm(stripeKey, 'GET', `invoices/${row.stripe_invoice_id}`) as {
                status?: string; status_transitions?: { paid_at?: number | null };
            };
            const mapped = inv.status === 'paid' ? 'paid'
                : inv.status === 'void' ? 'void'
                : inv.status === 'uncollectible' ? 'failed'
                : null;
            if (mapped) {
                await supabaseApi.update('invoices', { id: row.id }, {
                    status: mapped,
                    ...(mapped === 'paid' ? { paid_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString() } : {}),
                });
            }
        } catch { /* keep row as-is; next visit retries */ }
    }
}
