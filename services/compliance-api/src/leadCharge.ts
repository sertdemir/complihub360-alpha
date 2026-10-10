import { supabaseApi } from "./supabase.js";
import { structuredLog } from "@complihub360/types";
import type { BookingPriceSnapshot } from "@complihub360/types";
import {
    billingReadiness, getActiveSubscription, loadPricingConfig, overdueState,
    type BillingBlockReason, type LeadFeeQuote, type LeadOpportunity,
} from "./billing.js";
import {
    createPaymentIntent, getCustomerBilling, isStripeConfigured, StripeError, verifyPaymentMethod, type ChargeResult,
} from "./stripe.js";
import { notify } from "./notifications.js";
import { sendPaymentFailedMail } from "./mailer.js";

// ─── Phase 4: die Belastung eines Leads ──────────────────────────────────────
//
// Spec B "Booking confirmation and data handover", Schritte 2–5: der Nutzer
// bestaetigt eine Fassung, das System berechnet Band und Rabatt, belastet die
// Karte des Anbieters, und ERST DANN wird die Identitaet offengelegt.
//
// Dieses Modul kennt die Reihenfolge, die das moeglich macht:
//
//   Ledger-Zeile (pending)  →  Stripe (Idempotency-Key = Ledger-ID)
//                           →  Zahlungsereignis (captured | failed)
//
// und sonst nichts: keine Buchungszeile, keine Benachrichtigung an den
// Nutzer. Das macht der Handler in index.ts, der damit entscheiden kann, ob
// es eine Buchung gibt. Das Ledger ist append-only (20260923000000): die
// Zeile entsteht VOR dem Stripe-Aufruf, der Status aendert sich nur ueber
// provider_lead_ledger_payment_events, und die Buchung zeigt auf das Ledger
// (scheduling.lead_ledger_id), nie umgekehrt.
//
// Dazu die reinen Helfer, die der Handler braucht, ohne Netz testbar:
// Opportunity aus Sitzung und Angebot, Preis-Snapshot, aktueller
// Bestaetigungstext.

/** Die Nutzerfelder, die mit der Buchung zum Anbieter gehen. Muss mit booking_acknowledgements.shared_fields uebereinstimmen. */
export const SHARED_FIELDS_V1 = ['email', 'company_name', 'message'] as const;

// ─── Opportunity: aus der Sitzung des Nutzers, begrenzt auf das Angebot ───────

export interface MatchableRow {
    service_id: string;
    service_code: string;
    area_code: string;
    country_code: string;
    price_min?: number | string | null;
    price_max?: number | string | null;
    currency?: string | null;
    pricing_basis?: string | null;
}

export interface SessionProfile {
    country?: string | null;
    categories?: string[] | null;
    markets?: string[] | null;
}

export interface OpportunityBody {
    area_code?: unknown;
    countries?: unknown;
    service_id?: unknown;
}

export type OpportunityResult =
    | { ok: true; opp: LeadOpportunity; serviceRow: MatchableRow }
    | { ok: false; code: 'OPPORTUNITY_REQUIRED' | 'AREA_NOT_OFFERED' | 'SERVICE_NOT_FOUND' };

const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));
const strList = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length <= 40).slice(0, 50) : [];

/**
 * Das Band haengt an der Opportunity des Nutzers, nie am Anbieter (Spec B).
 * Der Bereich muss aber einer sein, den dieser Anbieter anbietet — sonst
 * wuerde `leadFeeEnabled` einen Legal-Support-Anbieter ueber einen fremden
 * Bereich gebuehrenpflichtig machen. Reihenfolge: ausdrueckliche Angabe,
 * dann Sitzung, dann der einzige Bereich des Angebots.
 */
