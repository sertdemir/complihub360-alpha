import type { IncomingMessage, ServerResponse } from "node:http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";
import { notify } from "./notifications.js";
import { getActiveSubscription, loadPricingConfig } from "./billing.js";
import { providerSharedView } from "./sharedSnapshot.js";
import {
    API_SCOPES, REQUESTABLE_SCOPES, API_TERMS_VERSION, ClientRateLimiter, apiAccessVerdict, clientView, eventBelongsTo,
    generateApiKey, hasScope, hashApiKey, isExtStatus, keyMatchesClient, looksLikeApiKey, mapEventLogRow, pageLimit,
    serializeLead, validateScopes, EXT_STATUSES, type ApiClientRow, type ApiScope, type RateLimitResult, type EventLogRow,
} from "./apiClients.js";

// ─── Phase 7: Enterprise-API (Spec B "Global enterprise API", ADR-0010) ─────
//
// Drei Gruppen von Routen:
//   · /api/v1/ext/*            — was ein API-Client (Bearer chk_live_…) sieht.
//   · /provider/:key/api-access — der Anbieter beantragt, erzeugt, rotiert, widerruft.
//   · /admin/api-access, /admin/api-clients/:id — das Team entscheidet.
//
// Grundsaetze (Spec B "Prohibited API access"): kein Nutzerdatum vor der
// Offenlegung, kein fremder Anbieter, kein Massen-Export, kein Ranking-
// Einfluss. Ein Tarif ohne api_eligible sieht die Funktion gar nicht; ein
// Client eines Tarifs, der unter Global faellt, bekommt 403 API_NOT_ELIGIBLE.

type Json = Record<string, any>;

