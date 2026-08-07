import { supabaseApi } from "./supabase.js";
import { watcherConfig } from "./watchers.js";

// ─── Founder Cockpit read-model ───────────────────────────────────────────────
// One consolidated read across the live systems, shaped as the five lenses of the
// operator command-center: Platform Health · Product & Engagement · Money ·
// Voice of Customer · SLA & Trust. Source of truth is the live data (Supabase +
// the SLA-watcher events); this endpoint only aggregates, it never writes.
//
// Served by GET /api/v1/admin/cockpit (server-to-server x-api-key only).

const OPEN_CONFIRM = ["created", "delivered", "viewed"];

// Assistant subscription price for the MRR estimate (chatbot plan ③: 12 $/mo).
// user_subscriptions has no price column, so MRR is an estimate off the plan map.
const PLAN_PRICE_CENTS: Record<string, number> = { assistant_pro: 1200 };

type Engagement = { id: string; provider_key: string; country: string; category: string; status: string; created_at: string; updated_at?: string; sla_confirm_deadline?: string | null; sla_reply_deadline?: string | null };
type EventRow = { type: string; payload?: Record<string, unknown> | null; timestamp?: string; created_at?: string };
type Invoice = { status: string; amount_cents: number; currency?: string; due_at?: string | null; paid_at?: string | null };
type Subscription = { status: string; plan?: string };
type Provider = { provider_key: string; partner_status?: string | null; breach_count?: number | null };
type Session = { status?: string };

async function safeSelect<T>(table: string, opts: { order?: string; limit?: number } = {}): Promise<{ rows: T[]; ok: boolean }> {
    try {
        const rows = (await supabaseApi.select(table, {}, opts)) as T[];
        return { rows: Array.isArray(rows) ? rows : [], ok: true };
    } catch {
        return { rows: [], ok: false };
    }
}

const countBy = <T,>(rows: T[], key: (r: T) => string) => {
    const m: Record<string, number> = {};
    for (const r of rows) { const k = key(r); m[k] = (m[k] || 0) + 1; }
    return m;
};
const eventsOfType = (events: EventRow[], type: string) => events.filter(e => e.type === type).length;

export interface Cockpit {
    generatedAt: string;
    watchersShadow: boolean;
    platformHealth: {
        api: "up";
        db: "reachable" | "degraded";
        sources: Record<string, boolean>;
        recentErrorEvents: number;
        latestEventAt: string | null;
    };
    productEngagement: {
        engagementsTotal: number;
        engagementsToday: number;
        confirmRate: number | null;
        replyRate: number | null;
        sessionsActive: number;
    };
    money: {
        currency: string;
        invoices: { open: number; paid: number; failed: number; void: number; overdue: number; openCents: number; paidCents: number };
        subscriptions: { active: number; trialing: number; past_due: number; canceled: number; inactive: number };
        mrrEstimateCents: number;
    };
    voiceOfCustomer: {
        note: string;
        signals: { declined: number; withdrawn: number; remindersSent: number };
    };
    slaTrust: {
        breachedNow: number;
        breachEvents: number;
        autoReminders: number;
        expiries: number;
        downgrades: number;
        providers: { active: number; downgraded: number; inactive: number; totalBreachCount: number };
        atRisk: Array<{ id: string; provider_key: string; country: string; category: string; status: string; deadline: string | null; hoursLeft: number | null }>;
    };
    events: Array<{ type: string; at: string | null; payload?: Record<string, unknown> | null }>;
    /** 7-day trend series for the Product & Engagement charts. */
    series: { dates: string[]; requests: number[]; confirmRate: number[]; breaches: number[] };
}