export function deriveOpportunity(viewRows: MatchableRow[], session: SessionProfile | null, body: OpportunityBody): OpportunityResult {
    const areas = uniq(viewRows.map((r) => r.area_code).filter(Boolean));
    if (!areas.length) return { ok: false, code: 'OPPORTUNITY_REQUIRED' };

    let areaCode: string | null = null;
    if (typeof body.area_code === 'string' && body.area_code) {
        if (!areas.includes(body.area_code)) return { ok: false, code: 'AREA_NOT_OFFERED' };
        areaCode = body.area_code;
    } else {
        const fromSession = (session?.categories ?? []).find((c) => areas.includes(c));
        areaCode = fromSession ?? (areas.length === 1 ? areas[0] : null);
    }
    if (!areaCode) return { ok: false, code: 'OPPORTUNITY_REQUIRED' };

    const inArea = viewRows.filter((r) => r.area_code === areaCode);
    const offered = uniq(inArea.map((r) => r.country_code).filter(Boolean));
    const wanted = uniq([...(session?.markets ?? []), ...(session?.country ? [session.country] : [])].filter(Boolean));
    let countries = wanted.filter((c) => offered.includes(c));
    if (!countries.length) countries = strList(body.countries).filter((c) => offered.includes(c));
    if (!countries.length) countries = offered;

    let serviceRow: MatchableRow | undefined;
    if (typeof body.service_id === 'string' && body.service_id) {
        serviceRow = inArea.find((r) => r.service_id === body.service_id);
        if (!serviceRow) return { ok: false, code: 'SERVICE_NOT_FOUND' };
    } else {
        serviceRow = inArea.find((r) => countries.includes(r.country_code)) ?? inArea[0];
    }

    const codes = uniq(inArea.map((r) => r.service_code));
    return {
        ok: true,
        serviceRow,
        opp: {
            areaCode,
            subcategories: codes.filter((c) => c !== areaCode),
            countries,
            serviceCount: codes.length,
            recurring: null,
        },
    };
}

// ─── Preis-Snapshot (Spec A §20) ─────────────────────────────────────────────

const num = (v: unknown): number | null => (v === null || v === undefined || v === '') ? null : Number.isFinite(Number(v)) ? Number(v) : null;

export function priceSnapshotFrom(
    serviceRow: MatchableRow,
    providerService: { price_min?: unknown; price_max?: unknown; currency?: string | null; pricing_basis?: string | null; deliverables?: string[] | null } | null,
    termsVersion: string | null,
    now: Date = new Date(),
): BookingPriceSnapshot {
    const src = providerService ?? serviceRow;
    return {
        price_min: num(src.price_min),
        price_max: num(src.price_max),
        currency: src.currency ?? null,
        pricing_basis: src.pricing_basis ?? null,
        included: Array.isArray(providerService?.deliverables) ? providerService!.deliverables!.slice(0, 50) : [],
        terms_version: termsVersion,
        captured_at: now.toISOString(),
    };
}

// ─── Bestaetigungstext ───────────────────────────────────────────────────────

export interface AcknowledgementRow {
    version: string;
    language: string;
    body: string;
    shared_fields: string[];
    effective_from: string;
}

/** Die juengste gueltige Fassung in der gewuenschten Sprache, sonst Englisch. */
export function currentAcknowledgement(rows: AcknowledgementRow[], lang: string, today: Date = new Date()): AcknowledgementRow | null {
    const day = today.toISOString().slice(0, 10);
    const live = rows.filter((r) => String(r.effective_from) <= day);
    if (!live.length) return null;
    const newest = live.reduce((a, b) => (String(b.effective_from) > String(a.effective_from)
        || (String(b.effective_from) === String(a.effective_from) && b.version > a.version)) ? b : a);
    const sameVersion = live.filter((r) => r.version === newest.version);
    const want = lang.slice(0, 2).toLowerCase();
    return sameVersion.find((r) => r.language === want) ?? sameVersion.find((r) => r.language === 'en') ?? sameVersion[0];
}

// ─── Die Belastung ───────────────────────────────────────────────────────────

