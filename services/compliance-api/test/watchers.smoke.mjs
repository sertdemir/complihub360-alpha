// Runtime smoke for the SLA watchers against COMPILED output (dist/watchers.js).
// Framework-free; stubs global.fetch to emulate the Supabase REST surface.
// Run from services/compliance-api:  node test/watchers.smoke.mjs

process.env.SUPABASE_URL ||= "http://supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-key";
process.env.WATCHERS_SHADOW = "true";
process.env.SLA_REMINDER_LEAD_HOURS = "4";
process.env.SLA_BREACH_DOWNGRADE_THRESHOLD = "3";

const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();

const engagements = [
    { id: "aaaaaaaa-0000-0000-0000-000000000001", provider_key: "p_remind", country: "DE", category: "Tax & VAT", status: "delivered", sla_confirm_deadline: iso(now + 2 * 3600e3), sla_reply_deadline: null, message: "x" },
    { id: "bbbbbbbb-0000-0000-0000-000000000002", provider_key: "p_breach", country: "ES", category: "Data & Privacy", status: "viewed", sla_confirm_deadline: iso(now - 3600e3), sla_reply_deadline: null, message: "x" },
    { id: "cccccccc-0000-0000-0000-000000000003", provider_key: "p_reply", country: "TR", category: "Corporate", status: "confirmed", sla_confirm_deadline: iso(now - 5 * 3600e3), sla_reply_deadline: iso(now - 1800e3), message: "x" },
    { id: "dddddddd-0000-0000-0000-000000000004", provider_key: "p_ok", country: "DE", category: "Marketing & SEO", status: "created", sla_confirm_deadline: iso(now + 20 * 3600e3), sla_reply_deadline: null, message: "x" },
];

const inserts = [];
let replayMarkers = false;

function parse(url) {
    const u = new URL(url);
    const table = u.pathname.replace("/rest/v1/", "");
    const typeParam = u.searchParams.get("type");
    return { table, type: typeParam ? typeParam.replace("eq.", "") : null };
}
const okResp = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) });

globalThis.fetch = async (url, init) => {
    const method = (init?.method || "GET").toUpperCase();
    const { table, type } = parse(url);
    if (method === "GET" && table === "engagement_requests") return okResp(engagements);
    if (method === "GET" && table === "event_log") {
        if (!replayMarkers) return okResp([]);
        return okResp(inserts.filter(i => i.table === "event_log" && i.body.type === type).map(i => i.body));
    }
    if (method === "GET" && table === "magic_link_tokens") return okResp([]);
    if (method === "POST") { inserts.push({ table, body: JSON.parse(init.body) }); return okResp([JSON.parse(init.body)]); }
    if (method === "PATCH") return okResp([]);
    return okResp([]);
};

const count = (t) => inserts.filter(i => i.table === "event_log" && i.body.type === t).length;
let failures = 0;
const assert = (cond, msg) => { if (cond) console.log("ok   -", msg); else { failures++; console.error("FAIL -", msg); } };

const { runWatcherTick } = await import("../dist/watchers.js");

const s1 = await runWatcherTick();
assert(s1.shadow === true, "tick runs in shadow mode");
assert(count("sla_reminder_sent_shadow") === 1, "reminder marked once (A, confirm stage)");
assert(count("sla_breach_shadow") === 2, "breach marked twice (B confirm + C reply)");
assert(count("engagement_expired_shadow") === 1, "expiry marked once (B)");
assert(s1.reminders === 1 && s1.breaches === 2 && s1.expiries === 1, "summary counts match actions");
assert(s1.downgrades === 0, "no provider mutation/downgrade in shadow");
assert(count("provider_downgraded") === 0, "no live downgrade event in shadow");

replayMarkers = true;
const before = inserts.length;
const s2 = await runWatcherTick();
assert(s2.reminders === 0 && s2.breaches === 0 && s2.expiries === 0, "second tick is a no-op (idempotent)");
assert(inserts.length === before, "no new event_log rows on the second tick");

console.log(failures ? `\nSMOKE FAILED (${failures})` : "\nSMOKE PASSED");
process.exit(failures ? 1 : 0);
