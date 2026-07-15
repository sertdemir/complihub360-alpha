import * as crypto from "node:crypto";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";
import { sendMagicLinkMail } from "./mailer.js";

// ─── SLA Watchers (Beta) ──────────────────────────────────────────────────────
// An in-process scheduler that makes the SLA/Trust loop autonomous on Staging,
// where inbound webhooks (Stripe, n8n) are blocked by Basic Auth. One tick every
// WATCHERS_TICK_MS runs three passes against Supabase:
//
//   1. reminder — a request awaiting confirm whose deadline is within
//      SLA_REMINDER_LEAD_HOURS gets a fresh magic-link nudge (reuses issueReminder,
//      i.e. the same core as the manual POST /remind route).
//   2. breach   — a past-deadline still-open request records an `sla_breach` and
//      bumps providers.breach_count; at SLA_BREACH_DOWNGRADE_THRESHOLD the partner
//      is downgraded (partner_status='downgraded').
//   3. expiry   — a request past its confirm deadline transitions to 'expired' and
//      its open magic-link tokens are burned.
//
// Idempotency is the event_log: every action writes a marker event and every pass
// skips engagements that already have their marker. SHADOW mode writes `*_shadow`
// markers and performs NO side effects (no mail, no status/provider mutation) — and
// guards only against shadow markers, so flipping WATCHERS_SHADOW=false later lets
// the real actions fire exactly once.
//
// Single-container assumption for Beta; a Postgres advisory lock for multi-replica
// safety is a follow-up (noted in docs/n8n-sla-watchdog.md).

const OPEN_CONFIRM = ["created", "delivered", "viewed"] as const;

const bool = (v: string | undefined, dflt: boolean): boolean =>
    v === undefined ? dflt : /^(1|true|yes|on)$/i.test(v);

const num = (v: string | undefined, dflt: number): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : dflt;
};

export const watcherConfig = {
    get enabled() { return bool(process.env.WATCHERS_ENABLED, true); },
    get shadow() { return bool(process.env.WATCHERS_SHADOW, true); },
    get tickMs() { return num(process.env.WATCHERS_TICK_MS, 5 * 60 * 1000); },
    get reminderLeadMs() { return num(process.env.SLA_REMINDER_LEAD_HOURS, 4) * 60 * 60 * 1000; },
    get downgradeThreshold() { return num(process.env.SLA_BREACH_DOWNGRADE_THRESHOLD, 3); },
};

type Engagement = {
    id: string;
    provider_key: string;
    country: string;
    category: string;
    message?: string;
    status: string;
    sla_confirm_deadline?: string | null;
    sla_reply_deadline?: string | null;
};

type EventRow = { type: string; payload?: Record<string, unknown> | null };

export interface TickSummary {
    shadow: boolean;
    scanned: number;
    reminders: number;
    breaches: number;
    downgrades: number;
    expiries: number;
    errors: number;
}

// ─── Shared reminder core ─────────────────────────────────────────────────────
// Extracted from POST /api/v1/engagement/:id/remind so the route and the watcher
// issue reminders through one code path. Returns a coarse outcome the caller maps
// to HTTP (route) or counts (watcher).
export async function issueReminder(
    engagementId: string,
    opts: { auto: boolean } = { auto: false },
): Promise<"ok" | "not_found" | "invalid_state" | "error"> {
    try {
        const eng = (await supabaseApi.select("engagement_requests", { id: engagementId }, { limit: 1 })) as Engagement[];
        if (!eng[0]) return "not_found";
        if (!OPEN_CONFIRM.includes(eng[0].status as typeof OPEN_CONFIRM[number])) return "invalid_state";

        const correlationId = crypto.randomUUID();
        const magicLinks: Record<string, string> = {};
        for (const action of ["confirm", "reply", "decline"] as const) {
            const rawToken = crypto.randomBytes(32).toString("base64url");
            const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
            await supabaseApi.insert("magic_link_tokens", {
                engagement_id: engagementId,
                action,
                token_hash: tokenHash,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });
            magicLinks[action] = `?id=${engagementId}&token=${rawToken}`;
        }

        await supabaseApi.insert("event_log", {
            type: "sla_reminder_sent",
            payload: { engagementId, provider_key: eng[0].provider_key, auto: opts.auto },
        });
        await supabaseApi.insert("engagement_messages", {
            engagement_id: engagementId,
            author: "system",
            body: opts.auto
                ? "Automated reminder — a fresh confirmation link was sent to the provider before the SLA deadline."
                : "Reminder sent — the provider received a fresh confirmation link.",
        }).catch(() => { /* thread note is best-effort */ });

        const provRows = (await supabaseApi.select("providers", { provider_key: eng[0].provider_key }, { limit: 1 })) as
            Array<{ name: string; contact_email?: string | null }>;
        await sendMagicLinkMail({
            engagementId,
            providerKey: eng[0].provider_key,
            providerName: provRows[0]?.name || eng[0].provider_key,
            contactEmail: provRows[0]?.contact_email ?? null,
            country: eng[0].country,
            category: eng[0].category,
            message: eng[0].message || "",
            magicLinks,
            correlationId,
            reminder: true,
        }).catch(() => { /* logged inside the mailer */ });

        return "ok";
    } catch (err) {
        structuredLog("error", "issueReminder failed", { correlationId: engagementId, errorCode: "ERR_REMIND_CORE", severity: "error", route: "watchers/issueReminder" });
        return "error";
    }
}