export type ChargeOutcome =
    | { ledgerId: string; outcome: 'captured'; paymentIntentId: string }
    | { ledgerId: string; outcome: 'n/a' }
    | { ledgerId: string; outcome: 'failed'; result: Extract<ChargeResult, { ok: false }> };

export async function chargeLeadFee(input: {
    providerKey: string;
    userId: string;
    quote: LeadFeeQuote;
    opp: LeadOpportunity;
    customerId: string | null;
    paymentMethodId: string | null;
    receiptEmail?: string | null;
    correlationId: string;
}): Promise<ChargeOutcome> {
    const { quote, opp } = input;
    const chargeable = quote.enabled && quote.finalFeeCents > 0;
    const inserted = (await supabaseApi.insert('provider_lead_ledger', {
        kind: 'charge',
        provider_key: input.providerKey,
        user_id: input.userId,
        booking_id: null,
        area_code: opp.areaCode,
        subcategories: opp.subcategories,
        countries: opp.countries,
        computed_band: quote.band,
        band_version: quote.bandVersion,
        standard_fee_cents: quote.standardFeeCents,
        plan_code_at_charge: quote.planCode,
        plan_version_at_charge: quote.planVersion,
        discount_sequence: quote.discountSequence,
        discount_pct: quote.discountPct,
        final_fee_cents: quote.finalFeeCents,
        currency: quote.currency,
        payment_status: chargeable ? 'pending' : 'n/a',
        policy_version: quote.policyVersion,
    })) as Array<{ id: string }>;
    const ledgerId = inserted?.[0]?.id;
    if (!ledgerId) throw new Error('ledger insert returned no id');
    if (!chargeable) return { ledgerId, outcome: 'n/a' };

    let result: ChargeResult;
    if (!input.customerId || !input.paymentMethodId) {
        result = { ok: false, kind: 'card', reason: 'no_payment_method', stripeRef: null, detail: 'no customer or default payment method' };
    } else {
        result = await createPaymentIntent({
            customerId: input.customerId,
            paymentMethodId: input.paymentMethodId,
            amountCents: quote.finalFeeCents,
            currency: quote.currency,
            description: `CompliHub360 lead · ${quote.bandLabel}`,
            metadata: { ledger_id: ledgerId, provider_key: input.providerKey, band: String(quote.band), policy_version: quote.policyVersion },
            idempotencyKey: ledgerId,
            receiptEmail: input.receiptEmail ?? null,
        });
    }
    if (result.ok) {
        await supabaseApi.insert('provider_lead_ledger_payment_events', { ledger_id: ledgerId, status: 'captured', stripe_ref: result.paymentIntentId, detail: null });
        return { ledgerId, outcome: 'captured', paymentIntentId: result.paymentIntentId };
    }
    await supabaseApi.insert('provider_lead_ledger_payment_events', {
        ledger_id: ledgerId, status: 'failed', stripe_ref: result.stripeRef,
        detail: `${result.kind}:${result.reason}${result.detail ? ' ' + String(result.detail).slice(0, 200) : ''}`,
    });
    return { ledgerId, outcome: 'failed', result };
}

