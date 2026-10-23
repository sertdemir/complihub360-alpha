import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";
import { watcherConfig } from "./watchers.js";
import { loadPricingConfig, planFor, resolveLedgerStatus, type PricingConfig, type Subscription } from "./billing.js";
import { ERROR_RE, feedEvent, windowStart, type EventRow } from "./adminStats.js";

// ─── Founder Cockpit read-model ───────────────────────────────────────────────
// One consolidated read across the live systems, shaped as five lenses:
// Platform Health · Product · Money · Voice of Customer · Trust.
// This endpoint only aggregates, it never writes.
//
// 22.10.2026: Bis hierher kamen Produkt, Kundenstimme und SLA aus
// `engagement_requests` (altes Anfragemodell, letzter Eintrag 01.09.) und der
// MRR aus `user_subscriptions` mit angenommenen 12 $ je Assistant-Abo. Jetzt:
//   - Produkt aus Buchungen (`scheduling`) und Wizard-Sessions
//   - Geld aus Anbieter-Tarifen (Preis aus dem Katalog, `planFor`),
//     Rechnungen, Lead-Gebuehren (`provider_lead_ledger`) und Guthaben
//   - Kundenstimme aus `reviews`, Stornierungen durch Nutzer, Einspruechen
//   - Vertrauen aus dem Lebenszyklus der Anbieter, Vorfaellen, Massnahmen
// Wie im Control Center (adminStats.ts): was nicht gemessen wird, ist null.
// Eine Quelle, die nicht gelesen werden kann, steht in `unavailable` — ihre
// Zahlen sind null, nie 0.
//
// Geld steht je Waehrung (`Amounts`, Waehrung → Cent): der Tarifkatalog ist in
// USD, aeltere Rechnungen in EUR — eine Summe ueber beide waere falsch.
// Lead-Gebuehren: das Ledger ist append-only, der wirksame Zahlungsstatus
// kommt aus `provider_lead_ledger_payment_events` (resolveLedgerStatus) —
// gezaehlt wird wie im Billing-Lauf nur `captured` und `n/a`.
//
// Served by GET /api/v1/admin/cockpit (Admin-JWT oder Server-Key).

const DAY = 24 * 3_600_000;
const ONBOARDING = new Set(["draft", "submitted", "more_info_required", "under_verification", "approved_pending_activation"]);
const LIVE = new Set(["active", "limited"]);

export type CockpitSource =
    | "scheduling" | "event_log" | "sessions" | "invoices" | "provider_subscriptions" | "pricing"
    | "provider_lead_ledger" | "provider_credits" | "reviews" | "providers" | "provider_performance_incidents"
    | "provider_enforcement_actions" | "user_subscriptions" | "provider_lead_ledger_payment_events" | "event_feed";

/** Betraege je Waehrung, in Cent. */
export type Amounts = Record<string, number>;

type Booking = { status: string; slot_start: string; created_at: string; cancelled_by?: string | null; cancelled_at?: string | null; dispute_status?: string | null; no_show_by?: string | null; no_show_reported_at?: string | null };
type SessionRow = { status?: string | null; created_at?: string | null };
type Invoice = { status: string; amount_cents: number; currency?: string | null; due_at?: string | null };
type ProviderSub = { provider_key: string; plan_code: string; plan_version?: number | null; cadence: "monthly" | "annual"; status: string; ended_at?: string | null };
type Ledger = { id: string; kind: string; payment_status: string; final_fee_cents?: number | null; currency?: string | null; created_at: string };
type PaymentEvent = { ledger_id: string; status: string; created_at?: string };
type Credit = { amount_cents?: number | null; currency?: string | null; created_at: string };
type Review = { from_role: string; rating?: number | null };
type Provider = { provider_key: string; lifecycle_status?: string | null; lifecycle_status_since?: string | null; billing_ready?: boolean | null; reverification_due_at?: string | null };
type Incident = { provider_key: string; recorded_at: string };
type Enforcement = { provider_key: string; created_at: string; decision?: string | null; lifted_at?: string | null; appeal_at?: string | null };
type UserSub = { status?: string | null };

