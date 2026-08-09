import { IncomingMessage, ServerResponse } from "http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";

// ─── Stripe invoicing (provider platform fees) ───────────────────────────────
// Monthly run over the v2 monetisation events (pricing decision 2026-08-09,
// see docs/pricing/pricing-benchmarks-2026-08.md):
//   · Lead-Fee 120 € per booking (provider_lead_charged; no refund on
//     cancel/no-show — decided §11 P7)
//   · Abo 149 €/month OR 1.490 €/year (2 months free), incl. 1 lead/month
//     + unlimited detail opens; annual bills in the anniversary month
//   · Detail-Open 3 € (non-subscribers only, deduped 1×/user/30d at insert
//     time), capped at 50 €/month
//   · First 2 leads per provider EVER are free (offline-recruiting sweetener)
// Invoices are Stripe-issued (collection_method=send_invoice, 14 days) and
// mirrored into the invoices table with the hosted pay link + PDF. Staging
// sits behind Basic Auth, so there is NO webhook — status flows back via
// syncOpenInvoices() whenever the provider opens their invoice list.

const int = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
};

export const PRICING = {
    leadFeeCents: int(process.env.LEAD_FEE_CENTS, 12000),
    detailOpenCents: int(process.env.DETAIL_OPEN_CENTS, 300),
    detailOpenCapCents: int(process.env.DETAIL_OPEN_CAP_CENTS, 5000),
    aboMonthlyCents: int(process.env.ABO_MONTHLY_CENTS, 14900),
    // Industry-standard annual discount: 12 for the price of 10 (~17 %).
    aboAnnualCents: int(process.env.ABO_ANNUAL_CENTS, 149000),
    aboIncludedLeadsPerMonth: 1,
    freeLeadsPerProvider: int(process.env.FREE_LEADS_PER_PROVIDER, 2),
};

export type SubscriptionPlan = 'none' | 'monthly' | 'annual';

export interface ProviderChargeInput {
    providerKey: string;
    period: string;                     // 'YYYY-MM'
    subscriptionPlan: SubscriptionPlan;
    subscriptionSince: string | null;   // ISO timestamp
    leadsInPeriod: number;
    leadsBeforePeriod: number;          // lifetime leads before the period (free-allowance basis)
    detailOpensInPeriod: number;
}

export interface ChargeLine { label: string; qty: number; unit_cents: number; amount_cents: number }

/** Deterministic charge computation for one provider and period — pure so the
 *  test suite can pin every pricing rule without Stripe or a database. */
export function computeProviderCharges(inp: ProviderChargeInput): { lines: ChargeLine[]; total_cents: number } {
    const lines: ChargeLine[] = [];
    const sinceMonth = inp.subscriptionSince ? inp.subscriptionSince.slice(0, 7) : null;
    const subscribed = inp.subscriptionPlan !== 'none' && sinceMonth !== null && sinceMonth <= inp.period;

    // Abo: monthly bills every period; annual bills only in the anniversary month.
    if (subscribed && inp.subscriptionPlan === 'monthly') {
        lines.push({ label: `Partner-Abo (monatlich) · ${inp.period}`, qty: 1, unit_cents: PRICING.aboMonthlyCents, amount_cents: PRICING.aboMonthlyCents });
    } else if (subscribed && inp.subscriptionPlan === 'annual' && sinceMonth!.slice(5, 7) === inp.period.slice(5, 7)) {
        lines.push({ label: `Partner-Abo (jährlich, 2 Monate geschenkt) · ${inp.period} – 12 Monate`, qty: 1, unit_cents: PRICING.aboAnnualCents, amount_cents: PRICING.aboAnnualCents });
    }

    // Leads: lifetime free allowance first, then the abo's included lead,
    // the rest at the flat lead fee.
    const remainingFree = Math.max(0, PRICING.freeLeadsPerProvider - inp.leadsBeforePeriod);
    const freeUsed = Math.min(remainingFree, inp.leadsInPeriod);
    const included = subscribed ? Math.min(PRICING.aboIncludedLeadsPerMonth, inp.leadsInPeriod - freeUsed) : 0;
    const chargeableLeads = Math.max(0, inp.leadsInPeriod - freeUsed - included);
    if (chargeableLeads > 0) {
        const notes = [freeUsed > 0 ? `${freeUsed} Freikontingent` : null, included > 0 ? `${included} im Abo inkludiert` : null].filter(Boolean).join(', ');
        lines.push({
            label: `Leads (bestätigte Termine) · ${inp.leadsInPeriod} gesamt${notes ? ` (${notes})` : ''}`,
            qty: chargeableLeads, unit_cents: PRICING.leadFeeCents, amount_cents: chargeableLeads * PRICING.leadFeeCents,
        });
    }

    // Detail opens: unlimited for subscribers, otherwise 3 € each, monthly cap.
    if (!subscribed && inp.detailOpensInPeriod > 0) {
        const raw = inp.detailOpensInPeriod * PRICING.detailOpenCents;
        const amount = Math.min(raw, PRICING.detailOpenCapCents);
        lines.push({
            label: `Detail-Opens (qualifizierte Profilansichten) · ${inp.detailOpensInPeriod}×${raw > amount ? ' · Monats-Cap angewendet' : ''}`,
            qty: inp.detailOpensInPeriod, unit_cents: PRICING.detailOpenCents, amount_cents: amount,
        });
    }

    return { lines, total_cents: lines.reduce((s, l) => s + l.amount_cents, 0) };
}