/** Die Karte hat nicht gezahlt: der Anbieter erfaehrt es, und die Buchung bleibt gesperrt, bis das Zahlungsmittel wechselt. */
export async function recordPaymentFailure(args: {
    providerKey: string;
    ledgerId: string;
    result: Extract<ChargeResult, { ok: false }>;
    paymentMethodId: string | null;
    correlationId: string;
}): Promise<void> {
    const rows = (await supabaseApi.select('providers', { provider_key: args.providerKey }, { limit: 1 })) as any[];
    const p = rows[0];
    if (!p) return;
    const reasons = new Set<string>(Array.isArray(p.billing_block_reasons) ? p.billing_block_reasons : []);
    reasons.add('payment_failed');
    const now = new Date().toISOString();
    await supabaseApi.update('providers', { provider_key: args.providerKey }, {
        billing_ready: false,
        billing_block_reasons: Array.from(reasons),
        billing_synced_at: now,
        last_payment_failure: { at: now, payment_method_id: args.paymentMethodId, reason: args.result.reason, ledger_id: args.ledgerId },
    });
    await supabaseApi.insert('event_log', {
        type: 'lead_payment_failed',
        payload: { providerKey: args.providerKey, ledgerId: args.ledgerId, reason: args.result.reason, stripeRef: args.result.stripeRef },
    }).catch(() => { /* non-blocking */ });
    const members = (await supabaseApi.select('provider_members', { provider_key: args.providerKey }, { limit: 20 })) as Array<{ user_id: string }>;
    for (const m of members) {
        await notify({ to: m.user_id, actor: null, type: 'payment_failed', subject: 'provider', subjectId: args.providerKey,
            payload: { providerKey: args.providerKey }, dedupeKey: `payment_failed:${args.ledgerId}` });
    }
    await sendPaymentFailedMail({ to: p.contact_email ?? null, providerKey: args.providerKey, correlationId: args.correlationId });
}

// ─── Zahlungsbereitschaft aus Stripe und Datenbank ───────────────────────────

export interface ReadinessSync {
    ready: boolean;
    reasons: BillingBlockReason[];
    changed: boolean;
    paymentMethodLabel: string | null;
    syncedAt: string;
}

/**
 * Setzt providers.billing_ready und billing_block_reasons. Laeuft beim Rueckweg
 * aus dem Portal und im Watcher — nie im Buchungspfad, der liest nur.
 */
export async function syncBillingReadiness(providerKey: string): Promise<ReadinessSync | null> {
    const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
    const p = rows[0];
    if (!p) return null;

    let hasPm = false, infoComplete = false, pmId: string | null = null, pmLabel: string | null = null;
    if (p.stripe_customer_id && isStripeConfigured()) {
        try {
            const c = await getCustomerBilling(String(p.stripe_customer_id));
            pmId = c.defaultPaymentMethodId;
            hasPm = !!pmId;
            infoComplete = c.billingInfoComplete;
            pmLabel = c.paymentMethodLabel;
            if (c.promotedDefault) {
                structuredLog('info', 'Stripe default payment method set from attached card', { providerKey, customerId: String(p.stripe_customer_id), paymentMethodId: pmId });
                await supabaseApi.insert('event_log', { type: 'stripe_default_payment_method_set', payload: { providerKey, customerId: String(p.stripe_customer_id), paymentMethodId: pmId } }).catch(() => {});
            }
        } catch (err) {
            // Stripe kennt den gespeicherten Kunden nicht (anderer Account oder
            // andere Sandbox als beim Anlegen, oder dort geloescht). Das ist kein
            // Grund fuer 502: der Anbieter ist dann schlicht ohne Zahlungsmittel.
            // Die Kennung kommt weg, damit der naechste Portal-Aufruf einen
            // neuen Kunden anlegt; die alte bleibt im Ereignisprotokoll
            // (Befund Staging 2026-10-04: cus_… aus der Sandbox vor dem Claim).
            if (!(err instanceof StripeError && err.status === 404 && err.code === 'resource_missing')) throw err;
            structuredLog('warn', 'Stripe customer missing — clearing stale id', { providerKey, customerId: String(p.stripe_customer_id), errorCode: 'STRIPE_CUSTOMER_MISSING', severity: 'warning' });
            await supabaseApi.update('providers', { provider_key: providerKey }, { stripe_customer_id: null });
            await supabaseApi.insert('event_log', {
                type: 'stripe_customer_missing',
                payload: { providerKey, customerId: String(p.stripe_customer_id), detail: err.message },
            }).catch(() => { /* non-blocking */ });
        }
    }
    const [sub, agreements, openInvoices, cfg] = await Promise.all([
        getActiveSubscription(providerKey),
        supabaseApi.select('provider_agreement_acceptance', { provider_key: providerKey, agreement_type: 'billing_authorization' }, { limit: 20 }) as Promise<any[]>,
        supabaseApi.select('invoices', { provider_key: providerKey, status: 'open' }, { limit: 50 }) as Promise<any[]>,
        loadPricingConfig(),
    ]);
    // Seit ADR-0006 (A2) sperrt eine faellige Rechnung erst nach der
    // Kulanzfrist. Vorher zaehlte hier jede Rechnung mit `due_at < now`, und
    // der Anbieter war in derselben Sekunde nicht mehr buchbar.
    const overdue = overdueState(openInvoices, cfg.curePeriodDays).blocking;
    const failure = p.last_payment_failure as { payment_method_id?: string | null } | null;
    const { ready, reasons } = billingReadiness({
        hasDefaultPaymentMethod: hasPm,
        billingInfoComplete: infoComplete,
        subscriptionStatus: sub?.status ?? null,
        authorizationAccepted: agreements.some((a) => !a.superseded_at),
        overdueInvoices: overdue,
        paused: p.lifecycle_status === 'paused' || p.lifecycle_status === 'suspended',
        lastPaymentFailed: !!failure && !!pmId && failure.payment_method_id === pmId,
    });
    const before = Array.isArray(p.billing_block_reasons) ? [...p.billing_block_reasons].sort().join(',') : '';
    const changed = !!p.billing_ready !== ready || before !== [...reasons].sort().join(',');
    const syncedAt = new Date().toISOString();
    await supabaseApi.update('providers', { provider_key: providerKey }, {
        billing_ready: ready, billing_block_reasons: reasons, billing_synced_at: syncedAt,
    });
    if (changed) {
        await supabaseApi.insert('event_log', {
            type: 'billing_readiness_changed',
            payload: { providerKey, ready, reasons, was: { ready: !!p.billing_ready, reasons: p.billing_block_reasons ?? [] } },
        }).catch(() => { /* non-blocking */ });
    }
    return { ready, reasons, changed, paymentMethodLabel: pmLabel, syncedAt };
}