// ─── Idempotency helpers ──────────────────────────────────────────────────────
// Build a Set of "engagementId:stage" keys already marked for a given event type,
// so a pass can skip what it already acted on. Mode decides the marker namespace:
// live checks the real type, shadow checks `<type>_shadow`.
function markerType(base: string, shadow: boolean): string {
    return shadow ? `${base}_shadow` : base;
}

async function loadMarkers(base: string, shadow: boolean): Promise<Set<string>> {
    const rows = (await supabaseApi.select("event_log", { type: markerType(base, shadow) }, { limit: 5000 })) as EventRow[];
    const set = new Set<string>();
    for (const r of rows) {
        const id = r.payload?.engagementId;
        const stage = (r.payload?.stage as string | undefined) ?? "_";
        if (typeof id === "string") set.add(`${id}:${stage}`);
    }
    return set;
}

async function mark(base: string, shadow: boolean, payload: Record<string, unknown>): Promise<void> {
    await supabaseApi.insert("event_log", { type: markerType(base, shadow), payload });
}

// ─── The tick ─────────────────────────────────────────────────────────────────
export async function runWatcherTick(): Promise<TickSummary> {
    const shadow = watcherConfig.shadow;
    const now = Date.now();
    const summary: TickSummary = { shadow, scanned: 0, reminders: 0, breaches: 0, downgrades: 0, expiries: 0, errors: 0 };

    let engagements: Engagement[];
    try {
        engagements = (await supabaseApi.select("engagement_requests", {}, { order: "created_at.desc", limit: 500 })) as Engagement[];
    } catch (err) {
        structuredLog("error", "Watcher tick: engagement load failed", { correlationId: "watchers", errorCode: "ERR_WATCHER_LOAD", severity: "error", route: "watchers/tick" });
        summary.errors++;
        return summary;
    }
    summary.scanned = engagements.length;

    // Preload idempotency markers once per tick.
    const [remindMarks, breachMarks, expiryMarks] = await Promise.all([
        loadMarkers("sla_reminder_sent", shadow),
        loadMarkers("sla_breach", shadow),
        loadMarkers("engagement_expired", shadow),
    ]);

    const openConfirm = engagements.filter(e => OPEN_CONFIRM.includes(e.status as typeof OPEN_CONFIRM[number]));
    const confirmed = engagements.filter(e => e.status === "confirmed");

    // 1. Reminder pass — awaiting confirm, deadline within lead window, not past.
    for (const e of openConfirm) {
        if (!e.sla_confirm_deadline) continue;
        const deadline = new Date(e.sla_confirm_deadline).getTime();
        const inWindow = now >= deadline - watcherConfig.reminderLeadMs && now < deadline;
        if (!inWindow) continue;
        if (remindMarks.has(`${e.id}:confirm`)) continue;
        try {
            if (shadow) {
                await mark("sla_reminder_sent", true, { engagementId: e.id, provider_key: e.provider_key, stage: "confirm", auto: true });
            } else {
                const r = await issueReminder(e.id, { auto: true });
                if (r !== "ok") { summary.errors++; continue; }
            }
            summary.reminders++;
        } catch { summary.errors++; }
    }

    // 2. Breach pass — past deadline while still open (confirm stage) or awaiting
    //    reply past reply deadline (reply stage). Records breach + escalates.
    const breachCandidates: Array<{ e: Engagement; stage: "confirm" | "reply"; deadline: number }> = [];
    for (const e of openConfirm) {
        if (!e.sla_confirm_deadline) continue;
        const d = new Date(e.sla_confirm_deadline).getTime();
        if (now > d) breachCandidates.push({ e, stage: "confirm", deadline: d });
    }
    for (const e of confirmed) {
        if (!e.sla_reply_deadline) continue;
        const d = new Date(e.sla_reply_deadline).getTime();
        if (now > d) breachCandidates.push({ e, stage: "reply", deadline: d });
    }
    for (const { e, stage, deadline } of breachCandidates) {
        if (breachMarks.has(`${e.id}:${stage}`)) continue;
        try {
            if (shadow) {
                await mark("sla_breach", true, { engagementId: e.id, provider_key: e.provider_key, stage, deadline: new Date(deadline).toISOString() });
                summary.breaches++;
                continue;
            }
            // Live: record the breach, bump the provider counter, escalate at threshold.
            await mark("sla_breach", false, { engagementId: e.id, provider_key: e.provider_key, stage, deadline: new Date(deadline).toISOString() });
            summary.breaches++;

            const provRows = (await supabaseApi.select("providers", { provider_key: e.provider_key }, { limit: 1 })) as
                Array<{ breach_count?: number | null; partner_status?: string | null }>;
            const prov = provRows[0];
            if (prov) {
                const newCount = (prov.breach_count ?? 0) + 1;
                const patch: Record<string, unknown> = { breach_count: newCount, updated_at: new Date().toISOString() };
                if (newCount >= watcherConfig.downgradeThreshold && prov.partner_status !== "downgraded") {
                    patch.partner_status = "downgraded";
                }
                await supabaseApi.update("providers", { provider_key: e.provider_key }, patch);
                if (patch.partner_status === "downgraded") {
                    await supabaseApi.insert("event_log", {
                        type: "provider_downgraded",
                        payload: { provider_key: e.provider_key, breach_count: newCount, trigger_engagement: e.id },
                    });
                    summary.downgrades++;
                }
            }
        } catch { summary.errors++; }
    }

    // 3. Expiry pass — confirm deadline missed → terminal 'expired', burn tokens.
    for (const e of openConfirm) {
        if (!e.sla_confirm_deadline) continue;
        const d = new Date(e.sla_confirm_deadline).getTime();
        if (now <= d) continue;
        if (expiryMarks.has(`${e.id}:expired`)) continue;
        try {
            if (shadow) {
                await mark("engagement_expired", true, { engagementId: e.id, provider_key: e.provider_key, stage: "expired" });
                summary.expiries++;
                continue;
            }
            const ts = new Date().toISOString();
            await supabaseApi.update("engagement_requests", { id: e.id }, { status: "expired", updated_at: ts });
            const tokens = (await supabaseApi.select("magic_link_tokens", { engagement_id: e.id })) as
                Array<{ id: string; used_at: string | null }>;
            for (const t of tokens.filter(t => !t.used_at)) {
                await supabaseApi.update("magic_link_tokens", { id: t.id }, { used_at: ts });
            }
            await supabaseApi.insert("event_log", { type: "engagement_expired", payload: { engagementId: e.id, provider_key: e.provider_key, stage: "expired" } });
            summary.expiries++;
        } catch { summary.errors++; }
    }

    structuredLog("info", "Watcher tick complete", {
        correlationId: "watchers", route: "watchers/tick", severity: "info", errorCode: "NONE",
        ...summary,
    } as Record<string, unknown>);
    return summary;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
export function startSlaWatchers(): NodeJS.Timeout | null {
    if (!watcherConfig.enabled) {
        console.log("[Watchers] Disabled (WATCHERS_ENABLED=false)");
        return null;
    }
    console.log(`[Watchers] SLA watchers on — tick ${watcherConfig.tickMs}ms, shadow=${watcherConfig.shadow}, lead=${watcherConfig.reminderLeadMs}ms, downgrade@${watcherConfig.downgradeThreshold}`);
    // Fire-and-forget ticks; each tick catches its own errors.
    const handle = setInterval(() => { void runWatcherTick(); }, watcherConfig.tickMs);
    if (typeof handle.unref === "function") handle.unref();
    return handle;
}