export type AttentionReason = "suspended" | "enforcement" | "past_due" | "incident" | "billing_blocked" | "reverification_due";
const REASON_ORDER: AttentionReason[] = ["suspended", "enforcement", "past_due", "incident", "billing_blocked", "reverification_due"];

export interface Cockpit {
    generatedAt: string;
    watchersShadow: boolean;
    /** Quellen, die nicht gelesen werden konnten — ihre Zahlen sind null. */
    unavailable: CockpitSource[];
    /** Quellen, deren Lesegrenze erreicht ist — Zahlen daraus sind eine Untergrenze. */
    truncated: CockpitSource[];
    platformHealth: { api: "up"; db: "reachable" | "degraded"; errorEvents7: number | null; latestEventAt: string | null };
    product: {
        bookingsToday: number | null; bookings7: number | null; bookingsTotal: number | null;
        heldRate: number | null; sessionsActive: number | null; sessions7: number | null;
    };
    money: {
        /** Waehrung fuer leere Betraege — die des Tarifkatalogs. */
        baseCurrency: string;
        /** Monatlich wiederkehrend aus aktiven und rueckstaendigen Tarifen; Jahrestarife /12. */
        mrr: Amounts | null;
        /** Abos, deren gebundene Tarifversion nicht im geltenden Katalog steht — im MRR nicht enthalten. */
        unpriced: number;
        subscriptions: { active: number; pastDue: number } | null;
        invoices: { open: number; paid: number; failed: number; overdue: number; openAmounts: Amounts; paidAmounts: Amounts } | null;
        /** Belastet = captured oder gebuehrenfrei (n/a), wie im Billing-Lauf. */
        leadFees7: { charges: number; collected: Amounts; pending: number; failed: number } | null;
        /** Ausgegebene Gutschriften (positive Betraege); Verbrauch zaehlt nicht dagegen. */
        credits7: Amounts | null;
        assistantActive: number | null;
    };
    voice: {
        reviews: { count: number; avgRating: number | null; fromUsers: number; fromProviders: number } | null;
        userCancellations7: number | null;
        disputesOpen: number | null;
    };
    trust: {
        providers: { live: number; onboarding: number; paused: number; suspended: number; reverification: number; ended: number } | null;
        providerNoShows30: number | null;
        incidents30: number | null;
        /** In Kraft (nicht aufgehoben) — auch nach bestaetigtem Einspruch. */
        enforcementOpen: number | null;
        appealsPending: number | null;
        /** null, wenn eine der vier Quellen fehlt — dann laesst sich "niemand" nicht behaupten. */
        attention: Array<{ provider_key: string; reason: AttentionReason; since: string | null }> | null;
        attentionTotal: number;
    };
    rates: { heldRate: number | null; invoicesPaid: number | null; billingReady: number | null; subscriptionsCurrent: number | null };
    events: Array<{ type: string; payload: Record<string, unknown>; created_at: string | null }>;
    /** `leadFeeCents` nur bei genau einer Waehrung, sonst null. */
    series: { dates: string[]; bookings: number[]; sessions: number[]; leadFeeCents: number[] | null };
}

export interface CockpitInput {
    bookings: Booking[] | null;
    events7: EventRow[] | null;
    feed: EventRow[] | null;
    sessions: SessionRow[] | null;
    invoices: Invoice[] | null;
    subscriptions: ProviderSub[] | null;
    pricing: PricingConfig | null;
    ledger7: Ledger[] | null;
    /** Statusereignisse zu ledger7; null = nicht lesbar. */
    paymentEvents: PaymentEvent[] | null;
    credits7: Credit[] | null;
    reviews: Review[] | null;
    providers: Provider[] | null;
    incidents30: Incident[] | null;
    enforcement: Enforcement[] | null;
    userSubs: UserSub[] | null;
    truncated: CockpitSource[];
    watchersShadow: boolean;
    now?: Date;
}