// ─── ADR-0008 A2: Zahlungsmittel erneut pruefen ──────────────────────────────
//
// Nach einer gescheiterten Lead-Belastung hebt ein ANDERES Zahlungsmittel die
// Sperre auf (ADR-0005). Fuer „die Karte war an einem Tag nicht gedeckt" gab es
// keinen Weg zurueck ausser einem Kartenwechsel. Jetzt stoesst der Anbieter
// selbst eine Pruefung an; bestaetigt Stripe dasselbe Mittel, faellt
// `payment_failed` weg. Nachbelastet wird nichts — die Buchung kam nie
// zustande, es gibt nichts nachzuholen.

/** Hoechstens so viele Pruefungen je Anbieter in 24 Stunden. */
export const RECHECK_LIMIT_PER_DAY = 3;

export type RecheckOutcome =
    | { result: 'cleared'; readiness: ReadinessSync | null }
    | { result: 'declined' | 'needs_action'; reason: string }
    | { result: 'not_blocked'; readiness: ReadinessSync | null }
    | { result: 'rate_limited'; retryAfter: string }
    | { result: 'stripe_error' }
    | { result: 'not_found' };

/** Rein: wie viele Pruefungen in den letzten 24 h, und ab wann wieder eine geht. */
export function recheckBudget(timestamps: string[], now: Date, limit = RECHECK_LIMIT_PER_DAY): { left: number; nextAt: string | null } {
    const since = now.getTime() - 86_400_000;
    const recent = timestamps.map((t) => Date.parse(t)).filter((t) => !Number.isNaN(t) && t > since).sort((a, b) => a - b);
    const left = Math.max(0, limit - recent.length);
    return { left, nextAt: left > 0 ? null : new Date(recent[recent.length - limit] + 86_400_000).toISOString() };
}

