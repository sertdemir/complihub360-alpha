// Runtime smoke for the cockpit read-model against COMPILED output (dist/cockpit.js).
// Framework-free; stubs global.fetch to emulate the Supabase REST surface.
// Run from services/compliance-api:  node test/cockpit.smoke.mjs

process.env.SUPABASE_URL ||= "http://supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-key";
process.env.WATCHERS_SHADOW = "false";

const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();

const fixtures = {
    engagement_requests: [
        { id: "e1", provider_key: "p1", country: "DE", category: "Tax & VAT", status: "replied", created_at: iso(now - 5 * 864e5), updated_at: iso(now - 4 * 864e5), sla_confirm_deadline: iso(now - 4 * 864e5), sla_reply_deadline: iso(now - 3 * 864e5) },
        { id: "e2", provider_key: "p1", country: "ES", category: "Data & Privacy", status: "confirmed", created_at: iso(now - 2 * 3600e3), updated_at: iso(now - 3600e3), sla_confirm_deadline: iso(now - 3600e3), sla_reply_deadline: iso(now + 5 * 3600e3) },
        { id: "e3", provider_key: "p2", country: "TR", category: "Corporate", status: "delivered", created_at: iso(now - 30 * 3600e3), updated_at: iso(now - 30 * 3600e3), sla_confirm_deadline: iso(now - 2 * 3600e3), sla_reply_deadline: null },
        { id: "e4", provider_key: "p3", country: "DE", category: "Marketing & SEO", status: "declined", created_at: iso(now - 3 * 864e5), updated_at: iso(now - 3 * 864e5), sla_confirm_deadline: null, sla_reply_deadline: null },
        { id: "e5", provider_key: "p1", country: "DE", category: "Tax & VAT", status: "withdrawn", created_at: iso(now - 1 * 864e5), updated_at: iso(now - 1 * 864e5), sla_confirm_deadline: null, sla_reply_deadline: null },
    ],
    event_log: [
        { type: "sla_breach", payload: { engagementId: "e3", stage: "confirm" }, timestamp: iso(now - 3600e3) },
        { type: "provider_downgraded", payload: { provider_key: "p2" }, timestamp: iso(now - 3500e3) },
        { type: "engagement_expired", payload: { engagementId: "e3" }, timestamp: iso(now - 3400e3) },
        { type: "sla_reminder_sent", payload: { engagementId: "e2", auto: true }, timestamp: iso(now - 3300e3) },
        { type: "sla_reminder_sent", payload: { engagementId: "e1", auto: false }, timestamp: iso(now - 3200e3) },
        { type: "email_failed", payload: {}, timestamp: iso(now - 3100e3) },
    ],
    invoices: [
        { status: "open", amount_cents: 9200, currency: "EUR", due_at: iso(now + 7 * 864e5), paid_at: null },
        { status: "open", amount_cents: 9200, currency: "EUR", due_at: iso(now - 2 * 864e5), paid_at: null },
        { status: "paid", amount_cents: 18400, currency: "EUR", due_at: iso(now - 10 * 864e5), paid_at: iso(now - 8 * 864e5) },
    ],
    user_subscriptions: [
        { status: "active", plan: "assistant_pro" },
        { status: "active", plan: "assistant_pro" },
        { status: "trialing", plan: "assistant_pro" },
        { status: "canceled", plan: "assistant_pro" },
    ],
    providers: [
        { provider_key: "p1", partner_status: "active", breach_count: 0 },
        { provider_key: "p2", partner_status: "downgraded", breach_count: 3 },
        { provider_key: "p3", partner_status: "inactive", breach_count: 1 },
    ],
    sessions: [{ status: "active" }, { status: "active" }, { status: "active" }, { status: "archived" }],
};

const okResp = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) });
globalThis.fetch = async (url, init) => {
    const method = (init?.method || "GET").toUpperCase();
    const table = new URL(url).pathname.replace("/rest/v1/", "");
    if (method === "GET" && fixtures[table]) return okResp(fixtures[table]);
    return okResp([]);
};

let failures = 0;
const assert = (cond, msg) => { if (cond) console.log("ok   -", msg); else { failures++; console.error("FAIL -", msg); } };

const { buildCockpit } = await import("../dist/cockpit.js");
const c = await buildCockpit();

assert(c.watchersShadow === false, "surfaces live watcher mode");
assert(c.platformHealth.db === "reachable" && c.platformHealth.recentErrorEvents === 3, "health: reachable, 3 error-ish events");
assert(c.productEngagement.engagementsTotal === 5, "engagements total = 5");
assert(c.productEngagement.confirmRate === 0.4 && c.productEngagement.replyRate === 0.5, "confirm 0.4 / reply 0.5");
assert(c.productEngagement.sessionsActive === 3, "3 active sessions");
assert(c.money.invoices.open === 2 && c.money.invoices.overdue === 1, "invoices: 2 open, 1 overdue");
assert(c.money.invoices.openCents === 18400 && c.money.invoices.paidCents === 18400, "invoice sums correct");
assert(c.money.subscriptions.active === 2 && c.money.mrrEstimateCents === 3600, "2 active subs, MRR est 3600c");
assert(c.voiceOfCustomer.signals.declined === 1 && c.voiceOfCustomer.signals.withdrawn === 1 && c.voiceOfCustomer.signals.remindersSent === 2, "VoC proxy signals");
assert(c.slaTrust.breachedNow === 1, "1 breached-now in watchlist");
assert(c.slaTrust.breachEvents === 1 && c.slaTrust.downgrades === 1 && c.slaTrust.expiries === 1 && c.slaTrust.autoReminders === 2, "SLA event counts");
assert(c.slaTrust.providers.active === 1 && c.slaTrust.providers.downgraded === 1 && c.slaTrust.providers.inactive === 1 && c.slaTrust.providers.totalBreachCount === 4, "provider trust aggregates");
assert(c.slaTrust.atRisk.length === 2 && c.slaTrust.atRisk[0].id === "e3", "atRisk sorted, most-urgent first (e3)");

console.log(failures ? `\nCOCKPIT SMOKE FAILED (${failures})` : "\nCOCKPIT SMOKE PASSED");
process.exit(failures ? 1 : 0);
