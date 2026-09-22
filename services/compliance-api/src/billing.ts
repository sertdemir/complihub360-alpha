import { IncomingMessage, ServerResponse } from "http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";

// ─── Provider Pricing v2 ─────────────────────────────────────────────────────
//
// Spec B "Provider Dashboard Pricing and Operations" v1.0, Entscheidung
// 2026-09-22 (ADR-0003): drei Plaene, vier Lead-Baender, Monatsrabatte,
// alles in USD. Ersetzt das Pricing Phase 1 (120 € Lead, 149 € Abo, 3 €
// Detail-Open, zwei Gratis-Leads) vollstaendig.
//
// Die Zahlen stehen NICHT hier, sondern in plan_catalog, lead_band_config,
// lead_band_rules und lead_fee_eligibility (20260923000000). Dieses Modul
// enthaelt die Regeln, die auf diese Zahlen angewendet werden — als reine
// Funktionen, damit die Tests jede Regel ohne Datenbank festnageln koennen.
//
// Was hier NICHT passiert: die Belastung der Karte. Die gehoert in die
// Buchung (Phase 4). `quoteLeadFee` liefert dafuer das Angebot; wer es
// ausfuehrt, schreibt das Ledger.
//
// Die eine Regel ueber allem (Spec A §14, Spec B Grundsaetze, DNA §3): nichts
// aus diesem Modul beruehrt das Matching. Der Scorer in index.ts importiert
// hier nichts, und ein Test in api.test.ts haelt fest, dass ein Anbieter mit
// Essential und mit Global denselben Score bekommt.

export const LEAD_FEE_POLICY_VERSION = 'lead-fee-policy-v1';

// ─── Konfiguration, wie sie aus der Datenbank kommt ──────────────────────────

export type PlanCode = 'essential' | 'growth' | 'global';

export interface PlanConfig {
    code: PlanCode;
    version: number;
    label: string;
    currency: string;
    monthlyCents: number;
    annualCents: number;
    categoryAllowance: number | null;   // null = alle freigegebenen Hauptkategorien
    leadDiscountPct: number;
    leadDiscountCount: number;
    includedBlogArticles: number;       // gespeichert, ohne Wirkung (Phase 8 blockiert)
    apiEligible: boolean;
    analyticsLevel: 'basic' | 'enhanced' | 'advanced';
}

export interface BandConfig {
    band: 1 | 2 | 3 | 4;
    version: number;
    label: string;
    feeCents: number;
    currency: string;
}

export interface BandRule {
    areaCode: string | null;
    serviceCode: string | null;
    countryPattern: string;         // ISO-2, 'EU' oder '*'
    minCountries: number;
    minServices: number;
    recurring: boolean | null;
    band: 1 | 2 | 3 | 4;
    priority: number;
}

export interface FeeEligibilityException {
    areaCode: string;
    countryCode: string;            // ISO-2 oder '*'
    enabled: boolean;
}

export interface PricingConfig {
    plans: PlanConfig[];
    bands: BandConfig[];
    rules: BandRule[];
    feeExceptions: FeeEligibilityException[];
}

export interface Subscription {
    id: string;
    providerKey: string;
    planCode: PlanCode;
    planVersion: number;
    cadence: 'monthly' | 'annual';
    status: 'active' | 'past_due' | 'cancelled' | 'ended';
    currentPeriodStart: string;     // 'YYYY-MM-DD'
    currentPeriodEnd: string;
    startedAt: string;              // ISO
}

// ─── Reine Regeln ────────────────────────────────────────────────────────────

/** Spec B: "Annual subscriptions charge ten months of the applicable monthly price." */
export function annualPriceCents(monthlyCents: number): number {
    return monthlyCents * 10;
}

const EU = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']);

function countryMatches(pattern: string, countries: string[]): boolean {
    if (pattern === '*') return true;
    if (pattern === 'EU') return countries.some((c) => EU.has(c));
    return countries.includes(pattern);
}

export interface LeadOpportunity {
    areaCode: string | null;
    subcategories: string[];
    countries: string[];
    serviceCount?: number;          // verbundene Leistungen; Default = subcategories.length oder 1
    recurring?: boolean | null;
}