export async function recheckPaymentMethod(providerKey: string, actorId: string | null, now = new Date()): Promise<RecheckOutcome> {
    const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
    const p = rows[0];
    if (!p) return { result: 'not_found' };
    const failure = p.last_payment_failure as { payment_method_id?: string | null } | null;
    const customerId = p.stripe_customer_id ? String(p.stripe_customer_id) : null;
    if (!failure || !customerId) return { result: 'not_blocked', readiness: await syncBillingReadiness(providerKey) };

    let pmId: string | null = null;
    try { pmId = (await getCustomerBilling(customerId)).defaultPaymentMethodId; } catch { return { result: 'stripe_error' }; }
    // Ein anderes Mittel hebt die Sperre ohnehin auf (ADR-0005) — dann gibt es
    // nichts zu pruefen, nur neu zu berechnen.
    if (!pmId || pmId !== failure.payment_method_id) return { result: 'not_blocked', readiness: await syncBillingReadiness(providerKey) };

    const log = (await supabaseApi.select('event_log', { type: 'payment_method_recheck' }, { order: 'timestamp.desc', limit: 200 })) as any[];
    // Die Zeit steht auch im Ereignis selbst: `timestamp` setzt erst die Datenbank.
    const mine = log.filter((e) => e.payload?.providerKey === providerKey).map((e) => String(e.payload?.at ?? e.timestamp));
    const budget = recheckBudget(mine, now);
    if (budget.left === 0) return { result: 'rate_limited', retryAfter: budget.nextAt! };

    const v = await verifyPaymentMethod({ customerId, paymentMethodId: pmId, idempotencyKey: `recheck:${providerKey}:${now.getTime()}` });
    await supabaseApi.insert('event_log', {
        type: 'payment_method_recheck',
        payload: { providerKey, by: actorId, at: now.toISOString(), ok: v.ok, reason: v.ok ? null : v.reason },
    }).catch(() => { /* das Limit zaehlt dann eine Pruefung zu wenig — lieber das als eine verlorene Antwort */ });
    if (!v.ok) {
        if (v.kind === 'stripe') return { result: 'stripe_error' };
        return { result: v.reason === 'authentication_required' ? 'needs_action' : 'declined', reason: v.reason };
    }
    await supabaseApi.update('providers', { provider_key: providerKey }, { last_payment_failure: null });
    await supabaseApi.insert('event_log', { type: 'payment_failure_cleared', payload: { providerKey, by: actorId, via: 'recheck', setupIntentId: v.setupIntentId } }).catch(() => {});
    return { result: 'cleared', readiness: await syncBillingReadiness(providerKey) };
}

/** Ein Durchlauf des Watchers: die aeltesten Pruefungen zuerst. */
export async function runBillingReadinessTick(shadow: boolean, batch = 25): Promise<{ synced: number; changed: number; errors: number }> {
    const out = { synced: 0, changed: 0, errors: 0 };
    if (!isStripeConfigured()) return out;
    let providers: any[];
    try {
        providers = (await supabaseApi.select('providers', {}, { order: 'billing_synced_at.asc', limit: 2000 })) as any[];
    } catch {
        out.errors++;
        return out;
    }
    const due = providers
        .filter((p) => p.stripe_customer_id && ['active', 'limited', 'approved_pending_activation'].includes(String(p.lifecycle_status)))
        .sort((a, b) => String(a.billing_synced_at ?? '').localeCompare(String(b.billing_synced_at ?? '')))
        .slice(0, batch);
    for (const p of due) {
        try {
            if (shadow) {
                await supabaseApi.insert('event_log', { type: 'billing_readiness_sync_shadow', payload: { providerKey: p.provider_key } });
                out.synced++;
                continue;
            }
            const r = await syncBillingReadiness(p.provider_key);
            out.synced++;
            if (r?.changed) out.changed++;
        } catch (err) {
            out.errors++;
            structuredLog('error', 'Billing readiness sync failed', { correlationId: 'watchers', route: 'watchers/billing', severity: 'error', errorCode: 'ERR_BILLING_SYNC', detail: String(err).slice(0, 200) } as any);
        }
    }
    return out;
}