export async function buildCockpit(): Promise<Cockpit> {
    const now = Date.now();
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);

    const [engRes, evtRes, invRes, subRes, provRes, sessRes] = await Promise.all([
        safeSelect<Engagement>("engagement_requests", { order: "created_at.desc", limit: 500 }),
        safeSelect<EventRow>("event_log", { order: "timestamp.desc", limit: 500 }),
        safeSelect<Invoice>("invoices", { limit: 500 }),
        safeSelect<Subscription>("user_subscriptions", { limit: 500 }),
        safeSelect<Provider>("providers", { limit: 500 }),
        safeSelect<Session>("sessions", { limit: 1000 }),
    ]);

    const engagements = engRes.rows, events = evtRes.rows, invoices = invRes.rows;
    const subs = subRes.rows, providers = provRes.rows, sessions = sessRes.rows;

    // ── Platform Health ──────────────────────────────────────────────────────
    const sources = { engagements: engRes.ok, events: evtRes.ok, invoices: invRes.ok, subscriptions: subRes.ok, providers: provRes.ok, sessions: sessRes.ok };
    const eventAt = (e: EventRow) => e.timestamp || e.created_at || null;
    const latestEventAt = events.reduce<string | null>((max, e) => {
        const t = eventAt(e); return t && (!max || t > max) ? t : max;
    }, null);
    const recentErrorEvents = events.filter(e => /fail|error|blocked|invalid|breach|downgrad/i.test(e.type)).length;

    // ── Product & Engagement ─────────────────────────────────────────────────
    const total = engagements.length;
    const confirmedPlus = engagements.filter(e => e.status === "confirmed" || e.status === "replied").length;
    const replied = engagements.filter(e => e.status === "replied").length;
    const engagementsToday = engagements.filter(e => new Date(e.created_at) >= dayStart).length;
    const sessionsActive = sessions.filter(s => (s.status ?? "active") === "active").length;

    // ── Money ────────────────────────────────────────────────────────────────
    const invByStatus = countBy(invoices, i => i.status);
    const sumCents = (pred: (i: Invoice) => boolean) => invoices.filter(pred).reduce((s, i) => s + (i.amount_cents || 0), 0);
    const overdue = invoices.filter(i => i.status === "open" && i.due_at && new Date(i.due_at).getTime() < now).length;
    const subByStatus = countBy(subs, s => s.status);
    const mrrEstimateCents = subs
        .filter(s => s.status === "active" || s.status === "trialing")
        .reduce((sum, s) => sum + (PLAN_PRICE_CENTS[s.plan || "assistant_pro"] ?? 0), 0);

    // ── Voice of Customer (no dedicated feedback source yet — proxy signals) ──
    const declined = engagements.filter(e => e.status === "declined").length;
    const withdrawn = engagements.filter(e => e.status === "withdrawn").length;

    // ── SLA & Trust ──────────────────────────────────────────────────────────
    const watchlist = engagements
        .filter(e => OPEN_CONFIRM.includes(e.status) || e.status === "confirmed")
        .map(e => {
            const deadline = OPEN_CONFIRM.includes(e.status) ? e.sla_confirm_deadline : e.sla_reply_deadline;
            const msLeft = deadline ? new Date(deadline).getTime() - now : null;
            return { id: e.id, provider_key: e.provider_key, country: e.country, category: e.category, status: e.status, deadline: deadline ?? null, msLeft, hoursLeft: msLeft === null ? null : Math.round(msLeft / 3600e3) };
        })
        .sort((a, b) => (a.msLeft ?? Infinity) - (b.msLeft ?? Infinity));
    const breachedNow = watchlist.filter(w => (w.msLeft ?? 1) < 0).length;
    const provByStatus = countBy(providers, p => p.partner_status ?? "inactive");
    const totalBreachCount = providers.reduce((s, p) => s + (p.breach_count ?? 0), 0);

    // ── 7-day trend series (Product & Engagement charts) ─────────────────────
    const dayKeys: string[] = [];
    for (let i = 6; i >= 0; i--) { const dt = new Date(); dt.setUTCHours(0, 0, 0, 0); dt.setUTCDate(dt.getUTCDate() - i); dayKeys.push(dt.toISOString().slice(0, 10)); }
    const seriesDates = dayKeys.map(k => `${k.slice(8, 10)}.${k.slice(5, 7)}`);
    const idxOf = (iso?: string | null) => dayKeys.indexOf((iso || "").slice(0, 10));
    const bucket = () => new Array(7).fill(0) as number[];
    const reqB = bucket(), confB = bucket(), breachB = bucket();
    for (const e of engagements) {
        const ci = idxOf(e.created_at); if (ci >= 0) reqB[ci]++;
        const ui = idxOf(e.updated_at);
        if (ui >= 0 && (e.status === "confirmed" || e.status === "replied")) confB[ui]++;
        if (ui >= 0 && e.status === "expired") breachB[ui]++;
    }
    const series = { dates: seriesDates, requests: reqB, confirmRate: reqB.map((r, i) => (r ? Math.round((confB[i] / r) * 100) : 0)), breaches: breachB };

    return {
        generatedAt: new Date().toISOString(),
        watchersShadow: watcherConfig.shadow,
        platformHealth: {
            api: "up",
            db: Object.values(sources).every(Boolean) ? "reachable" : "degraded",
            sources,
            recentErrorEvents,
            latestEventAt,
        },
        productEngagement: {
            engagementsTotal: total,
            engagementsToday,
            confirmRate: total ? confirmedPlus / total : null,
            replyRate: confirmedPlus ? replied / confirmedPlus : null,
            sessionsActive,
        },
        money: {
            currency: "EUR",
            invoices: {
                open: invByStatus.open || 0,
                paid: invByStatus.paid || 0,
                failed: invByStatus.failed || 0,
                void: invByStatus.void || 0,
                overdue,
                openCents: sumCents(i => i.status === "open"),
                paidCents: sumCents(i => i.status === "paid"),
            },
            subscriptions: {
                active: subByStatus.active || 0,
                trialing: subByStatus.trialing || 0,
                past_due: subByStatus.past_due || 0,
                canceled: subByStatus.canceled || 0,
                inactive: subByStatus.inactive || 0,
            },
            mrrEstimateCents,
        },
        voiceOfCustomer: {
            note: "No dedicated feedback/rating/NPS source yet — these are proxy signals from the engagement lifecycle. A structured VoC capture is a separate backlog item.",
            signals: {
                declined,
                withdrawn,
                remindersSent: eventsOfType(events, "sla_reminder_sent") + eventsOfType(events, "sla_reminder_sent_shadow"),
            },
        },
        slaTrust: {
            breachedNow,
            breachEvents: eventsOfType(events, "sla_breach") + eventsOfType(events, "sla_breach_shadow"),
            autoReminders: eventsOfType(events, "sla_reminder_sent"),
            expiries: eventsOfType(events, "engagement_expired") + eventsOfType(events, "engagement_expired_shadow"),
            downgrades: eventsOfType(events, "provider_downgraded"),
            providers: {
                active: provByStatus.active || 0,
                downgraded: provByStatus.downgraded || 0,
                inactive: provByStatus.inactive || 0,
                totalBreachCount,
            },
            atRisk: watchlist.slice(0, 10).map(({ id, provider_key, country, category, status, deadline, hoursLeft }) =>
                ({ id, provider_key, country, category, status, deadline, hoursLeft })),
        },
        events: events.slice(0, 15).map(e => ({ type: e.type, at: eventAt(e), payload: e.payload ?? null })),
        series,
    };
}