function json(res: ServerResponse, status: number, body: Json): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Json> {
    let raw = '';
    for await (const chunk of req) raw += chunk.toString();
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

async function membersOf(providerKey: string): Promise<string[]> {
    const rows = (await supabaseApi.select('provider_members', { provider_key: providerKey }, { limit: 20 })) as Array<{ user_id: string }>;
    return rows.map((m) => m.user_id).filter(Boolean);
}

const KEY_OVERLAP_MS = 24 * 60 * 60 * 1000;
export const API_REQUEST_LOG_RETENTION_DAYS = 90;

// ─── Tarif ───────────────────────────────────────────────────────────────────

/** Ist der Anbieter heute API-berechtigt? Antwortet mit dem Tarifcode fuer die Anzeige. */
export async function apiEligibility(providerKey: string): Promise<{ eligible: boolean; planCode: string | null }> {
    const [sub, cfg] = await Promise.all([getActiveSubscription(providerKey), loadPricingConfig()]);
    if (!sub) return { eligible: false, planCode: null };
    const plan = cfg.plans.find((p) => p.code === sub.planCode && p.version === sub.planVersion)
        ?? cfg.plans.find((p) => p.code === sub.planCode) ?? null;
    return { eligible: !!plan?.apiEligible, planCode: sub.planCode };
}

/** Der eine Client eines Anbieters, der zaehlt: der juengste, der nicht widerrufen oder abgelehnt ist. */
async function currentClientOf(providerKey: string): Promise<ApiClientRow | null> {
    const rows = (await supabaseApi.select('api_clients', { provider_key: providerKey }, { order: 'created_at.desc', limit: 20 })) as ApiClientRow[];
    return rows.find((c) => c.status !== 'revoked' && c.status !== 'rejected') ?? null;
}

// ─── Authentifizierung eines API-Clients ─────────────────────────────────────

export type ApiAuthResult =
    | { ok: true; client: ApiClientRow; keyUse: 'current' | 'previous' }
    | { ok: false; status: 401 | 403; code: string; message: string };

/** Bearer chk_live_… → Client. Hash nachschlagen, Zustand und Tarif pruefen. */
export async function authenticateApiClient(token: string, nowIso = new Date().toISOString()): Promise<ApiAuthResult> {
    const invalid: ApiAuthResult = { ok: false, status: 401, code: 'INVALID_API_KEY', message: 'Unknown or expired API key' };
    if (!looksLikeApiKey(token)) return invalid;
    const hash = hashApiKey(token);
    let rows = (await supabaseApi.select('api_clients', { key_hash: hash }, { limit: 1 })) as ApiClientRow[];
    if (!rows.length) rows = (await supabaseApi.select('api_clients', { previous_key_hash: hash }, { limit: 1 })) as ApiClientRow[];
    const client = rows[0];
    if (!client) return invalid;
    const keyUse = keyMatchesClient(hash, client, nowIso);
    if (!keyUse) return invalid;
    const { eligible } = await apiEligibility(client.provider_key);
    const verdict = apiAccessVerdict(client, eligible);
    if (!verdict.ok) {
        const messages: Record<string, string> = {
            API_CLIENT_SUSPENDED: 'API access is suspended — see the reason in your workspace',
            API_CLIENT_REVOKED: 'API access was revoked',
            API_CLIENT_NOT_ACTIVE: 'API access is not active yet',
            API_NOT_ELIGIBLE: 'The current plan does not include API access',
        };
        return { ok: false, status: verdict.status, code: verdict.code, message: messages[verdict.code] };
    }
    return { ok: true, client, keyUse };
}

// ─── Rate Limit und Protokoll ────────────────────────────────────────────────

export const clientRateLimiter = new ClientRateLimiter();

export function setRateLimitHeaders(res: ServerResponse, r: RateLimitResult): void {
    res.setHeader('X-RateLimit-Limit', String(r.limit));
    res.setHeader('X-RateLimit-Remaining', String(r.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(r.resetAt / 1000)));
    if (!r.allowed) res.setHeader('Retry-After', String(r.retryAfterSec));
}

/** Eine Zeile je Anfrage — Aufruf, Status, Dauer. Nie der Schluessel, nie ein Body. */
export async function logApiRequest(a: { client: ApiClientRow; method: string; url: string; status: number; durationMs: number; correlationId: string; ip: string }): Promise<void> {
    const route = a.url.split('?')[0].slice(0, 200);
    try {
        await supabaseApi.insert('api_request_log', {
            client_id: a.client.id, provider_key: a.client.provider_key, method: a.method, route, status: a.status,
            duration_ms: Math.max(0, Math.round(a.durationMs)), correlation_id: a.correlationId, ip: a.ip.slice(0, 64),
        });
        await supabaseApi.update('api_clients', { id: a.client.id }, { last_used_at: new Date().toISOString(), last_used_ip: a.ip.slice(0, 64) });
    } catch {
        structuredLog('warn', 'API request log failed', { correlationId: a.correlationId, errorCode: 'ERR_API_REQUEST_LOG', severity: 'warn', route });
    }
}

/** Protokollzeilen aelter als 90 Tage loeschen (Watcher). Liefert die Anzahl. */
export async function runApiRequestLogRetentionTick(shadow: boolean): Promise<number> {
    const cutoff = new Date(Date.now() - API_REQUEST_LOG_RETENTION_DAYS * 86_400_000).toISOString();
    const old = (await supabaseApi.select('api_request_log', {}, { order: 'at.asc', limit: 500 })) as Array<{ id: string; at: string }>;
    const stale = old.filter((r) => r.at < cutoff);
    if (shadow) return stale.length;
    for (const r of stale) await supabaseApi.remove('api_request_log', { id: r.id });
    return stale.length;
}

// ─── /api/v1/ext/* ───────────────────────────────────────────────────────────

function scopeDenied(res: ServerResponse, correlationId: string, scope: ApiScope): void {
    json(res, 403, { errorCode: 'API_SCOPE_FORBIDDEN', message: `This key lacks the scope ${scope}`, required_scope: scope, correlationId });
}

function queryOf(url: string): URLSearchParams {
    const i = url.indexOf('?');
    return new URLSearchParams(i >= 0 ? url.slice(i + 1) : '');
}

function validSince(raw: string | null): string | null | 'invalid' {
    if (!raw) return null;
    const t = Date.parse(raw);
    return Number.isFinite(t) ? new Date(t).toISOString() : 'invalid';
}

/** Buchungen des Anbieters als Leads — nur nach Offenlegung, nur freigegebene Felder. */
async function loadLeads(providerKey: string): Promise<Json[]> {
    const rows = (await supabaseApi.select('scheduling', { provider_key: providerKey }, { order: 'created_at.desc', limit: 1000 })) as Json[];
    const revealed = rows.filter((b) => b.identity_revealed);
    if (!revealed.length) return [];
    const userIds = [...new Set(revealed.map((b) => b.user_id).filter(Boolean))] as string[];
    const users = (await Promise.all(userIds.map((id) => supabaseApi.select('users', { id }, { limit: 1 }) as Promise<Json[]>))).flat();
    const byId: Record<string, Json> = {}; users.forEach((u) => { byId[u.id] = u; });
    const engagements = (await supabaseApi.select('engagement_requests', { provider_key: providerKey }, { order: 'created_at.desc', limit: 200 })) as Json[];
    const anfrageVon: Record<string, Json> = {};
    for (const e of engagements) if (e.user_id && !anfrageVon[e.user_id]) anfrageVon[e.user_id] = e;
    const ledgerIds = [...new Set(revealed.map((b) => b.lead_ledger_id).filter(Boolean))] as string[];
    const ledger = (await Promise.all(ledgerIds.map((id) => supabaseApi.select('provider_lead_ledger', { id }, { limit: 1 }) as Promise<Json[]>))).flat();
    const ledgerById: Record<string, Json> = {}; ledger.forEach((l) => { ledgerById[l.id] = l; });
    return revealed.map((b) => {
        const anfrage = b.user_id ? anfrageVon[b.user_id] : undefined;
        const company = typeof anfrage?.structured_answers?.company === 'string' ? anfrage.structured_answers.company.trim() : '';
        const l = b.lead_ledger_id ? ledgerById[b.lead_ledger_id] : null;
        const shared = providerSharedView(b, { email: b.user_id && byId[b.user_id] ? byId[b.user_id].email : null, company: company || null });
        return {
            ...b, ...shared,
            category: l?.area_code ?? anfrage?.category ?? null,
            country: (Array.isArray(l?.countries) && l.countries[0]) || anfrage?.country || null,
            attendance_outcome: b.attendance?.outcome ?? null,
        };
    });
}

export async function handleExtRoutes(req: IncomingMessage, res: ServerResponse, correlationId: string, client: ApiClientRow): Promise<boolean> {
    const url = req.url || '';
    const path = url.split('?')[0];
    const q = queryOf(url);
    res.setHeader('x-correlation-id', correlationId);

    if (req.method === 'GET' && path === '/api/v1/ext/me') {
        const [provider] = (await supabaseApi.select('providers', { provider_key: client.provider_key }, { limit: 1 })) as Json[];
        const { planCode } = await apiEligibility(client.provider_key);
        json(res, 200, {
            ok: true,
            client: { id: client.id, name: client.name, scopes: client.scopes ?? [], rate_limit_per_minute: client.rate_limit_per_minute, key_prefix: client.key_prefix ?? null },
            provider: { provider_key: client.provider_key, name: provider?.name ?? null },
            plan_code: planCode, terms_version: client.terms_version ?? API_TERMS_VERSION,
            correlationId,
        });
        return true;
    }

    if (req.method === 'GET' && path === '/api/v1/ext/leads') {
        if (!hasScope(client, 'leads:read')) { scopeDenied(res, correlationId, 'leads:read'); return true; }
        const since = validSince(q.get('since'));
        if (since === 'invalid') { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'since must be an ISO-8601 timestamp', correlationId }); return true; }
        const statusFilter = q.get('status');
        if (statusFilter && !isExtStatus(statusFilter)) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: `status must be one of ${EXT_STATUSES.join(', ')}`, correlationId }); return true; }
        const limit = pageLimit(q.get('limit'));
        try {
            let rows = await loadLeads(client.provider_key);
            if (since) rows = rows.filter((b) => (b.created_at ?? b.slot_start) >= since);
            if (statusFilter) rows = rows.filter((b) => (b.ext_status ?? 'new') === statusFilter);
            rows.sort((a, b) => String(a.created_at ?? a.slot_start).localeCompare(String(b.created_at ?? b.slot_start)));
            const page = rows.slice(0, limit);
            const leads = page.map((b) => serializeLead(b as any)).filter(Boolean);
            const next = rows.length > limit ? (page[page.length - 1].created_at ?? page[page.length - 1].slot_start) : null;
            json(res, 200, { ok: true, leads, next_since: next, correlationId });
        } catch {
            structuredLog('error', 'API leads fetch failed', { correlationId, errorCode: 'ERR_API_LEADS', severity: 'error', route: path });
            json(res, 500, { errorCode: 'INTERNAL', message: 'Leads could not be loaded', correlationId });
        }
        return true;
    }

    const leadPatch = /^\/api\/v1\/ext\/leads\/([0-9a-f-]+)$/.exec(path);
    if (req.method === 'PATCH' && leadPatch) {
        if (!hasScope(client, 'leads:write')) { scopeDenied(res, correlationId, 'leads:write'); return true; }
        const body = await readJson(req);
        if (!isExtStatus(body.status)) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: `status must be one of ${EXT_STATUSES.join(', ')}`, correlationId }); return true; }
        const [b] = (await supabaseApi.select('scheduling', { id: leadPatch[1], provider_key: client.provider_key }, { limit: 1 })) as Json[];
        // Fremde oder noch nicht offengelegte Buchung: 404, nicht 403 — die Antwort verraet nichts.
        if (!b || !b.identity_revealed) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Lead not found', correlationId }); return true; }
        const at = new Date().toISOString();
        await supabaseApi.update('scheduling', { id: b.id }, { ext_status: body.status, ext_status_at: at });
        await supabaseApi.insert('event_log', { type: 'lead_ext_status_set', payload: { bookingId: b.id, providerKey: client.provider_key, clientId: client.id, status: body.status, from: b.ext_status ?? null } });
        json(res, 200, { ok: true, lead: { id: b.id, ext_status: body.status, ext_status_at: at }, correlationId });
        return true;
    }

    if (req.method === 'GET' && path === '/api/v1/ext/events') {
        if (!hasScope(client, 'events:read')) { scopeDenied(res, correlationId, 'events:read'); return true; }
        const since = validSince(q.get('since'));
        if (since === 'invalid') { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'since must be an ISO-8601 timestamp', correlationId }); return true; }
        const limit = pageLimit(q.get('limit'));
        try {
            // Der event_log traegt den Anbieter in der Nutzlast — zwei Schreibweisen.
            const [a, b] = await Promise.all([
                supabaseApi.select('event_log', { 'payload->>providerKey': client.provider_key }, { order: 'timestamp.desc', limit: 2000 }) as Promise<EventLogRow[]>,
                supabaseApi.select('event_log', { 'payload->>provider_key': client.provider_key }, { order: 'timestamp.desc', limit: 2000 }) as Promise<EventLogRow[]>,
            ]);
            const seen = new Set<string>();
            const rows = [...a, ...b].filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return eventBelongsTo(r, client.provider_key); });
            const events = rows.map(mapEventLogRow).filter((e): e is NonNullable<typeof e> => !!e)
                .filter((e) => !since || e.at > since)
                .sort((x, y) => x.at.localeCompare(y.at));
            const page = events.slice(0, limit);
            json(res, 200, { ok: true, events: page, next_since: events.length > limit ? page[page.length - 1].at : null, correlationId });
        } catch {
            structuredLog('error', 'API events fetch failed', { correlationId, errorCode: 'ERR_API_EVENTS', severity: 'error', route: path });
            json(res, 500, { errorCode: 'INTERNAL', message: 'Events could not be loaded', correlationId });
        }
        return true;
    }

    if (req.method === 'GET' && path === '/api/v1/ext/invoices') {
        if (!hasScope(client, 'billing:read')) { scopeDenied(res, correlationId, 'billing:read'); return true; }
        const rows = (await supabaseApi.select('invoices', { provider_key: client.provider_key }, { order: 'period.desc', limit: 24 })) as Json[];
        json(res, 200, {
            ok: true,
            invoices: rows.map((i) => ({ id: i.id, invoice_number: i.invoice_number ?? null, period: i.period, amount_cents: i.amount_cents, currency: i.currency, status: i.status, issued_at: i.issued_at ?? null, due_at: i.due_at ?? null, paid_at: i.paid_at ?? null })),
            correlationId,
        });
        return true;
    }

    if (req.method === 'GET' && path === '/api/v1/ext/credits') {
        if (!hasScope(client, 'billing:read')) { scopeDenied(res, correlationId, 'billing:read'); return true; }
        const rows = (await supabaseApi.select('provider_credits', { provider_key: client.provider_key }, { order: 'created_at.desc', limit: 100 })) as Json[];
        const balance = rows.reduce((s, c) => s + (Number(c.amount_cents) || 0), 0);
        json(res, 200, {
            ok: true, balance_cents: balance, currency: rows[0]?.currency ?? 'USD',
            credits: rows.map((c) => ({ id: c.id, amount_cents: c.amount_cents, currency: c.currency, reason: c.reason, ledger_id: c.ledger_id ?? null, created_at: c.created_at })),
            correlationId,
        });
        return true;
    }

    json(res, 404, { errorCode: 'NOT_FOUND', message: 'No such API route', correlationId });
    return true;
}