/**
 * Welches Band traegt diese Opportunity? Die Regeln kommen aus
 * lead_band_rules; ohne Treffer gilt Band 1 (Spec: "Final category-to-band
 * mapping … will be completed separately").
 *
 * Auswahl unter mehreren Treffern: hoechste `priority`, dann die
 * spezifischere Regel (mehr gesetzte Bedingungen), dann das NIEDRIGERE Band —
 * im Zweifel zugunsten des Anbieters, nie zu seinen Lasten.
 *
 * Bewusst KEIN Eingang: Groesse, Plan oder Umsatz des Anbieters. "Provider
 * size must never change the standard band."
 */
export function computeLeadBand(opp: LeadOpportunity, rules: BandRule[]): { band: 1 | 2 | 3 | 4; rule: BandRule | null } {
    const services = opp.serviceCount ?? Math.max(1, opp.subcategories.length);
    const hits = rules.filter((r) =>
        (r.areaCode === null || r.areaCode === opp.areaCode)
        && (r.serviceCode === null || opp.subcategories.includes(r.serviceCode))
        && countryMatches(r.countryPattern, opp.countries)
        && opp.countries.length >= r.minCountries
        && services >= r.minServices
        && (r.recurring === null || r.recurring === (opp.recurring ?? false)));
    if (!hits.length) return { band: 1, rule: null };
    const specificity = (r: BandRule) =>
        (r.areaCode ? 1 : 0) + (r.serviceCode ? 1 : 0) + (r.countryPattern !== '*' ? 1 : 0)
        + (r.minCountries > 1 ? 1 : 0) + (r.minServices > 1 ? 1 : 0) + (r.recurring !== null ? 1 : 0);
    hits.sort((a, b) => b.priority - a.priority || specificity(b) - specificity(a) || a.band - b.band);
    return { band: hits[0].band, rule: hits[0] };
}

/**
 * Spec A §21: Lead-Gebuehren sind je Kategorie und Land schaltbar und AUS,
 * wo die Rechtsberatung nicht freigegeben hat. Die Ausnahmen kommen aus
 * lead_fee_eligibility; die spezifischste gewinnt; ohne Ausnahme: erlaubt.
 */
export function leadFeeEnabled(exceptions: FeeEligibilityException[], areaCode: string | null, countries: string[]): boolean {
    if (!areaCode) return true;
    const mine = exceptions.filter((e) => e.areaCode === areaCode);
    for (const c of countries) {
        const exact = mine.find((e) => e.countryCode === c);
        if (exact) { if (!exact.enabled) return false; continue; }
        const any = mine.find((e) => e.countryCode === '*');
        if (any && !any.enabled) return false;
    }
    if (!countries.length) {
        const any = mine.find((e) => e.countryCode === '*');
        if (any && !any.enabled) return false;
    }
    return true;
}

export interface DiscountResult {
    discountPct: number;
    discountSequence: number | null;    // 1..n im Zyklus, null = kein Rabatt
    finalFeeCents: number;
    counterUsedAfter: number;
}

/**
 * Spec B: Growth 10 % auf die ersten 3, Global 15 % auf die ersten 6
 * belasteten Leads je Abrechnungsmonat; Essential keinen. Der Zaehler
 * haengt am Anbieter und am Zyklus (provider_discount_counter), nicht am
 * Abo — ein Planwechsel im Zyklus findet ihn vor und kann das Kontingent
 * nur bis zur eigenen Grenze ausschoepfen, nie von vorn.
 */
export function applyMonthlyDiscount(plan: PlanConfig | null, counterUsed: number, standardFeeCents: number): DiscountResult {
    if (!plan || plan.leadDiscountCount <= 0 || plan.leadDiscountPct <= 0 || counterUsed >= plan.leadDiscountCount) {
        return { discountPct: 0, discountSequence: null, finalFeeCents: standardFeeCents, counterUsedAfter: counterUsed };
    }
    const pct = plan.leadDiscountPct;
    return {
        discountPct: pct,
        discountSequence: counterUsed + 1,
        finalFeeCents: Math.round(standardFeeCents * (100 - pct) / 100),
        counterUsedAfter: counterUsed + 1,
    };
}