const ratio = (n: number, d: number): number | null => (d ? n / d : null);
const add = (into: Amounts, currency: string | null | undefined, cents: number, fallback: string) => {
    const c = (currency || fallback).toUpperCase();
    into[c] = (into[c] ?? 0) + cents;
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Ein Wert aus einer Quelle — null, wenn die Quelle fehlt. */
const from = <T, R>(rows: T[] | null, f: (rows: T[]) => R): R | null => (rows ? f(rows) : null);

export function computeCockpit(input: CockpitInput): Cockpit {
    const now = input.now ?? new Date();
    const nowMs = now.getTime();
    const start = windowStart(now);
    const since30 = new Date(nowMs - 30 * DAY).toISOString();
    const dayKeys: string[] = [];
    for (let i = 0; i < 7; i++) dayKeys.push(new Date(start.getTime() + i * DAY).toISOString().slice(0, 10));
    const idxOf = (iso?: string | null) => (iso ? dayKeys.indexOf(iso.slice(0, 10)) : -1);
    const inWindow = (iso?: string | null) => idxOf(iso) >= 0;
    const bucket = () => new Array(7).fill(0) as number[];

    const unavailable: CockpitSource[] = [];
    const need = <T,>(rows: T[] | null, source: CockpitSource) => { if (!rows) unavailable.push(source); return rows; };
    const bookings = need(input.bookings, "scheduling");
    const events7 = need(input.events7, "event_log");
    if (!input.feed) unavailable.push("event_feed");
    const sessions = need(input.sessions, "sessions");
    const invoices = need(input.invoices, "invoices");
    const subs = need(input.subscriptions, "provider_subscriptions");
    if (!input.pricing) unavailable.push("pricing");
    const ledger = need(input.ledger7, "provider_lead_ledger");
    const paymentEvents = ledger ? need(input.paymentEvents, "provider_lead_ledger_payment_events") : null;
    const credits = need(input.credits7, "provider_credits");
    const reviews = need(input.reviews, "reviews");
    const providers = need(input.providers, "providers");
    const incidents = need(input.incidents30, "provider_performance_incidents");
    const enforcement = need(input.enforcement, "provider_enforcement_actions");
    const userSubs = need(input.userSubs, "user_subscriptions");

    // ── Produkt ──────────────────────────────────────────────────────────────
    const series = { dates: dayKeys.map(k => `${k.slice(8, 10)}.${k.slice(5, 7)}`), bookings: bucket(), sessions: bucket(), leadFeeCents: bucket() as number[] | null };
    for (const b of bookings ?? []) { const i = idxOf(b.created_at); if (i >= 0) series.bookings[i]++; }
    for (const s of sessions ?? []) { const i = idxOf(s.created_at); if (i >= 0) series.sessions[i]++; }
    const past = (bookings ?? []).filter(b => new Date(b.slot_start).getTime() < nowMs);
    const completed = past.filter(b => b.status === "completed").length;
    const noShow = past.filter(b => b.status === "no_show").length;
    const heldRate = bookings ? ratio(completed, completed + noShow) : null;

    // ── Geld ─────────────────────────────────────────────────────────────────
    // Ein Abo zaehlt, solange es nicht beendet ist; past_due bleibt im MRR —
    // der Betrag ist geschuldet, nur noch nicht eingegangen.
    const openSubs = (subs ?? []).filter(s => !s.ended_at && (s.status === "active" || s.status === "past_due"));
    const base = (input.pricing?.plans[0]?.currency || "USD").toUpperCase();
    let mrr: Amounts | null = null;
    let unpriced = 0;
    if (subs && input.pricing) {
        mrr = {};
        for (const s of openSubs) {
            const asSub = { planCode: s.plan_code, planVersion: s.plan_version ?? 1 } as Subscription;
            const { plan, exact } = planFor(input.pricing, asSub);
            // Nie still ein anderer Preis: steht die gebundene Version nicht im
            // geltenden Katalog, zaehlt das Abo als ohne Preis.
            if (!plan || !exact || plan.version !== asSub.planVersion) { unpriced++; continue; }
            add(mrr, plan.currency, s.cadence === "annual" ? Math.round(plan.annualCents / 12) : plan.monthlyCents, base);
        }
    }

    // Lead-Gebuehren: wirksamer Status aus den Ereignissen.
    let leadFees7: Cockpit["money"]["leadFees7"] = null;
    if (ledger && paymentEvents) {
        const byLedger = new Map<string, PaymentEvent[]>();
        for (const e of paymentEvents) byLedger.set(e.ledger_id, [...(byLedger.get(e.ledger_id) ?? []), e]);
        const charges = ledger.filter(l => l.kind === "charge" && inWindow(l.created_at))
            .map(l => ({ l, status: resolveLedgerStatus(l, byLedger.get(l.id) ?? []) }));
        const collected: Amounts = {};
        const currencies = new Set<string>();
        for (const { l, status } of charges) {
            if (status !== "captured" && status !== "n/a") continue;
            add(collected, l.currency, l.final_fee_cents ?? 0, base);
            currencies.add((l.currency || base).toUpperCase());
            const i = idxOf(l.created_at); if (i >= 0 && series.leadFeeCents) series.leadFeeCents[i] += l.final_fee_cents ?? 0;
        }
        if (currencies.size > 1) series.leadFeeCents = null;
        leadFees7 = {
            charges: charges.length,
            collected,
            pending: charges.filter(c => c.status === "pending" || c.status === "authorized").length,
            failed: charges.filter(c => c.status === "failed").length,
        };
    } else series.leadFeeCents = null;

    // ── Vertrauen ────────────────────────────────────────────────────────────
    const attention: Cockpit["trust"]["attention"] = [];
    const flag = (provider_key: string, reason: AttentionReason, since: string | null) => {
        if (!attention.some(a => a.provider_key === provider_key && a.reason === reason)) attention.push({ provider_key, reason, since });
    };
    for (const p of providers ?? []) {
        if (p.lifecycle_status === "suspended") flag(p.provider_key, "suspended", p.lifecycle_status_since ?? null);
        if (p.lifecycle_status === "reverification_due") flag(p.provider_key, "reverification_due", p.reverification_due_at ?? p.lifecycle_status_since ?? null);
        if (LIVE.has(p.lifecycle_status ?? "") && p.billing_ready === false) flag(p.provider_key, "billing_blocked", null);
    }
    // In Kraft ist, was nicht aufgehoben wurde — `upheld` heisst: Einspruch abgelehnt, gilt weiter.
    const openEnforcement = (enforcement ?? []).filter(e => !e.lifted_at);
    for (const e of openEnforcement) flag(e.provider_key, "enforcement", e.created_at);
    for (const s of openSubs.filter(s => s.status === "past_due")) flag(s.provider_key, "past_due", null);
    for (const i of [...(incidents ?? [])].sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1))) flag(i.provider_key, "incident", i.recorded_at);
    attention.sort((a, b) => REASON_ORDER.indexOf(a.reason) - REASON_ORDER.indexOf(b.reason));
    const attentionComplete = !!(providers && enforcement && subs && incidents);

    const live = (providers ?? []).filter(p => LIVE.has(p.lifecycle_status ?? ""));
    const rated = (reviews ?? []).filter(r => typeof r.rating === "number");

    return {
        generatedAt: now.toISOString(),
        watchersShadow: input.watchersShadow,
        unavailable,
        truncated: input.truncated,
        platformHealth: {
            api: "up",
            db: unavailable.length ? "degraded" : "reachable",
            errorEvents7: from(events7, es => es.filter(e => ERROR_RE.test(e.type)).length),
            latestEventAt: input.feed?.[0] ? (input.feed[0].timestamp ?? input.feed[0].created_at ?? null) : null,
        },
        product: {
            bookingsToday: bookings ? series.bookings[6] : null,
            bookings7: bookings ? sum(series.bookings) : null,
            bookingsTotal: from(bookings, bs => bs.length),
            heldRate,
            sessionsActive: from(sessions, ss => ss.filter(s => (s.status ?? "active") === "active").length),
            sessions7: sessions ? sum(series.sessions) : null,
        },
        money: {
            baseCurrency: base,
            mrr,
            unpriced,
            subscriptions: subs ? { active: openSubs.filter(s => s.status === "active").length, pastDue: openSubs.filter(s => s.status === "past_due").length } : null,
            invoices: from(invoices, is => {
                const openAmounts: Amounts = {}, paidAmounts: Amounts = {};
                for (const i of is) {
                    if (i.status === "open") add(openAmounts, i.currency, i.amount_cents || 0, base);
                    if (i.status === "paid") add(paidAmounts, i.currency, i.amount_cents || 0, base);
                }
                return {
                    open: is.filter(i => i.status === "open").length,
                    paid: is.filter(i => i.status === "paid").length,
                    failed: is.filter(i => i.status === "failed").length,
                    overdue: is.filter(i => i.status === "open" && i.due_at && new Date(i.due_at).getTime() < nowMs).length,
                    openAmounts, paidAmounts,
                };
            }),
            leadFees7,
            credits7: from(credits, cs => {
                const out: Amounts = {};
                for (const c of cs) if (inWindow(c.created_at) && (c.amount_cents ?? 0) > 0) add(out, c.currency, c.amount_cents as number, base);
                return out;
            }),
            assistantActive: from(userSubs, us => us.filter(u => u.status === "active").length),
        },
        voice: {
            reviews: from(reviews, rs => ({
                count: rs.length,
                avgRating: rated.length ? Math.round((sum(rated.map(r => r.rating as number)) / rated.length) * 10) / 10 : null,
                fromUsers: rs.filter(r => r.from_role === "user").length,
                fromProviders: rs.filter(r => r.from_role === "provider").length,
            })),
            userCancellations7: from(bookings, bs => bs.filter(b => b.status === "cancelled" && b.cancelled_by === "user" && inWindow(b.cancelled_at)).length),
            disputesOpen: from(bookings, bs => bs.filter(b => b.dispute_status === "open").length),
        },
        trust: {
            providers: from(providers, ps => ({
                live: ps.filter(p => LIVE.has(p.lifecycle_status ?? "")).length,
                onboarding: ps.filter(p => ONBOARDING.has(p.lifecycle_status ?? "")).length,
                paused: ps.filter(p => p.lifecycle_status === "paused").length,
                suspended: ps.filter(p => p.lifecycle_status === "suspended").length,
                reverification: ps.filter(p => p.lifecycle_status === "reverification_due").length,
                ended: ps.filter(p => p.lifecycle_status === "terminated").length,
            })),
            providerNoShows30: from(bookings, bs => bs.filter(b => b.no_show_by === "provider" && (b.no_show_reported_at ?? "") >= since30).length),
            incidents30: from(incidents, is => is.length),
            enforcementOpen: enforcement ? openEnforcement.length : null,
            appealsPending: from(enforcement, es => es.filter(e => !e.lifted_at && e.appeal_at && !e.decision).length),
            attention: attentionComplete ? attention.slice(0, 10) : null,
            attentionTotal: attention.length,
        },
        rates: {
            heldRate,
            invoicesPaid: from(invoices, is => ratio(is.filter(i => i.status === "paid").length, is.filter(i => ["paid", "open", "failed"].includes(i.status)).length)),
            billingReady: providers ? ratio(live.filter(p => p.billing_ready === true).length, live.length) : null,
            subscriptionsCurrent: subs ? ratio(openSubs.filter(s => s.status === "active").length, openSubs.length) : null,
        },
        events: (input.feed ?? []).slice(0, 15).map(feedEvent),
        series,
    };
}