// ─── Anbieterseite: /provider/:key/api-access ────────────────────────────────

export async function handleProviderApiAccess(
    req: IncomingMessage, res: ServerResponse, correlationId: string, providerKey: string, userId: string | null,
): Promise<boolean> {
    const path = (req.url || '').split('?')[0];
    const base = `/api/v1/provider/${providerKey}/api-access`;
    if (path !== base && path !== `${base}/key`) return false;
    res.setHeader('x-correlation-id', correlationId);

    try {
        const { eligible, planCode } = await apiEligibility(providerKey);
        const client = await currentClientOf(providerKey);

        if (req.method === 'GET' && path === base) {
            json(res, 200, {
                ok: true, eligible, plan_code: planCode, terms_version: API_TERMS_VERSION,
                requestable_scopes: REQUESTABLE_SCOPES, client: client ? clientView(client) : null, correlationId,
            });
            return true;
        }

        // Alles ab hier aendert etwas — und setzt den Tarif voraus. Essential und
        // Growth sehen die Funktion nicht; wer sie trotzdem aufruft, bekommt eine
        // sachliche 403, kein Upgrade-Angebot.
        if (!eligible) { json(res, 403, { errorCode: 'API_NOT_ELIGIBLE', message: 'The current plan does not include API access', correlationId }); return true; }

        if (req.method === 'POST' && path === base) {
            if (client) { json(res, 409, { errorCode: 'API_CLIENT_EXISTS', message: 'An API access request already exists for this provider', client: clientView(client), correlationId }); return true; }
            const body = await readJson(req);
            const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
            const useCase = typeof body.use_case === 'string' ? body.use_case.trim().slice(0, 2000) : '';
            const contactEmail = typeof body.contact_email === 'string' ? body.contact_email.trim().slice(0, 200) : '';
            const contactName = typeof body.contact_name === 'string' ? body.contact_name.trim().slice(0, 120) : null;
            if (!name || !useCase || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
                json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'name, use_case and a valid contact_email are required', correlationId }); return true;
            }
            if (body.accept_terms !== true) { json(res, 400, { errorCode: 'TERMS_NOT_ACCEPTED', message: `The API terms (${API_TERMS_VERSION}) must be accepted`, correlationId }); return true; }
            const scopes = validateScopes(body.requested_scopes, REQUESTABLE_SCOPES);
            if (!scopes.ok) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: scopes.reason, correlationId }); return true; }
            const [row] = (await supabaseApi.insert('api_clients', {
                provider_key: providerKey, name, status: 'requested', use_case: useCase, contact_name: contactName, contact_email: contactEmail,
                requested_scopes: scopes.scopes, scopes: null, rate_limit_per_minute: 120, terms_version: API_TERMS_VERSION, created_by: userId, created_at: new Date().toISOString(),
            })) as ApiClientRow[];
            await supabaseApi.insert('event_log', { type: 'api_access_requested', actor_id: userId, payload: { providerKey, clientId: row.id, requestedScopes: scopes.scopes } });
            await supabaseApi.insert('event_log', { type: 'admin_alert', payload: { kind: 'api_access_requested', providerKey, clientId: row.id } });
            json(res, 201, { ok: true, client: clientView(row), correlationId });
            return true;
        }

        if (req.method === 'POST' && path === `${base}/key`) {
            if (!client || (client.status !== 'approved' && client.status !== 'active')) {
                json(res, 409, { errorCode: 'API_CLIENT_NOT_APPROVED', message: 'A key can be created once the team has approved the request', correlationId }); return true;
            }
            const fresh = generateApiKey();
            const now = new Date();
            const rotating = client.status === 'active' && !!client.key_hash;
            const patch: Json = { key_hash: fresh.hash, key_prefix: fresh.prefix, key_created_at: now.toISOString(), status: 'active', updated_at: now.toISOString() };
            if (rotating) {
                // Der alte Schluessel gilt 24 h weiter — Integrationen koennen umstellen, ohne auszufallen.
                patch.previous_key_hash = client.key_hash;
                patch.previous_key_valid_until = new Date(now.getTime() + KEY_OVERLAP_MS).toISOString();
            } else {
                patch.previous_key_hash = null; patch.previous_key_valid_until = null;
            }
            await supabaseApi.update('api_clients', { id: client.id }, patch);
            await supabaseApi.insert('event_log', { type: rotating ? 'api_key_rotated' : 'api_key_issued', actor_id: userId, payload: { providerKey, clientId: client.id, keyPrefix: fresh.prefix } });
            json(res, 201, {
                ok: true,
                // Einmal im Klartext — danach nur noch der Praefix. Gespeichert ist allein der Hash.
                key: fresh.key, shown_once: true,
                previous_key_valid_until: patch.previous_key_valid_until ?? null,
                client: clientView({ ...client, ...patch } as ApiClientRow), correlationId,
            });
            return true;
        }

        if (req.method === 'DELETE' && path === base) {
            if (!client) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'No API access to revoke', correlationId }); return true; }
            const now = new Date().toISOString();
            const patch = { status: 'revoked', revoked_at: now, revoked_by: 'provider', key_hash: null, previous_key_hash: null, previous_key_valid_until: null, updated_at: now };
            await supabaseApi.update('api_clients', { id: client.id }, patch);
            await supabaseApi.insert('event_log', { type: 'api_access_revoked', actor_id: userId, payload: { providerKey, clientId: client.id, by: 'provider' } });
            json(res, 200, { ok: true, client: clientView({ ...client, ...patch } as ApiClientRow), correlationId });
            return true;
        }

        json(res, 405, { errorCode: 'METHOD_NOT_ALLOWED', message: 'Method not allowed', correlationId });
        return true;
    } catch {
        structuredLog('error', 'Provider API access failed', { correlationId, errorCode: 'ERR_API_ACCESS', severity: 'error', route: path });
        json(res, 500, { errorCode: 'INTERNAL', message: 'API access request failed', correlationId });
        return true;
    }
}