export interface AllowanceCheck { ok: boolean; allowance: number | null; used: number; over: string[] }

/**
 * Spec B: die Hauptkategorie ist die abo-kontrollierte Einheit (1 / bis 5 /
 * alle). Unterkategorien, Leistungen und Laender sind NICHT begrenzt — die
 * haengen nur an der Verifikation. `selectedAreas` sind Bereichs-Codes.
 */
export function categoryAllowanceCheck(plan: PlanConfig | null, selectedAreas: string[]): AllowanceCheck {
    const areas = Array.from(new Set(selectedAreas));
    const allowance = plan ? plan.categoryAllowance : 0;
    if (allowance === null) return { ok: true, allowance, used: areas.length, over: [] };
    return { ok: areas.length <= allowance, allowance, used: areas.length, over: areas.slice(allowance) };
}

export interface ChargeLine { label: string; qty: number; unit_cents: number; amount_cents: number }

/**
 * Die Abo-Zeile fuer eine Periode 'YYYY-MM': monatlich jede Periode ab dem
 * Start, jaehrlich nur im Jubilaeumsmonat. Leads stehen hier NICHT — die
 * werden je Buchung belastet (Phase 4) und landen im Ledger, nicht auf der
 * Monatsrechnung.
 */
export function subscriptionChargeForPeriod(sub: Subscription | null, plan: PlanConfig | null, period: string): ChargeLine | null {
    if (!sub || !plan || sub.status === 'ended' || sub.status === 'cancelled') return null;
    const startMonth = sub.startedAt.slice(0, 7);
    if (startMonth > period) return null;
    if (sub.cadence === 'monthly') {
        return { label: `${plan.label} · monthly · ${period}`, qty: 1, unit_cents: plan.monthlyCents, amount_cents: plan.monthlyCents };
    }
    if (startMonth.slice(5, 7) !== period.slice(5, 7)) return null;
    return { label: `${plan.label} · annual (12 months for the price of 10) · from ${period}`, qty: 1, unit_cents: plan.annualCents, amount_cents: plan.annualCents };
}

/** Beginn des laufenden Rabatt-Zyklus: der Periodenbeginn des Abos, sonst der Monatserste. */
export function cycleStartFor(sub: Subscription | null, today: Date): string {
    if (sub) return sub.currentPeriodStart;
    return today.toISOString().slice(0, 8) + '01';
}

// ─── Angebot fuer einen Lead (Phase 4 fuehrt es aus) ─────────────────────────

export interface LeadFeeQuote {
    enabled: boolean;                   // false = fuer diese Kategorie/Land keine Gebuehr (regulierter Beruf)
    band: 1 | 2 | 3 | 4;
    bandLabel: string;
    bandVersion: number;
    standardFeeCents: number;
    currency: string;
    planCode: PlanCode | null;
    planVersion: number | null;
    discountPct: number;
    discountSequence: number | null;
    finalFeeCents: number;
    counterUsedAfter: number;
    cycleStart: string;
    policyVersion: string;
}

export function quoteLeadFee(
    cfg: PricingConfig, sub: Subscription | null, opp: LeadOpportunity, counterUsed: number, today: Date = new Date(),
): LeadFeeQuote {
    const plan = sub ? cfg.plans.find((p) => p.code === sub.planCode && p.version === sub.planVersion) ?? null : null;
    const { band } = computeLeadBand(opp, cfg.rules);
    const bandCfg = cfg.bands.find((b) => b.band === band);
    if (!bandCfg) throw new Error(`lead_band_config: Band ${band} fehlt`);
    const enabled = leadFeeEnabled(cfg.feeExceptions, opp.areaCode, opp.countries);
    const disc = enabled
        ? applyMonthlyDiscount(plan, counterUsed, bandCfg.feeCents)
        : { discountPct: 0, discountSequence: null, finalFeeCents: 0, counterUsedAfter: counterUsed };
    return {
        enabled,
        band, bandLabel: bandCfg.label, bandVersion: bandCfg.version,
        standardFeeCents: enabled ? bandCfg.feeCents : 0,
        currency: bandCfg.currency,
        planCode: plan?.code ?? null, planVersion: plan?.version ?? null,
        discountPct: disc.discountPct, discountSequence: disc.discountSequence,
        finalFeeCents: disc.finalFeeCents, counterUsedAfter: disc.counterUsedAfter,
        cycleStart: cycleStartFor(sub, today),
        policyVersion: LEAD_FEE_POLICY_VERSION,
    };
}