// ── Lesen ────────────────────────────────────────────────────────────────────
// Je Quelle nur die Spalten, die die Rechnung braucht (PostgREST `select`):
// keine Nachrichtentexte, keine Wizard-Antworten, keine E-Mail-Adressen.

const LIMIT = 2000;
const NO_SHADOW = "not.like.*_shadow";

export async function buildCockpit(correlationId?: string): Promise<Cockpit> {
    const now = new Date();
    const from7 = windowStart(now).toISOString();
    const from30 = new Date(now.getTime() - 30 * DAY).toISOString();
    const truncated: CockpitSource[] = [];
    const warn = (source: CockpitSource, detail: string) =>
        structuredLog("warn", "Cockpit source unavailable", { correlationId, errorCode: "ERR_COCKPIT_SOURCE", severity: "warning", detail: `${source}: ${detail.slice(0, 200)}` });
    const read = async <T,>(source: CockpitSource, run: () => Promise<unknown>, limit = LIMIT): Promise<T[] | null> => {
        try {
            const rows = await run();
            if (!Array.isArray(rows)) { warn(source, "response is not a list"); return null; }
            if (rows.length >= limit) truncated.push(source);
            return rows as T[];
        } catch (err) {
            warn(source, String(err));
            return null;
        }
    };
    const sel = (table: string, filters: Record<string, string>, opts: { order?: string; limit?: number } = {}) =>
        () => supabaseApi.selectWhere(table, filters, { limit: LIMIT, ...opts });

    const [bookings, events7, feed, sessions, invoices, subscriptions, ledger7, credits7, reviews, providers, incidents30, enforcement, userSubs, pricing] = await Promise.all([
        read<Booking>("scheduling", sel("scheduling", { select: "status,slot_start,created_at,cancelled_by,cancelled_at,dispute_status,no_show_by,no_show_reported_at" }, { order: "created_at.desc" })),
        read<EventRow>("event_log", sel("event_log", { select: "type,timestamp", timestamp: `gte.${from7}`, type: NO_SHADOW }, { order: "timestamp.desc", limit: 5000 }), 5000),
        read<EventRow>("event_feed", sel("event_log", { select: "type,timestamp,payload", type: NO_SHADOW }, { order: "timestamp.desc", limit: 15 }), Infinity),
        read<SessionRow>("sessions", sel("sessions", { select: "status,created_at" }, { order: "created_at.desc" })),
        read<Invoice>("invoices", sel("invoices", { select: "status,amount_cents,currency,due_at" }, { order: "issued_at.desc" })),
        read<ProviderSub>("provider_subscriptions", sel("provider_subscriptions", { select: "provider_key,plan_code,plan_version,cadence,status,ended_at" }, { order: "created_at.desc" })),
        read<Ledger>("provider_lead_ledger", sel("provider_lead_ledger", { select: "id,kind,payment_status,final_fee_cents,currency,created_at", created_at: `gte.${from7}` }, { order: "created_at.desc" })),
        read<Credit>("provider_credits", sel("provider_credits", { select: "amount_cents,currency,created_at", created_at: `gte.${from7}` }, { order: "created_at.desc" })),
        read<Review>("reviews", sel("reviews", { select: "from_role,rating" }, { order: "created_at.desc" })),
        read<Provider>("providers", sel("providers", { select: "provider_key,lifecycle_status,lifecycle_status_since,billing_ready,reverification_due_at" }, { order: "provider_key.asc" })),
        read<Incident>("provider_performance_incidents", sel("provider_performance_incidents", { select: "provider_key,recorded_at", recorded_at: `gte.${from30}` }, { order: "recorded_at.desc" })),
        read<Enforcement>("provider_enforcement_actions", sel("provider_enforcement_actions", { select: "provider_key,created_at,decision,lifted_at,appeal_at", lifted_at: "is.null" }, { order: "created_at.desc" })),
        read<UserSub>("user_subscriptions", sel("user_subscriptions", { select: "status", status: "eq.active" })),
        loadPricingConfig().catch((err) => { warn("pricing", String(err)); return null; }),
    ]);

    // Die wirksamen Zahlungsstatus der Belastungen im Fenster, in einer Abfrage.
    const chargeIds = (ledger7 ?? []).filter(l => l.kind === "charge").map(l => l.id);
    const paymentEvents = !ledger7 ? null : chargeIds.length === 0 ? [] : await read<PaymentEvent>(
        "provider_lead_ledger_payment_events",
        sel("provider_lead_ledger_payment_events", { select: "ledger_id,status,created_at", ledger_id: `in.(${chargeIds.join(",")})` }, { order: "created_at.asc", limit: 5000 }),
        5000,
    );

    return computeCockpit({
        bookings, events7, feed, sessions, invoices, subscriptions, pricing, ledger7, paymentEvents, credits7, reviews, providers,
        incidents30, enforcement, userSubs, truncated: [...new Set(truncated)], watchersShadow: watcherConfig.shadow, now,
    });
}