// ─── Period data collection (event_log is the billing ground truth) ──────────

type BillingEvent = { type: string; timestamp?: string; payload?: { providerKey?: string } };

export async function collectChargeInputs(period: string): Promise<ProviderChargeInput[]> {
    const providers = (await supabaseApi.select('providers', {}, { limit: 1000 })) as
        Array<{ provider_key: string; subscription_plan?: string | null; subscription_since?: string | null; partner_status?: string }>;
    const [leadEvents, openEvents] = await Promise.all([
        supabaseApi.select('event_log', { type: 'provider_lead_charged' }, { limit: 5000 }) as Promise<BillingEvent[]>,
        supabaseApi.select('event_log', { type: 'provider_detail_opened' }, { limit: 5000 }) as Promise<BillingEvent[]>,
    ]);
    const month = (e: BillingEvent) => (e.timestamp || '').slice(0, 7);
    return providers.map((p) => {
        const myLeads = leadEvents.filter((e) => e.payload?.providerKey === p.provider_key);
        return {
            providerKey: p.provider_key,
            period,
            subscriptionPlan: (p.subscription_plan === 'monthly' || p.subscription_plan === 'annual') ? p.subscription_plan : 'none',
            subscriptionSince: p.subscription_since ?? null,
            leadsInPeriod: myLeads.filter((e) => month(e) === period).length,
            leadsBeforePeriod: myLeads.filter((e) => month(e) < period).length,
            detailOpensInPeriod: openEvents.filter((e) => e.payload?.providerKey === p.provider_key && month(e) === period).length,
        };
    });
}

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
            const d = JSON.parse(raw || '{}') as { period?: unknown; dry_run?: unknown };
            const period = typeof d.period === 'string' && /^\d{4}-\d{2}$/.test(d.period)
                ? d.period : new Date().toISOString().slice(0, 7);
            const dryRun = d.dry_run === true;
            // Dry runs are pure computation — Stripe is only needed to issue.
            const stripeKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeKey && !dryRun) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not connected yet', correlationId }));
                return;
            }

            const inputs = await collectChargeInputs(period);
            const results: Array<Record<string, unknown>> = [];
            for (const inp of inputs) {
                const providerKey = inp.providerKey;
                const { lines: lineItems, total_cents: totalCents } = computeProviderCharges(inp);
                if (lineItems.length === 0) continue;   // nothing billable this period
                // Idempotent: one Stripe invoice per provider and period.
                const existing = (await supabaseApi.select('invoices', { provider_key: providerKey, period }, { limit: 5 })) as
                    Array<{ stripe_invoice_id?: string | null }>;
                if (existing.some((r) => r.stripe_invoice_id)) {
                    results.push({ provider: providerKey, skipped: 'already invoiced' });
                    continue;
                }
                if (dryRun) {
                    results.push({ provider: providerKey, dry_run: true, items: lineItems.length, total_cents: totalCents, lines: lineItems });
                    continue;
                }

                const customerId = await ensureStripeCustomer(stripeKey!, providerKey);
                const invoice = await stripeForm(stripeKey!, 'POST', 'invoices', {
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
                    await stripeForm(stripeKey!, 'POST', 'invoiceitems', {
                        customer: customerId,
                        invoice: invoiceId,
                        amount: String(li.amount_cents),
                        currency: 'eur',
                        description: li.label,
                    });
                }
                const finalized = await stripeForm(stripeKey!, 'POST', `invoices/${invoiceId}/finalize`) as {
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

// GET /api/v1/provider/:key/billing/preview — the CURRENT period's charges as
// the provider dashboard shows them (no Stripe involved, pure computation).
export async function handleBillingPreview(res: ServerResponse, correlationId: string, providerKey: string): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    try {
        const period = new Date().toISOString().slice(0, 7);
        const inputs = await collectChargeInputs(period);
        const inp = inputs.find((i) => i.providerKey === providerKey);
        if (!inp) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
            return;
        }
        const { lines, total_cents } = computeProviderCharges(inp);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true, period, provider_key: providerKey,
            subscription: { plan: inp.subscriptionPlan, since: inp.subscriptionSince },
            usage: { leads: inp.leadsInPeriod, detail_opens: inp.detailOpensInPeriod, free_leads_left: Math.max(0, PRICING.freeLeadsPerProvider - inp.leadsBeforePeriod) },
            lines, total_cents,
            pricing: { lead_fee_cents: PRICING.leadFeeCents, detail_open_cents: PRICING.detailOpenCents, detail_open_cap_cents: PRICING.detailOpenCapCents, abo_monthly_cents: PRICING.aboMonthlyCents, abo_annual_cents: PRICING.aboAnnualCents, abo_included_leads: PRICING.aboIncludedLeadsPerMonth, free_leads: PRICING.freeLeadsPerProvider },
            correlationId,
        }));
    } catch (err) {
        structuredLog('error', 'Billing preview failed', { correlationId, errorCode: 'ERR_BILLING_PREVIEW', severity: 'error', route: 'billing/preview' });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Billing preview failed', correlationId }));
    }
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