// ─── Datenzugriff ────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

export async function loadPricingConfig(): Promise<PricingConfig> {
    const [plans, bands, rules, exc] = await Promise.all([
        supabaseApi.select('plan_catalog', {}, { limit: 100 }) as Promise<any[]>,
        supabaseApi.select('lead_band_config', {}, { limit: 100 }) as Promise<any[]>,
        supabaseApi.select('lead_band_rules', {}, { limit: 1000 }) as Promise<any[]>,
        supabaseApi.select('lead_fee_eligibility', {}, { limit: 1000 }) as Promise<any[]>,
    ]);
    const now = today();
    // Je Code die juengste Version, die schon gilt.
    const latest = (rows: any[], key: string) => {
        const by = new Map<string, any>();
        for (const r of rows) {
            if (r.effective_from && String(r.effective_from) > now) continue;
            const cur = by.get(String(r[key]));
            if (!cur || r.version > cur.version) by.set(String(r[key]), r);
        }
        return Array.from(by.values());
    };
    return {
        plans: latest(plans, 'code').map((p) => ({
            code: p.code, version: p.version, label: p.label, currency: p.currency,
            monthlyCents: p.monthly_cents, annualCents: p.annual_cents,
            categoryAllowance: p.category_allowance ?? null,
            leadDiscountPct: p.lead_discount_pct, leadDiscountCount: p.lead_discount_count,
            includedBlogArticles: p.included_blog_articles, apiEligible: !!p.api_eligible,
            analyticsLevel: p.analytics_level,
        })),
        bands: latest(bands, 'band').map((b) => ({ band: b.band, version: b.version, label: b.label, feeCents: b.fee_cents, currency: b.currency })),
        rules: rules
            .filter((r) => (!r.effective_from || String(r.effective_from) <= now) && (!r.effective_to || String(r.effective_to) > now))
            .map((r) => ({
                areaCode: r.area_code ?? null, serviceCode: r.service_code ?? null, countryPattern: r.country_pattern ?? '*',
                minCountries: r.min_countries ?? 1, minServices: r.min_services ?? 1, recurring: r.recurring ?? null,
                band: r.band, priority: r.priority ?? 0,
            })),
        feeExceptions: exc.map((e) => ({ areaCode: e.area_code, countryCode: e.country_code ?? '*', enabled: !!e.enabled })),
    };
}

export async function getActiveSubscription(providerKey: string): Promise<Subscription | null> {
    const rows = (await supabaseApi.select('provider_subscriptions', { provider_key: providerKey }, { order: 'started_at.desc', limit: 5 })) as any[];
    const open = rows.find((r) => !r.ended_at);
    if (!open) return null;
    return {
        id: open.id, providerKey, planCode: open.plan_code, planVersion: open.plan_version ?? 1,
        cadence: open.cadence, status: open.status,
        currentPeriodStart: String(open.current_period_start), currentPeriodEnd: String(open.current_period_end),
        startedAt: String(open.started_at),
    };
}

export async function getDiscountCounter(providerKey: string, cycleStart: string): Promise<number> {
    const rows = (await supabaseApi.select('provider_discount_counter', { provider_key: providerKey, cycle_start: cycleStart }, { limit: 1 })) as any[];
    return rows[0]?.used ?? 0;
}