// ─── Adminseite: /admin/api-access, /admin/api-clients/:id ───────────────────

export async function handleAdminApiAccess(req: IncomingMessage, res: ServerResponse, correlationId: string, actorId: string | null): Promise<boolean> {
    const url = req.url || '';
    const path = url.split('?')[0];
    const detail = /^\/api\/v1\/admin\/api-clients\/([0-9a-f-]+)$/.exec(path);
    if (!(req.method === 'GET' && path === '/api/v1/admin/api-access') && !(req.method === 'PATCH' && detail)) return false;
    res.setHeader('x-correlation-id', correlationId);

    try {
        if (req.method === 'GET') {
            const status = queryOf(url).get('status');
            const rows = (await supabaseApi.select('api_clients', status ? { status } : {}, { order: 'created_at.desc', limit: 200 })) as ApiClientRow[];
            const providers = (await supabaseApi.select('providers', {}, { limit: 1000 })) as Json[];
            const nameOf: Record<string, string> = {}; providers.forEach((p) => { nameOf[p.provider_key] = p.name; });
            const plans = await Promise.all([...new Set(rows.map((c) => c.provider_key))].map(async (k) => [k, await apiEligibility(k)] as const));
            const planOf = Object.fromEntries(plans);
            json(res, 200, {
                ok: true,
                clients: rows.map((c) => ({
                    ...clientView(c), provider_key: c.provider_key, provider_name: nameOf[c.provider_key] ?? null,
                    plan_code: planOf[c.provider_key]?.planCode ?? null, eligible: planOf[c.provider_key]?.eligible ?? false,
                    fee_note: c.fee_note ?? null, approved_by: c.approved_by ?? null, last_used_ip: c.last_used_ip ?? null,
                })),
                correlationId,
            });
            return true;
        }

        const [client] = (await supabaseApi.select('api_clients', { id: detail![1] }, { limit: 1 })) as ApiClientRow[];
        if (!client) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'API client not found', correlationId }); return true; }
        const body = await readJson(req);
        const now = new Date().toISOString();
        const note = typeof body.decision_note === 'string' ? body.decision_note.trim().slice(0, 2000) : undefined;
        const feeNote = typeof body.fee_note === 'string' ? body.fee_note.trim().slice(0, 500) : undefined;
        const patch: Json = { updated_at: now };
        if (note !== undefined) patch.decision_note = note;
        if (feeNote !== undefined) patch.fee_note = feeNote;
        let eventType = 'api_client_updated';
        const members = await membersOf(client.provider_key);
        const tell = (type: 'api_access_decided' | 'api_access_suspended', label: string) => {
            void (async () => { for (const m of members) await notify({ to: m, actor: actorId, type, subject: 'provider', subjectId: client.provider_key, payload: { providerKey: client.provider_key, label } }); })();
        };

        switch (body.action) {
            case 'approve': {
                if (client.status !== 'requested') { json(res, 409, { errorCode: 'INVALID_STATE', message: `Cannot approve a client in state ${client.status}`, correlationId }); return true; }
                const scopes = validateScopes(body.scopes ?? client.requested_scopes ?? [], API_SCOPES);
                if (!scopes.ok) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: scopes.reason, correlationId }); return true; }
                const limit = body.rate_limit_per_minute === undefined || body.rate_limit_per_minute === null ? (client.rate_limit_per_minute ?? 120) : Number(body.rate_limit_per_minute);
                if (!Number.isInteger(limit) || limit < 1 || limit > 10000) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'rate_limit_per_minute must be an integer between 1 and 10000', correlationId }); return true; }
                Object.assign(patch, { status: 'approved', scopes: scopes.scopes, rate_limit_per_minute: limit, approved_by: actorId, approved_at: now });
                eventType = 'api_access_approved';
                tell('api_access_decided', 'approved');
                break;
            }
            case 'reject':
                if (client.status !== 'requested') { json(res, 409, { errorCode: 'INVALID_STATE', message: `Cannot reject a client in state ${client.status}`, correlationId }); return true; }
                if (!note) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'decision_note is required — the provider sees why', correlationId }); return true; }
                Object.assign(patch, { status: 'rejected' });
                eventType = 'api_access_rejected';
                tell('api_access_decided', 'rejected');
                break;
            case 'suspend': {
                const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
                if (!reason) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'reason is required — the provider sees it', correlationId }); return true; }
                if (client.status !== 'active' && client.status !== 'approved') { json(res, 409, { errorCode: 'INVALID_STATE', message: `Cannot suspend a client in state ${client.status}`, correlationId }); return true; }
                Object.assign(patch, { status: 'suspended', suspended_at: now, suspended_reason: reason });
                eventType = 'api_access_suspended';
                tell('api_access_suspended', reason);
                break;
            }
            case 'reinstate':
                if (client.status !== 'suspended') { json(res, 409, { errorCode: 'INVALID_STATE', message: 'Only a suspended client can be reinstated', correlationId }); return true; }
                Object.assign(patch, { status: client.key_hash ? 'active' : 'approved', suspended_at: null, suspended_reason: null });
                eventType = 'api_access_reinstated';
                break;
            case 'revoke':
                if (client.status === 'revoked' || client.status === 'rejected') { json(res, 409, { errorCode: 'INVALID_STATE', message: 'Client is already closed', correlationId }); return true; }
                Object.assign(patch, { status: 'revoked', revoked_at: now, revoked_by: 'admin', key_hash: null, previous_key_hash: null, previous_key_valid_until: null });
                eventType = 'api_access_revoked';
                break;
            case 'update': {
                if (client.status !== 'approved' && client.status !== 'active') { json(res, 409, { errorCode: 'INVALID_STATE', message: 'Only an approved or active client can be updated', correlationId }); return true; }
                if (body.scopes !== undefined) {
                    const scopes = validateScopes(body.scopes, API_SCOPES);
                    if (!scopes.ok) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: scopes.reason, correlationId }); return true; }
                    patch.scopes = scopes.scopes;
                }
                if (body.rate_limit_per_minute !== undefined) {
                    const limit = Number(body.rate_limit_per_minute);
                    if (!Number.isInteger(limit) || limit < 1 || limit > 10000) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'rate_limit_per_minute must be an integer between 1 and 10000', correlationId }); return true; }
                    patch.rate_limit_per_minute = limit;
                }
                break;
            }
            default:
                json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'action must be approve, reject, suspend, reinstate, revoke or update', correlationId });
                return true;
        }

        await supabaseApi.update('api_clients', { id: client.id }, patch);
        await supabaseApi.insert('event_log', { type: eventType, actor_id: actorId, payload: { providerKey: client.provider_key, clientId: client.id, action: body.action, scopes: patch.scopes ?? undefined, rateLimit: patch.rate_limit_per_minute ?? undefined } });
        json(res, 200, { ok: true, client: { ...clientView({ ...client, ...patch } as ApiClientRow), provider_key: client.provider_key, fee_note: patch.fee_note ?? client.fee_note ?? null }, correlationId });
        return true;
    } catch {
        structuredLog('error', 'Admin API access failed', { correlationId, errorCode: 'ERR_ADMIN_API_ACCESS', severity: 'error', route: path });
        json(res, 500, { errorCode: 'INTERNAL', message: 'API client update failed', correlationId });
        return true;
    }
}