// ─── Stripe (Abo-Rechnung) ───────────────────────────────────────────────────

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
// Stellt die ABO-Rechnungen der Periode aus. Leads laufen nicht hier: die
// werden je Buchung belastet und stehen im Ledger. Server-Key only.
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
            const stripeKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeKey && !dryRun) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not connected yet', correlationId }));
                return;
            }

            const cfg = await loadPricingConfig();
            const subs = (await supabaseApi.select('provider_subscriptions', {}, { limit: 5000 })) as any[];
            const results: Array<Record<string, unknown>> = [];
            for (const row of subs) {
                if (row.ended_at) continue;
                const sub: Subscription = {
                    id: row.id, providerKey: row.provider_key, planCode: row.plan_code, planVersion: row.plan_version ?? 1,
                    cadence: row.cadence, status: row.status,
                    currentPeriodStart: String(row.current_period_start), currentPeriodEnd: String(row.current_period_end),
                    startedAt: String(row.started_at),
                };
                const plan = cfg.plans.find((p) => p.code === sub.planCode) ?? null;
                const line = subscriptionChargeForPeriod(sub, plan, period);
                if (!line || !plan) continue;
                const providerKey = sub.providerKey;
                const existing = (await supabaseApi.select('invoices', { provider_key: providerKey, period }, { limit: 5 })) as
                    Array<{ stripe_invoice_id?: string | null }>;
                if (existing.some((r) => r.stripe_invoice_id)) {
                    results.push({ provider: providerKey, skipped: 'already invoiced' });
                    continue;
                }
                if (dryRun) {
                    results.push({ provider: providerKey, dry_run: true, total_cents: line.amount_cents, currency: plan.currency, lines: [line] });
                    continue;
                }
                const currency = plan.currency.toLowerCase();
                const customerId = await ensureStripeCustomer(stripeKey!, providerKey);
                const invoice = await stripeForm(stripeKey!, 'POST', 'invoices', {
                    customer: customerId,
                    collection_method: 'send_invoice',
                    days_until_due: '14',
                    currency,
                    description: `CompliHub360 subscription · ${period}`,
                    'metadata[provider_key]': providerKey,
                    'metadata[period]': period,
                    'metadata[plan_code]': plan.code,
                });
                const invoiceId = String(invoice.id);
                await stripeForm(stripeKey!, 'POST', 'invoiceitems', {
                    customer: customerId, invoice: invoiceId,
                    amount: String(line.amount_cents), currency, description: line.label,
                });
                const finalized = await stripeForm(stripeKey!, 'POST', `invoices/${invoiceId}/finalize`) as {
                    id: string; number?: string; status?: string; total?: number;
                    hosted_invoice_url?: string; invoice_pdf?: string; due_date?: number;
                };
                // send_invoice verschickt nur ueber den expliziten send-Call;
                // ein Fehler dort darf die ausgestellte Rechnung nicht verlieren.
                try {
                    await stripeForm(stripeKey!, 'POST', `invoices/${invoiceId}/send`);
                } catch (sendErr) {
                    await supabaseApi.insert('event_log', { type: 'invoice_send_failed', payload: { providerKey, invoiceId, error: String(sendErr) } }).catch(() => { /* non-blocking */ });
                }
                await supabaseApi.insert('invoices', {
                    provider_key: providerKey,
                    invoice_number: finalized.number || invoiceId,
                    period,
                    amount_cents: finalized.total ?? line.amount_cents,
                    currency: plan.currency,
                    status: 'open',
                    line_items: [line],
                    due_at: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString() : null,
                    stripe_invoice_id: finalized.id,
                    hosted_invoice_url: finalized.hosted_invoice_url ?? null,
                    invoice_pdf: finalized.invoice_pdf ?? null,
                });
                await supabaseApi.insert('event_log', {
                    type: 'invoice_issued',
                    payload: { providerKey, period, plan: plan.code, total_cents: finalized.total ?? line.amount_cents },
                }).catch(() => { /* non-blocking */ });
                results.push({ provider: providerKey, invoice: finalized.number || invoiceId, total_cents: finalized.total ?? line.amount_cents });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, period, providers: results.length, results, correlationId }));
        } catch {
            structuredLog('error', 'Billing run failed', { correlationId, errorCode: 'ERR_BILLING_RUN', severity: 'error', route: '/api/v1/admin/billing/run' });
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'BILLING_ERROR', message: 'Billing run failed', correlationId }));
        }
    });
}

// GET /api/v1/provider/:key/billing/preview — was das Dashboard zeigt (Spec B
// "The dashboard must show allowance used, allowance remaining, standard
// fee, discount, and final charge"): Plan, laufender Zyklus, Rabattkontingent,
// Lead-Belastungen des Zyklus aus dem Ledger, Guthaben. Reine Berechnung.
export async function handleBillingPreview(res: ServerResponse, correlationId: string, providerKey: string): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    try {
        const providers = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
        if (!providers[0]) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
            return;
        }
        const now = new Date();
        const period = now.toISOString().slice(0, 7);
        const [cfg, sub] = await Promise.all([loadPricingConfig(), getActiveSubscription(providerKey)]);
        const plan = sub ? cfg.plans.find((p) => p.code === sub.planCode) ?? null : null;
        const cycleStart = cycleStartFor(sub, now);
        const used = await getDiscountCounter(providerKey, cycleStart);
        const subLine = subscriptionChargeForPeriod(sub, plan, period);

        const ledger = (await supabaseApi.select('provider_lead_ledger', { provider_key: providerKey, kind: 'charge' }, { order: 'created_at.desc', limit: 500 })) as any[];
        const inCycle = ledger.filter((l) => String(l.created_at).slice(0, 10) >= cycleStart);
        const leads = {
            count: inCycle.length,
            standard_cents: inCycle.reduce((s, l) => s + (l.standard_fee_cents || 0), 0),
            discount_cents: inCycle.reduce((s, l) => s + ((l.standard_fee_cents || 0) - (l.final_fee_cents || 0)), 0),
            final_cents: inCycle.reduce((s, l) => s + (l.final_fee_cents || 0), 0),
        };
        const credits = (await supabaseApi.select('provider_credits', { provider_key: providerKey }, { limit: 1000 })) as any[];
        const creditBalance = credits.reduce((s, c) => s + (c.amount_cents || 0), 0);
        const currency = plan?.currency ?? cfg.bands[0]?.currency ?? 'USD';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true, period, provider_key: providerKey, currency,
            subscription: sub && plan ? {
                plan_code: plan.code, label: plan.label, cadence: sub.cadence, status: sub.status,
                current_period_start: sub.currentPeriodStart, current_period_end: sub.currentPeriodEnd,
                monthly_cents: plan.monthlyCents, annual_cents: plan.annualCents,
                category_allowance: plan.categoryAllowance, analytics_level: plan.analyticsLevel, api_eligible: plan.apiEligible,
            } : null,
            discount: {
                pct: plan?.leadDiscountPct ?? 0,
                count: plan?.leadDiscountCount ?? 0,
                used,
                remaining: Math.max(0, (plan?.leadDiscountCount ?? 0) - used),
                cycle_start: cycleStart,
            },
            leads,
            credit_balance_cents: creditBalance,
            lines: subLine ? [subLine] : [],
            total_cents: (subLine?.amount_cents ?? 0) + leads.final_cents,
            pricing: {
                plans: cfg.plans.map((p) => ({ code: p.code, label: p.label, monthly_cents: p.monthlyCents, annual_cents: p.annualCents, currency: p.currency, category_allowance: p.categoryAllowance, lead_discount_pct: p.leadDiscountPct, lead_discount_count: p.leadDiscountCount })),
                bands: cfg.bands.map((b) => ({ band: b.band, label: b.label, fee_cents: b.feeCents, currency: b.currency })),
            },
            correlationId,
        }));
    } catch {
        structuredLog('error', 'Billing preview failed', { correlationId, errorCode: 'ERR_BILLING_PREVIEW', severity: 'error', route: 'billing/preview' });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Billing preview failed', correlationId }));
    }
}

// Webhook-Ersatz: Zahlungsstatus offener Stripe-Rechnungen nachziehen, wenn
// der Anbieter seine Rechnungsliste oeffnet (nur offene Zeilen, max. 5).
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
