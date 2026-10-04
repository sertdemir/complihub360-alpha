import { createServer, IncomingMessage, ServerResponse } from "http";
import * as crypto from "node:crypto";
import { Orchestrator } from "@complihub/task-orchestrator";
import { createDefaultRegistry } from "@complihub/agent-registry";
import { DefaultPolicyEngine } from "@complihub/policy-engine";
import { createTaskContext, ComplianceCheckRequest, type TaskContext, normalizeCorrelationId, structuredLog, type AnalyticsEvent } from "@complihub360/types";
import { generateRelevantSubdomains, isKnownCountry, type CountryCode, type IndustryType, type BusinessModel, type EnrichedSubdomain } from "@complihub/compliance-engine";

import { supabaseApi } from "./supabase.js";
import { verifySupabaseJwt } from "./supabaseJwt.js";
import { sendMagicLinkMail, sendEmailChangeMail, sendRescheduleMail, sendCancellationMail, sendBookingMail } from "./mailer.js";
import { handleAssistantChat, handleAssistantCheckout, handleAssistantVerify } from "./assistant.js";
import { handleDomain } from "./domain.js";
import { handleAuthAdopt } from "./adoption.js";
import { handleDashboard, SLUG_TO_ENGINE } from "./dashboard.js";
import { checkMarketRequest } from "./marketRequests.js";
import { notify, handleNotificationsList, handleNotificationsRead } from "./notifications.js";
import { handleBillingRun, handleBillingPreview, syncOpenInvoices, loadPricingConfig, getActiveSubscription, getDiscountCounter, cycleStartFor, quoteLeadFee, resolveLedgerStatus } from "./billing.js";
import { SHARED_FIELDS_V1, currentAcknowledgement, deriveOpportunity, priceSnapshotFrom, chargeLeadFee, recordPaymentFailure, syncBillingReadiness } from "./leadCharge.js";
import { ensureStripeCustomer, isStripeConfigured, stripeRequest, getCustomerBilling, refundPaymentIntent, StripeError } from "./stripe.js";
import { checkVatId } from "./vies.js";
import { startSlaWatchers, runWatcherTick, issueReminder } from "./watchers.js";
import { buildCockpit } from "./cockpit.js";
import { ownProviderRouteKey, canAccessProvider, handleMeProvider, handleAdminLinkMember } from "./providerAuth.js";
import { handleProviderApplication } from "./providerApplication.js";
import { handleSubscriptionGet, handleSubscriptionSelect, handleAdminSubscription } from "./subscriptions.js";
import { handleProviderReview } from "./providerReview.js";
import { bookingAffected, pausedAreasByProvider, requestOf } from "./changeImpact.js";
import { redactText } from "@complihub360/redaction";
import {
    loadVisibility, maskIdentity, publicTitle, rankBasis, requiredFor, scanFields, serializeProvider, verificationDepth,
    type IdentityContext, type RegisterRow,
} from "./anonymity.js";

// P0 #1: shared magic-link verification — SHA-256 hash lookup, engagement +
// action match, expiry, single-use (burned before the state mutation).
async function verifyAndBurnMagicToken(engagementId: string, action: 'confirm' | 'reply' | 'decline', rawToken: string): Promise<boolean> {
    if (!rawToken || typeof rawToken !== 'string') return false;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const rows = (await supabaseApi.select('magic_link_tokens', { token_hash: tokenHash, engagement_id: engagementId, action }, { limit: 1 })) as
        Array<{ id: string; expires_at: string; used_at: string | null }>;
    const row = rows[0];
    if (!row || row.used_at !== null || new Date(row.expires_at).getTime() < Date.now()) return false;
    await supabaseApi.update('magic_link_tokens', { id: row.id }, { used_at: new Date().toISOString() });
    return true;
}

// Security Hardening: Rate limiting state
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();
// Per env ueberschreibbar, damit die In-Process-Tests (alle von 127.0.0.1)
// nicht ab dem hundertsten Request an ihrem eigenen Limit scheitern.
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 100;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Start Background Critical Flow Monitor
// startCriticalFlowMonitor(eventStore, alertStore); // Disabled for now as stores are in DB

// 1. Setup Dependencies
const registry = createDefaultRegistry();
// Create an empty policy store; DefaultPolicyEngine will DENY everything if strict, 
// wait, we need a policy for "default-tenant" or otherwise DefaultPolicyEngine returns "No policy configured"
const policyStore = new Map();
policyStore.set("default-tenant", {
    // allow all agents & capabilities by not restricting them,
    // compliance rule will trigger if high severity & public context
});

const policyEngine = new DefaultPolicyEngine(policyStore);
const orchestrator = new Orchestrator(registry, {}, policyEngine);

// Register the agent executable

// ─── Anonymes Matching (Phase 3, ADR-0004) ───────────────────────────────────
//
// Alles, was ein Nutzer ueber einen Anbieter sieht, laeuft ab hier ueber
// `public_ref` (opak, zufaellig) statt `provider_key` (aus dem Firmennamen).
// Die alten Pfade /provider/:key/(detail|slots|reviews|website) antworten
// 404: sie liegen ausserhalb des Ownership-Guards und waeren sonst ein
// Rueckkanal vom Ref zum Namen.

const PUBLIC_REF_RX = /^[0-9a-f]{12}$/;

async function resolveRef(ref: string): Promise<any | null> {
    if (!PUBLIC_REF_RX.test(ref)) return null;
    const rows = (await supabaseApi.select('providers', { public_ref: ref }, { limit: 1 })) as any[];
    return rows[0] ?? null;
}

/** public_ref zu einem Schluessel — fuer Nachrichten an Nutzer, die nur den Ref kennen duerfen. */
async function refOf(providerKey: string | null | undefined): Promise<string | undefined> {
    if (!providerKey) return undefined;
    const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
    return rows[0]?.public_ref ?? undefined;
}

const visibilityRegister = () => loadVisibility(
    async () => (await supabaseApi.select('provider_field_visibility', {}, { limit: 500 })) as RegisterRow[],
);

/** Ist der Anbieter matchbar (mindestens eine Zeile in der View)? Sichtbarkeit entscheidet die UND-Kette, nie partner_status. */
async function matchableRows(providerKey: string): Promise<any[]> {
    return (await supabaseApi.select('matchable_provider_services', { provider_key: providerKey }, { limit: 500 })) as any[];
}

const identityCtx = (p: any): IdentityContext => ({ providerName: p?.name ?? null, website: p?.website_url ?? null });

/** Freitexte eines Dossiers maskiert — das Netz beim Lesen; Schreiben wird
 *  blockiert. Laeuft durch verschachtelte Strukturen (services als
 *  [{title, includes[]}], credentials als [{label, note}], pricing_table),
 *  damit kein Objektfeld am Netz vorbeikommt. */
function deepMask(v: unknown, ctx: IdentityContext): unknown {
    if (typeof v === 'string') return maskIdentity(v, ctx);
    if (Array.isArray(v)) return v.map((x) => deepMask(x, ctx));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, deepMask(x, ctx)]));
    return v ?? null;
}
function maskDossier(p: any) {
    const ctx = identityCtx(p);
    return {
        services: deepMask(p.services, ctx),
        credentials: deepMask(p.credentials, ctx),
        excluded_services: deepMask(p.excluded_services, ctx),
        work_mode: deepMask(p.work_mode, ctx),
        region: deepMask(p.region, ctx),
        pricing_table: deepMask(p.pricing_table, ctx),
    };
}

/** Freigegebene Bereichs- und Leistungsnamen eines Anbieters aus der View. */
function approvedNamesOf(rows: any[]): { areas: string[]; services: string[] } {
    const areas = new Set<string>(); const services = new Set<string>();
    for (const r of rows) { if (r.area_code) areas.add(r.area_code); if (r.service_name) services.add(r.service_name); }
    return { areas: [...areas], services: [...services].sort() };
}

/** Bereichsname aus der Taxonomie; faellt auf den Code zurueck. */
async function areaLabels(codes: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (!codes.length) return out;
    const cats = (await supabaseApi.select('service_categories', {}, { limit: 500 })) as any[];
    for (const c of cats) if (c.parent_code == null && c.code) out.set(c.code, c.label_en ?? c.code);
    for (const code of codes) if (!out.has(code)) out.set(code, code);
    return out;
}

/** Pflichtnachweise und Verifikationstiefe aus View-Zeilen und Nachweisen. */
function depthFor(viewRows: any[], evidence: any[]) {
    const services = [...new Map(viewRows.map((r) => [r.service_id, { id: r.service_id, service_code: r.service_code, status: 'approved' }])).values()];
    const coverage = viewRows.map((r) => ({ service_id: r.service_id, country_code: r.country_code, status: 'approved' }));
    const required = requiredFor(services, coverage);
    const usable = evidence.filter((e) => e.source === 'registry_check' || e.upload_confirmed);
    return { required, usable, depth: verificationDepth(required, usable) };
}

/** Die 422-Antwort, wenn ein Freitext Identitaet traegt — nennt Feld, Typ und Fundstelle. */
function identityRejection(res: ServerResponse, correlationId: string, findings: Array<{ field: string; type: string; match: string; index: number }>) {
    res.writeHead(422, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        errorCode: 'IDENTITY_IN_TEXT',
        message: 'Please keep these texts free of names, domains and registration numbers — they stay anonymous until booking.',
        findings, correlationId,
    }));
}

import { complianceCheckAgent } from "@complihub/agent-core";
import type { AgentId } from "@complihub/agent-core";

orchestrator.registerExecutable({
    id: "compliance-check-agent" as AgentId,
    execute: async (context: TaskContext) => {
        // Bridge the input/output manually
        const input = { title: "Compliance Check", payload: context.payload as Record<string, unknown> };
        const res = await complianceCheckAgent.run(input, { correlationId: context.correlationId });
        if (res.status === "failed") {
            return { ok: false, durationMs: 0, agentId: "compliance-check-agent" as AgentId, error: { name: "AgentRunError", message: res.error?.message || "unknown" } };
        }
        return { ok: true, durationMs: 0, agentId: "compliance-check-agent" as AgentId, data: res.data };
    }
});

// 2. HTTP Server
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // 2.a Strict Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // 2.b Strict CORS
    const origin = req.headers.origin || '';
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());

    // We only set Allow-Origin if it matches the configured allowed list, or in dev/fallback mode
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV !== 'production') {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PATCH, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-correlation-id, Authorization, x-api-key');
    // Ohne Expose bleibt der Antwort-Header fuer den Browser unsichtbar, sobald
    // UI und API auf verschiedenen Origins liegen (Staging).
    res.setHeader('Access-Control-Expose-Headers', 'x-correlation-id');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const correlationId = normalizeCorrelationId(req.headers['x-correlation-id']);

    // Caller identity from a valid Supabase JWT (phase ③ subscription gate).
    let authUserId: string | null = null;
    let authEmail: string | null = null;
    // True only for the server-to-server API key — gates admin-only routes.
    let authViaApiKey = false;
    // True when the verified JWT carries the app-level admin role (app_metadata
    // wins over user_metadata, mirroring the frontend's roleFromUser()).
    let authIsAdmin = false;

    // Public routes (audit P1 #4): guest-usable by DESIGN — the funnel runs
    // pre-registration (spec v2 §3: wizard → risk map before the gate), and
    // the provider routes carry their own single-use token / intake secret as
    // the credential. Everything else requires a user JWT or the server key;
    // the frontend bundle no longer ships a shared x-api-key. A JWT that IS
    // sent on a public route is still verified and attaches identity.
    const PUBLIC_ROUTES: Array<[string, RegExp]> = [
        ['POST', /^\/api\/v1\/search$/],                   // guest risk map
        ['POST', /^\/api\/v1\/session$/],                  // guest wizard-session save (guest_key)
        ['POST', /^\/api\/v1\/market-requests$/],          // „Request This Market“ (guest_key or JWT)
        ['GET', /^\/api\/v1\/acknowledgement(\?|$)/],       // booking acknowledgement text (public legal copy)
        ['GET', /^\/api\/v1\/sessions(\?|$)/],             // guest session list (guest_key = bearer)
        ['POST', /^\/api\/v1\/provider\/intake$/],         // intake token checked in-handler
        ['GET', /^\/api\/v1\/provider\/magic\//],          // single-use token IS the credential
        ['POST', /^\/api\/v1\/provider\/confirm$/],
        ['POST', /^\/api\/v1\/provider\/confirm-email$/],
    ];
    const isPublicRoute = PUBLIC_ROUTES.some(([m, rx]) => req.method === m && rx.test(req.url || ''));

    // 2.c Native Supabase JWT Authentication (Skip for /health and /ready)
    if (req.url !== '/health' && req.url !== '/ready') {
        let isAuthenticated = false;
        const authHeader = req.headers['authorization'];
        const devKey = req.headers['x-api-key'];

        // 1. Verify the Supabase access token (HS256 secret or ES256 signing
        //    key via JWKS — supabaseJwt.ts): signature there, exp/nbf/role here.
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = await verifySupabaseJwt(token);
            if (payload) {
                const nowSec = Math.floor(Date.now() / 1000);
                const notExpired = typeof payload.exp !== 'number' || payload.exp > nowSec;
                const active = typeof payload.nbf !== 'number' || payload.nbf <= nowSec;
                const role = typeof payload.role === 'string' ? payload.role : '';
                // Reject the public anon key (role 'anon'): it ships to browsers and is
                // NOT a per-user credential. Only real, unexpired user/service tokens pass.
                if (notExpired && active && role && role !== 'anon') {
                    isAuthenticated = true;
                    if (typeof payload.sub === 'string') authUserId = payload.sub;
                    if (typeof payload.email === 'string') authEmail = payload.email;
                    // App-level role lives in app_metadata.role (authoritative),
                    // user_metadata.role as fallback — same precedence as the FE.
                    const appRole = (payload.app_metadata && typeof payload.app_metadata.role === 'string' ? payload.app_metadata.role : undefined)
                        ?? (payload.user_metadata && typeof payload.user_metadata.role === 'string' ? payload.user_metadata.role : undefined);
                    if (appRole === 'admin') authIsAdmin = true;
                }
            }
        }

        // 2. Fallback to API_KEY if JWT not provided or invalid (for server-to-server internal admin)
        const expectedApiKey = process.env.API_KEY;
        if (!isAuthenticated && expectedApiKey && devKey === expectedApiKey) {
            isAuthenticated = true;
            authViaApiKey = true;
        }

        if (!isAuthenticated && !isPublicRoute) {
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                errorCode: 'UNAUTHORIZED',
                message: 'Missing or invalid Supabase JWT or API Key',
                correlationId
            }));
            return;
        }
    }

    // 2.d Security Hardening: Production Rate Limiting
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : (req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const limitStats = ipRateLimits.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

    if (now > limitStats.resetAt) {
        limitStats.count = 0;
        limitStats.resetAt = now + RATE_LIMIT_WINDOW_MS;
    }

    limitStats.count++;
    ipRateLimits.set(ip, limitStats);

    if (limitStats.count > RATE_LIMIT_MAX) {
        res.setHeader('x-correlation-id', correlationId);
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            errorCode: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            correlationId
        }));
        return;
    }

    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: "up", ok: true, version: "0.1.0" }));
        return;
    }

    if (req.method === 'GET' && req.url === '/ready') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: "ready" }));
        return;
    }

    // Ownership: Anbieter-eigene Routen nur fuer Mitglieder (providerAuth.ts).
    // Einmal hier statt in jedem Handler — eine neue Route unter dem Pfad ist
    // damit von Anfang an geschuetzt. 404 statt 403 fuer Fremde, damit die
    // Antwort nicht verraet, welche Anbieter-Schluessel es gibt.
    const ownKey = ownProviderRouteKey(req.url);
    if (ownKey) {
        const allowed = await canAccessProvider(
            { userId: authUserId, isAdmin: authIsAdmin, viaApiKey: authViaApiKey }, ownKey,
        ).catch(() => false);
        if (!allowed) {
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
            return;
        }
    }

    if (req.method === 'GET' && req.url === '/api/v1/me/provider') {
        await handleMeProvider(res, correlationId, authUserId);
        return;
    }

    const linkMatch = /^\/api\/v1\/admin\/provider\/([a-z0-9-]+)\/member$/.exec(req.url || '');
    if (req.method === 'POST' && linkMatch) {
        await handleAdminLinkMember(req, res, correlationId,
            { userId: authUserId, isAdmin: authIsAdmin, viaApiKey: authViaApiKey }, linkMatch[1]);
        return;
    }

    // Phase 2 — Onboarding (Anbieterseite, hinter dem Guard oben) und
    // Review-Arbeitsplatz (Admin). Beide Module sagen selbst, ob die URL
    // ihnen gehoert; sonst laeuft die Kette unten weiter.
    const caller = { userId: authUserId, isAdmin: authIsAdmin, viaApiKey: authViaApiKey };
    const forwardedIp = typeof req.headers['x-forwarded-for'] === 'string'
        ? (req.headers['x-forwarded-for'] as string).split(',')[0].trim() : (req.socket.remoteAddress || 'unknown');
    if (await handleProviderApplication(req, res, correlationId, caller, forwardedIp)) return;
    if (await handleProviderReview(req, res, correlationId, caller)) return;

    if (req.method === 'POST' && req.url === '/api/compliance/check') {
        const startTime = Date.now();

        // 2.e Reduce Payload Limit
        const MAX_PAYLOAD_SIZE = 100 * 1024; // 100KB
        let payloadSize = 0;
        let isTooLarge = false;
        let body = '';

        req.on('data', (chunk: any) => {
            if (isTooLarge) return;
            payloadSize += chunk.length;
            if (payloadSize > MAX_PAYLOAD_SIZE) {
                isTooLarge = true;
                req.destroy();
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'PAYLOAD_TOO_LARGE', message: 'Payload exceeds 100KB limit', correlationId }));
                return;
            }
            body += chunk.toString();
        });

        req.on('end', async () => {
            if (isTooLarge) return;
            structuredLog('info', 'Incoming compliance check request', { correlationId, route: req.url, method: req.method });

            let requestData: ComplianceCheckRequest;
            try {
                // 2.f Handle JSON Parsing errors explicitly
                requestData = JSON.parse(body);
            } catch {
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INVALID_JSON', message: 'Invalid JSON payload', correlationId }));
                return;
            }

            try {
                // Security Hardening: Request Validation and Explicit Destructuring
                if (!requestData.tenantId || typeof requestData.tenantId !== 'string' || requestData.tenantId.trim() === '') {
                    res.setHeader('x-correlation-id', correlationId);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'tenantId is required and must be a non-empty string', correlationId }));
                    return;
                }

                if (!requestData.text || typeof requestData.text !== 'string' || requestData.text.trim() === '') {
                    res.setHeader('x-correlation-id', correlationId);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'text is required and must be a non-empty string', correlationId }));
                    return;
                }

                if (requestData.tags !== undefined && (!Array.isArray(requestData.tags) || requestData.tags.some((t: any) => typeof t !== 'string'))) {
                    res.setHeader('x-correlation-id', correlationId);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'tags must be an array of strings', correlationId }));
                    return;
                }

                // Discard unwanted properties to prevent prototype pollution / mass assignment
                const cleanRequestData: ComplianceCheckRequest = {
                    tenantId: requestData.tenantId,
                    appId: requestData.appId || "vs1-demo",
                    tags: requestData.tags,
                    text: requestData.text
                };

                const fallbackCtx = createTaskContext({
                    tenantId: cleanRequestData.tenantId,
                    appId: cleanRequestData.appId,
                    correlationId
                });

                const responseData = await orchestrator.runComplianceCheck(cleanRequestData, fallbackCtx);

                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(responseData));
                structuredLog('info', 'Compliance check request completed', { correlationId, route: req.url, status: 200, latencyMs: Date.now() - startTime });
            } catch (err) {
                const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : (err instanceof Error ? err.message : String(err));
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    errorCode: 'ERR_COMPLIANCE_API',
                    message,
                    correlationId
                }));
                structuredLog('error', 'Compliance check request failed', {
                    correlationId,
                    route: req.url,
                    status: 400,
                    errorCode: 'ERR_COMPLIANCE_API',
                    severity: 'error',
                    stack: err instanceof Error ? err.stack : undefined,
                    error: err instanceof Error ? err.message : String(err)
                });
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/events') {
        const MAX_PAYLOAD_SIZE = 100 * 1024; // 100KB
        let payloadSize = 0;
        let isTooLarge = false;
        let body = '';

        req.on('data', (chunk: any) => {
            if (isTooLarge) return;
            payloadSize += chunk.length;
            if (payloadSize > MAX_PAYLOAD_SIZE) {
                isTooLarge = true;
                req.destroy();
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'PAYLOAD_TOO_LARGE', message: 'Payload exceeds 100KB limit', correlationId }));
                return;
            }
            body += chunk.toString();
        });

        req.on('end', async () => {
            if (isTooLarge) return;

            let eventData: AnalyticsEvent;
            try {
                eventData = JSON.parse(body);
            } catch {
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INVALID_JSON', message: 'Invalid JSON payload', correlationId }));
                return;
            }

            try {
                // Add server receive timestamp if client clock is missing/trusted less
                const recordedEvent = {
                    ...eventData,
                    timestamp: new Date().toISOString()
                };

                await supabaseApi.insert('event_log', {
                    type: recordedEvent.eventName,
                    actor_id: null,
                    payload: recordedEvent
                });

                structuredLog('info', 'Analytics Event Processed', {
                    correlationId,
                    eventId: recordedEvent.eventId,
                    eventName: recordedEvent.eventName
                });

                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(202, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, id: recordedEvent.eventId }));
            } catch {
                const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : 'Invalid event payload';
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    errorCode: 'ERR_INGESTION_PAYLOAD',
                    message,
                    correlationId
                }));
                structuredLog('error', 'Analytics event ingestion failed', {
                    correlationId,
                    errorCode: 'ERR_INGESTION_PAYLOAD',
                    severity: 'warn',
                    route: req.url
                });
            }
        });
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/requests')) {
        // Anfragen des AUFRUFERS (newest first, capped at 50).
        //
        // Bis 2026-08-31 stand hier ein leerer Filter: jedes angemeldete Konto
        // bekam alle Anfragen aller Nutzer — samt requester_email, Firmenname
        // und Freitext in structured_answers. Derselbe Befund wie beim alten
        // /notifications-Feed, eine Etage tiefer. Der Server-Schluessel sieht
        // weiterhin alles (Betriebs-/Admin-Sicht); der Anbieter-Arbeitsbereich
        // faellt damit auf seine Fixture zurueck, bis Anbieter an einem Konto
        // haengen — wie bei der Glocke, und ehrlicher als fremde Vorgaenge.
        try {
            const rows = await supabaseApi.select(
                'engagement_requests',
                authViaApiKey ? {} : { user_id: authUserId as string },
                { order: 'created_at.desc', limit: 50 },
            );
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, requests: rows }));
        } catch {
            structuredLog('error', 'Requests list failed', { correlationId, errorCode: 'ERR_REQUESTS_LIST', severity: 'error', route: req.url });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to load requests', correlationId }));
        }
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/metrics')) {
        // Provider performance KPIs computed from engagement_requests. Transition
        // timestamps don't exist yet (only created_at/updated_at), so the time
        // averages are approximations until per-transition events land.
        try {
            const rows = (await supabaseApi.select('engagement_requests', {}, { order: 'created_at.desc', limit: 500 })) as
                Array<{ status: string; created_at: string; updated_at?: string; sla_confirm_deadline?: string }>;
            const total = rows.length;
            const confirmed = rows.filter(r => r.status === 'confirmed' || r.status === 'replied').length;
            const replied = rows.filter(r => r.status === 'replied').length;
            const expired = rows.filter(r => r.status === 'expired').length;
            const avgMs = (subset: typeof rows) => {
                const ds = subset
                    .filter(r => r.updated_at)
                    .map(r => new Date(r.updated_at as string).getTime() - new Date(r.created_at).getTime())
                    .filter(d => d > 0);
                return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null;
            };
            const metrics = {
                total,
                confirm_rate: total ? confirmed / total : null,
                reply_rate: confirmed ? replied / confirmed : null,
                sla_breach_rate: total ? expired / total : null,
                avg_confirm_ms: avgMs(rows.filter(r => r.status === 'confirmed' || r.status === 'replied')),
                avg_reply_ms: avgMs(rows.filter(r => r.status === 'replied')),
            };
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, metrics }));
        } catch {
            structuredLog('error', 'Metrics failed', { correlationId, errorCode: 'ERR_METRICS', severity: 'error', route: req.url });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to compute metrics', correlationId }));
        }
    } else if (req.method === 'POST' && req.url === '/api/v1/notifications/read') {
        // Gelesen-Markieren: eine Zeile (`id`) oder alle offenen (`all`).
        let readBody = '';
        req.on('data', (chunk: any) => readBody += chunk.toString());
        req.on('end', async () => {
            let parsed: { id?: string; all?: boolean } = {};
            try { parsed = readBody ? JSON.parse(readBody) : {}; } catch { parsed = {}; }
            await handleNotificationsRead(res, correlationId, authUserId, parsed);
        });
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/notifications')) {
        // Benachrichtigungen des ANGEMELDETEN Kontos aus `notifications`.
        //
        // Bis 2026-08-31 stand hier `select('event_log', {})` — ein leerer
        // Filter auf das Betriebsprotokoll. Jedes angemeldete Konto bekam
        // damit alle Zeilen aller Nutzer, samt der Mailadressen in den
        // `email_sent`-Nutzlasten. Eine Einschraenkung war nicht nachtraeglich
        // moeglich: `actor_id` wird an keiner Schreibstelle gesetzt, das
        // Protokoll weiss schlicht nicht, wen eine Zeile angeht. Deshalb die
        // eigene Tabelle (notifications.ts, Migration 20260831000000).
        //
        // Das Protokoll selbst bleibt lesbar — unter /api/v1/admin/events,
        // wo es hingehoert.
        await handleNotificationsList(res, correlationId, authUserId);
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/admin/events')) {
        // Das Betriebsprotokoll, neueste zuerst. Frueher /api/v1/notifications;
        // hier ist es das, was es immer war — eine Betriebssicht, keine
        // Nutzer-Post. `timestamp` heisst in der Antwort `created_at`, weil die
        // Frontend-Mapper das erwarten.
        res.setHeader('x-correlation-id', correlationId);
        if (!authViaApiKey && !authIsAdmin) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'FORBIDDEN', message: 'Event log is admin-only', correlationId }));
        } else {
            try {
                const rows = (await supabaseApi.select('event_log', {}, { order: 'timestamp.desc', limit: 50 })) as
                    Array<{ timestamp?: string; created_at?: string }>;
                const events = rows.map(r => ({ ...r, created_at: r.created_at || r.timestamp }));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, events }));
            } catch {
                structuredLog('error', 'Event log list failed', { correlationId, errorCode: 'ERR_EVENTS', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to load events', correlationId }));
            }
        }
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/reads')) {
        // C1: read-state watermark for a viewer key. Unread = newer than this.
        try {
            const u = new URL(req.url, 'http://localhost');
            const viewer = u.searchParams.get('viewer') || 'provider-notifications';
            const rows = (await supabaseApi.select('notification_reads', { viewer })) as Array<{ last_seen_at: string }>;
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, viewer, last_seen_at: rows[0]?.last_seen_at ?? null }));
        } catch {
            structuredLog('error', 'Read-state fetch failed', { correlationId, errorCode: 'ERR_READS', severity: 'error', route: req.url });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to load read state', correlationId }));
        }
    } else if (req.method === 'POST' && req.url === '/api/v1/reads') {
        // C1: "Mark all seen" — move the viewer's watermark to now (upsert).
        let readsBody = '';
        req.on('data', (chunk: any) => readsBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = readsBody ? JSON.parse(readsBody) : {};
                const viewer = d.viewer || 'provider-notifications';
                const now = new Date().toISOString();
                const updated = (await supabaseApi.update('notification_reads', { viewer }, { last_seen_at: now })) as unknown[];
                if (!updated.length) await supabaseApi.insert('notification_reads', { viewer, last_seen_at: now });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, viewer, last_seen_at: now }));
            } catch {
                structuredLog('error', 'Read-state update failed', { correlationId, errorCode: 'ERR_READS', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to mark seen', correlationId }));
            }
        });
    } else if (req.method === 'PATCH' && /^\/api\/v1\/session\/[0-9a-f-]{36}$/.test(req.url || '')) {
        // B13: rename (label) / archive (status) a saved session.
        // 2026-09-05 (Canvas-Wahl 2B): auch `answers` — die Antworten der
        // Sitzung werden ersetzt, country/markets/categories folgen daraus,
        // die Ergebnisseite rechnet beim naechsten /search neu. Gebunden an
        // den Eigentuemer (fremde 404 — sechstes Vorkommen des Musters
        // "Empfaengerbindung fehlt"); der Server-Key behaelt die Betriebssicht.
        const sessionId = (req.url || '').split('/').pop() as string;
        let patchBody = '';
        req.on('data', (chunk: any) => patchBody += chunk.toString());
        req.on('end', async () => {
            try {
                const own = (await supabaseApi.select('sessions', { id: sessionId }, { limit: 1 })) as Array<{ user_id: string | null }>;
                if (!own.length || !(authViaApiKey || (authUserId && own[0].user_id === authUserId))) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Session not found', correlationId }));
                    return;
                }
                const d = JSON.parse(patchBody || '{}');
                const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
                if (typeof d.label === 'string') patch.label = d.label.slice(0, 120) || null;
                if (d.status === 'active' || d.status === 'archived') patch.status = d.status;
                if (d.answers && typeof d.answers === 'object' && !Array.isArray(d.answers)) {
                    const a = d.answers as Record<string, unknown>;
                    const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 40) : null);
                    patch.answers = a;
                    const markets = strList(a.markets);
                    const categories = strList(a.categories);
                    if (markets) patch.markets = markets;
                    if (categories) patch.categories = categories;
                    if (typeof a.country === 'string') patch.country = a.country || (markets?.[0] ?? null);
                }
                const updated = (await supabaseApi.update('sessions', { id: sessionId }, patch)) as unknown[];
                if (!updated.length) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Session not found', correlationId }));
                    return;
                }
                await supabaseApi.insert('event_log', { type: 'session_updated', payload: { sessionId, fields: Object.keys(patch) } });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, id: sessionId, session: updated[0] }));
            } catch {
                structuredLog('error', 'Session patch failed', { correlationId, errorCode: 'ERR_SESSION_PATCH', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Session update failed', correlationId }));
            }
        });
    } else if (req.method === 'GET' && /^\/api\/v1\/session\/[0-9a-f-]{36}\/obligations$/.test(req.url || '')) {
        // Bearbeitungs-Stand der Pflichten einer Sitzung. Nur ABWEICHUNGEN
        // liegen in der Tabelle — was nicht drinsteht, ist 'open'. Gebunden an
        // den Eigentümer der Sitzung: fremde Sitzungen sind unsichtbar (404,
        // nicht 403 — Existenz nicht verraten); der Server-Key behält die
        // Betriebssicht.
        const sessionId = (req.url || '').split('/')[4];
        try {
            const own = (await supabaseApi.select('sessions', { id: sessionId }, { limit: 1 })) as Array<Record<string, unknown>>;
            if (!own.length || !(authViaApiKey || (authUserId && own[0].user_id === authUserId))) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Session not found', correlationId }));
                return;
            }
            const rows = (await supabaseApi.select('session_obligation_status', { session_id: sessionId }, { limit: 200 })) as Array<Record<string, unknown>>;
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                items: rows.map((r) => ({
                    obligation_id: r.obligation_id,
                    status: r.status,
                    done_at: r.done_at ?? null,
                    note: r.note ?? null,
                    updated_at: r.updated_at,
                })),
            }));
        } catch {
            structuredLog('error', 'Obligation status read failed', { correlationId, errorCode: 'ERR_OBLIGATION_READ', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to read obligation status', correlationId }));
        }
    } else if (req.method === 'PUT' && /^\/api\/v1\/session\/[0-9a-f-]{36}\/obligations\/[a-z0-9-]{1,64}$/.test(req.url || '')) {
        // Eine Pflicht auf einen Zustand setzen. 'open' loescht die Zeile —
        // der Ausgangszustand braucht keinen Eintrag.
        const parts = (req.url || '').split('/');
        const sessionId = parts[4];
        const obligationId = parts[6];
        let obBody = '';
        req.on('data', (chunk: any) => obBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(obBody || '{}');
                const status = String(d.status || '');
                if (!['open', 'in_progress', 'done', 'not_applicable'].includes(status)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'BAD_STATUS', message: 'Unknown status', correlationId }));
                    return;
                }
                const owner = (await supabaseApi.select('sessions', { id: sessionId }, { limit: 1 })) as Array<Record<string, unknown>>;
                // Wie beim Lesen: nur der Eigentümer (oder der Server-Key)
                // darf Stände setzen — fremde Sitzungen bleiben ein 404.
                if (!owner.length || !(authViaApiKey || (authUserId && owner[0].user_id === authUserId))) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Session not found', correlationId }));
                    return;
                }

                if (status === 'open') {
                    await supabaseApi.remove('session_obligation_status', { session_id: sessionId, obligation_id: obligationId });
                    res.setHeader('x-correlation-id', correlationId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, obligation_id: obligationId, status: 'open' }));
                    return;
                }

                // Das Datum setzt der Server, nicht der Client: "erledigt am"
                // ist eine Systemaussage, keine Eingabe. Nur 'done' traegt eins
                // — der CHECK in der Migration erzwingt das ohnehin.
                const doneAt = status === 'done'
                    ? (typeof d.done_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.done_at) ? d.done_at : new Date().toISOString().slice(0, 10))
                    : null;
                const row = {
                    session_id: sessionId,
                    obligation_id: obligationId,
                    status,
                    done_at: doneAt,
                    note: typeof d.note === 'string' ? d.note.slice(0, 500) || null : null,
                    updated_at: new Date().toISOString(),
                };
                await supabaseApi.upsert('session_obligation_status', 'session_id,obligation_id', row);
                await supabaseApi.insert('event_log', { type: 'obligation_status_set', payload: { sessionId, obligationId, status } });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, obligation_id: obligationId, status, done_at: doneAt }));
            } catch {
                structuredLog('error', 'Obligation status write failed', { correlationId, errorCode: 'ERR_OBLIGATION_WRITE', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to set obligation status', correlationId }));
            }
        });
    } else if (req.method === 'POST' && /^\/api\/v1\/session\/[0-9a-f-]{36}\/duplicate$/.test(req.url || '')) {
        // B13: duplicate a session as an editable copy. Das Label liefert das
        // Frontend in der Sprache des Nutzers ("Kopie von …"); ohne Label
        // bleibt der englische Fallback. Eigentuemer-Bindung wie beim PATCH.
        const sessionId = (req.url || '').split('/')[4];
        let dupBody = '';
        req.on('data', (chunk: any) => dupBody += chunk.toString());
        req.on('end', async () => {
        try {
            const rows = (await supabaseApi.select('sessions', { id: sessionId }, { limit: 1 })) as Array<Record<string, unknown>>;
            if (!rows[0] || !(authViaApiKey || (authUserId && rows[0].user_id === authUserId))) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Session not found', correlationId }));
                return;
            }
            const src = rows[0];
            let wantedLabel = '';
            try { const d = JSON.parse(dupBody || '{}'); if (typeof d.label === 'string') wantedLabel = d.label.trim(); } catch { /* leerer Body */ }
            const copy = (await supabaseApi.insert('sessions', {
                user_id: src.user_id ?? null,
                guest_key: src.guest_key ?? null,
                country: src.country ?? null,
                markets: src.markets ?? [],
                categories: src.categories ?? [],
                answers: src.answers ?? {},
                risk_summary: src.risk_summary ?? null,
                label: (wantedLabel || `Copy of ${String(src.label || src.country || 'session')}`).slice(0, 120),
                status: 'active',
            })) as Array<{ id: string }>;
            await supabaseApi.insert('event_log', { type: 'session_duplicated', payload: { sourceId: sessionId, copyId: copy?.[0]?.id } });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, id: copy?.[0]?.id }));
        } catch {
            structuredLog('error', 'Session duplicate failed', { correlationId, errorCode: 'ERR_SESSION_DUP', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Session duplicate failed', correlationId }));
        }
        });
    } else if (req.method === 'GET' && /^\/api\/v1\/p\/[0-9a-f]{12}\/detail$/.test(req.url || '')) {
        // Matchmaking v2 (spec §8): stage-2 ANONYMOUS provider detail, ab Phase 3
        // ueber den opaken public_ref. Sichtbar ist, wer in der View steht
        // (§3 × §4 × §19), nicht wer `partner_status = active` traegt. Welche
        // Felder die Antwort traegt, entscheidet das Register (§13); Freitexte
        // gehen durch das Identitaets-Netz. Oeffnen schreibt das Event
        // `provider_detail_opened`, dedupliziert je (user, provider) auf 30 Tage.
        const ref = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        if (!authUserId && !authViaApiKey) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'UNAUTHORIZED', message: 'Login required', correlationId }));
        } else {
            try {
                const p = await resolveRef(ref);
                const view = p ? await matchableRows(p.provider_key) : [];
                if (!p || !view.length) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                    return;
                }
                const providerKey = p.provider_key as string;
                let charged = false;
                try {
                    const recent = (await supabaseApi.select('event_log', { type: 'provider_detail_opened' }, { order: 'timestamp.desc', limit: 200 })) as any[];
                    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
                    const dup = recent.some((e: any) => e.payload?.providerKey === providerKey
                        && e.payload?.userId === authUserId
                        && new Date(e.timestamp).getTime() > cutoff);
                    if (!dup) {
                        await supabaseApi.insert('event_log', {
                            type: 'provider_detail_opened',
                            payload: { providerKey, userId: authUserId, billable: true },
                        });
                        charged = true;
                    }
                } catch { /* event logging must never break the read */ }

                const reg = await visibilityRegister();
                const { areas, services: specializations } = approvedNamesOf(view);
                const labels = await areaLabels(areas);
                const evidence = (await supabaseApi.select('provider_evidence', { provider_key: providerKey }, { limit: 200 })) as any[];
                const { required, usable } = depthFor(view, evidence);
                const reviewRows = (await supabaseApi.select('reviews', { provider_key: providerKey, from_role: 'user' }, { limit: 500 })) as any[];
                const usableReviews = reviewRows.filter((r: any) => r.verified !== false && r.booking_id && r.rating != null);
                const ratingFromBookings = usableReviews.length
                    ? Math.round((usableReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / usableReviews.length) * 10) / 10 : null;
                // Ohne Listenposition gibt es keinen Buchstaben — das Detail traegt
                // nur die Beschreibung; den Buchstaben kennt die aufrufende Liste.
                const title = publicTitle(0, areas.map((a) => labels.get(a) ?? a), p.region ?? null);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    ok: true,
                    detail: {
                        ...serializeProvider(p, reg, 'anonymous'),
                        ...maskDossier(p),
                        descriptor: title.descriptor,
                        // 3 V3 (2026-10-01): die Bereiche als Codes, damit das UI
                        // sie in der Sprache des Nutzers zeigt — `descriptor`
                        // traegt die englischen Taxonomie-Namen.
                        area_codes: [...areas].sort(),
                        descriptor_region: p.region ?? null,
                        // Freigegebene Leistungsnamen aus der View — nicht die
                        // Selbstauskunft aus `categories`.
                        specializations,
                        // Maerkte, in denen mindestens eine Leistung freigegeben ist.
                        markets: [...new Set(view.map((r: any) => r.country_code as string))].sort(),
                        rating: p.rating != null ? Number(p.rating) : null,
                        completed_count: p.completed_count ?? null,
                        avg_response_hours: p.avg_response_hours != null ? Number(p.avg_response_hours) : null,
                        billing_model: p.billing_model || 'project',
                        is_verified: true,
                        availability: p.availability || 'available',
                        // Kann hier gebucht werden? Dieselbe Quelle wie der
                        // Buchungspfad (View-Spalte, gepflegt von
                        // syncBillingReadiness). Bei false zeigt die Seite GAR
                        // KEINEN Buchen-Knopf, statt den Nutzer erst nach der
                        // Terminwahl mit 409 abzuweisen (Nutzer-Entscheidung
                        // 2026-10-01, TKT-PROV-06).
                        bookable_chargeable: view.some((r: any) => r.bookable_chargeable),
                        rank_basis: rankBasis({
                            required, evidence: usable,
                            avg_response_hours: p.avg_response_hours, confirmation_rate: p.confirmation_rate,
                            rating: ratingFromBookings, reviews_count: usableReviews.length,
                        }),
                    },
                    detail_open_charged: charged,
                    correlationId,
                }));
            } catch {
                structuredLog('error', 'Provider detail failed', { correlationId, errorCode: 'ERR_DETAIL', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Provider detail failed', correlationId }));
            }
        }
    } else if (req.method === 'GET' && /^\/api\/v1\/p\/[0-9a-f]{12}\/slots$/.test(req.url || '')) {
        // Matchmaking v2: bookable slots for the scheduling page. Until the
        // calendar-sync integration (spec §11 P4) lands, generate business-hour
        // slots for the next 5 business days minus already-booked ones.
        // Phase 3: Aufloesung ueber public_ref; auf dem Draht steht nur der Ref.
        const ref = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        try {
            const prov = await resolveRef(ref);
            if (!prov) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                return;
            }
            const providerKey = prov.provider_key as string;
            const booked = (await supabaseApi.select('scheduling', { provider_key: providerKey, status: 'confirmed' }, { limit: 200 })) as any[];
            const bookedSet = new Set(booked.map((b: any) => new Date(b.slot_start).toISOString()));
            const slots: string[] = [];
            const d = new Date(); d.setHours(0, 0, 0, 0);
            let days = 0;
            while (slots.length < 40 && days < 14) {
                d.setDate(d.getDate() + 1);
                const dow = d.getDay();
                if (dow === 0 || dow === 6) continue;
                days++;
                for (const [h, m] of [[9, 0], [9, 30], [10, 0], [10, 30], [11, 0], [14, 0], [14, 30], [15, 0]] as const) {
                    const s = new Date(d); s.setHours(h, m, 0, 0);
                    const iso = s.toISOString();
                    if (!bookedSet.has(iso)) slots.push(iso);
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, public_ref: ref, slots, correlationId }));
        } catch {
            structuredLog('error', 'Slots fetch failed', { correlationId, errorCode: 'ERR_SLOTS', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Slots fetch failed', correlationId }));
        }
    } else if (req.method === 'GET' && /^\/api\/v1\/p\/[0-9a-f]{12}\/reviews$/.test(req.url || '')) {
        // Bewertungen eines Anbieters fuer die Partnerseite (Canvas 5B).
        //
        // Nur Bewertungen, die an einer echten Buchung haengen: `from_role='user'`
        // UND `verified` UND eine `booking_id`. Eine Bewertung ohne Buchung ist
        // eine Behauptung — die Seite zeigt sie nicht, auch wenn sie in der
        // Tabelle steht. Damit ist "verifiziert nach Buchung" unter jedem Zitat
        // keine Marke, sondern die Bedingung, unter der es hier ueberhaupt steht.
        //
        // Ausgegeben wird, was niemanden identifiziert: Note, Text, Kategorien,
        // Monat. Die Tabelle fuehrt keine user_id, der Mandant bleibt anonym.
        // Phase 3: der Text geht durch das Identitaets-Netz — ein Mandant, der
        // den Anbieter beim Namen nennt, verraet ihn sonst vor der Buchung.
        const ref = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        if (!authUserId && !authViaApiKey) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'UNAUTHORIZED', message: 'Login required', correlationId }));
        } else {
            try {
                const prov = await resolveRef(ref);
                if (!prov) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                    return;
                }
                const providerKey = prov.provider_key as string;
                const ctx = identityCtx(prov);
                const rows = (await supabaseApi.select('reviews', { provider_key: providerKey, from_role: 'user' }, { order: 'created_at.desc', limit: 500 })) as any[];
                const usable = rows.filter((r: any) => r.verified !== false && r.booking_id && r.rating != null);
                const average = usable.length
                    ? Math.round((usable.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / usable.length) * 10) / 10
                    : null;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    ok: true,
                    reviews: usable.slice(0, 50).map((r: any) => ({
                        rating: Number(r.rating),
                        body: typeof r.body === 'string' && r.body.trim() ? maskIdentity(r.body, ctx) : null,
                        categories: r.categories || [],
                        created_at: r.created_at,
                    })),
                    summary: { count: usable.length, average },
                    correlationId,
                }));
            } catch {
                structuredLog('error', 'Provider reviews failed', { correlationId, errorCode: 'ERR_REVIEWS', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Provider reviews failed', correlationId }));
            }
        }
    } else if (req.method === 'GET' && req.url === '/api/v1/bookings') {
        // Matchmaking v2: the user's bookings ("Termine"). Identity is revealed
        // post-booking (spec §5 stage 3), so provider name/contact ride along.
        res.setHeader('x-correlation-id', correlationId);
        if (!authUserId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'UNAUTHORIZED', message: 'Login required', correlationId }));
        } else {
            try {
                const rows = (await supabaseApi.select('scheduling', { user_id: authUserId }, { order: 'slot_start.desc', limit: 100 })) as any[];
                const provs = (await supabaseApi.select('providers', {})) as any[];
                const byKey: Record<string, any> = {};
                provs.forEach((p: any) => { byKey[p.provider_key] = p; });
                // Phase 3: auf dem Draht steht der public_ref, nie der Schluessel.
                // Vor der Offenlegung heisst der Anbieter "Verified Provider" mit
                // seiner Beschreibung; einen Listenbuchstaben gibt es hier nicht.
                const viewAll = (await supabaseApi.select('matchable_provider_services', {}, { limit: 5000 })) as any[];
                const labels = await areaLabels([...new Set(viewAll.map((r: any) => r.area_code as string).filter(Boolean))]);
                // Canvas F V1: ein kommender Termin bei einer pausierten
                // Leistung traegt das Flag, damit "Termine" es sagt statt zu
                // schweigen. Ohne Pause kostet das genau eine Abfrage.
                const paused = await pausedAreasByProvider();
                const nowIso = new Date().toISOString();
                const pausedFlag: Record<string, boolean> = {};
                for (const b of rows) {
                    if (!paused.has(b.provider_key) || b.slot_start <= nowIso || b.status === 'cancelled') continue;
                    const r = await requestOf(authUserId, b.provider_key);
                    pausedFlag[b.id] = bookingAffected(paused.get(b.provider_key), r?.category);
                }
                const bookings = rows.map((b: any) => {
                    const p = byKey[b.provider_key] || {};
                    const areas = [...new Set(viewAll.filter((r: any) => r.provider_key === b.provider_key).map((r: any) => r.area_code as string).filter(Boolean))];
                    const title = publicTitle(0, areas.map((a) => labels.get(a) ?? a), p.region ?? null);
                    return {
                        id: b.id,
                        public_ref: p.public_ref ?? null,
                        provider_name: b.identity_revealed ? (p.name ?? 'Verified Provider') : 'Verified Provider',
                        provider_descriptor: title.descriptor,
                        provider_area_codes: [...areas].sort(),
                        provider_region: p.region ?? null,
                        identity_revealed: !!b.identity_revealed,
                        // Affiliate 1b: the provider's website is a POST-BOOKING
                        // reveal only — never before, to preserve stage-1/2 anonymity.
                        // The outclick is routed through /p/:ref/website so it can
                        // be counted (future affiliate revenue line).
                        provider_website: b.identity_revealed ? (p.website_url ?? null) : null,
                        slot_start: b.slot_start,
                        slot_end: b.slot_end,
                        status: b.status,
                        message: b.message ?? null,
                        provider_paused: !!pausedFlag[b.id],
                    };
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, bookings, correlationId }));
            } catch {
                structuredLog('error', 'Bookings fetch failed', { correlationId, errorCode: 'ERR_BOOKINGS', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Bookings fetch failed', correlationId }));
            }
        }
    } else if (req.method === 'GET' && /^\/api\/v1\/p\/[0-9a-f]{12}\/website$/.test(req.url || '')) {
        // Affiliate 1b: counted outclick to the provider website. Only a user
        // who has ALREADY booked this provider may follow it (post-booking
        // reveal) — this is the tracking hook for the later affiliate revenue
        // line, not yet monetised. Logs provider_website_outclick, 302-redirects.
        const ref = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        if (!authUserId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'UNAUTHORIZED', message: 'Login required', correlationId }));
        } else {
            try {
                const prov = await resolveRef(ref);
                if (!prov) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                    return;
                }
                const providerKey = prov.provider_key as string;
                const booked = (await supabaseApi.select('scheduling', { user_id: authUserId, provider_key: providerKey }, { limit: 1 })) as any[];
                if (!booked[0] || !booked[0].identity_revealed) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'FORBIDDEN', message: 'Website is revealed after booking only', correlationId }));
                    return;
                }
                const url = prov.website_url;
                if (!url) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'No website on file', correlationId }));
                    return;
                }
                await supabaseApi.insert('event_log', { type: 'provider_website_outclick', payload: { providerKey, userId: authUserId, bookingId: booked[0].id } }).catch(() => { /* non-blocking */ });
                res.writeHead(302, { Location: url });
                res.end();
            } catch {
                structuredLog('error', 'Website outclick failed', { correlationId, errorCode: 'ERR_OUTCLICK', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Website outclick failed', correlationId }));
            }
        }
    } else if (req.method === 'PATCH' && /^\/api\/v1\/provider\/[a-z0-9-]+\/bookings\/[0-9a-f-]+\/proposal$/.test(req.url || '')) {
        // Phase 4 (Spec B "Mandatory user discount"): der Anbieter bestaetigt je
        // Lead, ob ein Angebot erstellt und der 10 %-Rabatt ausgewiesen wurde.
        // Eine Zeile je Buchung, Korrektur per Upsert, Historie im Protokoll.
        const parts = (req.url || '').split('/');
        const providerKey = parts[4]; const bookingId = parts[6];
        res.setHeader('x-correlation-id', correlationId);
        let prBody = '';
        req.on('data', (chunk: any) => prBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(prBody || '{}');
                if (typeof d.proposal_issued !== 'boolean' || typeof d.discount_shown !== 'boolean') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'proposal_issued and discount_shown (boolean) required', correlationId }));
                    return;
                }
                if (d.discount_shown && !d.proposal_issued) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'A discount cannot be shown without a proposal', correlationId }));
                    return;
                }
                const rows = (await supabaseApi.select('scheduling', { id: bookingId, provider_key: providerKey }, { limit: 1 })) as any[];
                if (!rows[0]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Booking not found', correlationId }));
                    return;
                }
                const now = new Date().toISOString();
                const report = {
                    booking_id: bookingId, provider_key: providerKey,
                    proposal_issued: d.proposal_issued, discount_shown: d.discount_shown,
                    discount_pct: rows[0].user_discount_pct ?? null, policy_version: rows[0].user_discount_policy_version ?? null,
                    note: typeof d.note === 'string' ? d.note.slice(0, 500) : null,
                    reported_by: authUserId, reported_at: now,
                };
                await supabaseApi.upsert('lead_proposal_reports', 'booking_id', report);
                await supabaseApi.insert('event_log', { type: 'lead_proposal_reported', payload: { bookingId, providerKey, proposalIssued: d.proposal_issued, discountShown: d.discount_shown, by: authUserId } });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, proposal: { proposal_issued: d.proposal_issued, discount_shown: d.discount_shown, reported_at: now }, correlationId }));
            } catch {
                structuredLog('error', 'Proposal report failed', { correlationId, errorCode: 'ERR_PROPOSAL', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Proposal report failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && /^\/api\/v1\/provider\/[a-z0-9-]+\/billing\/sync$/.test(req.url || '')) {
        // Phase 4: Zahlungsbereitschaft aus Stripe und Datenbank neu berechnen —
        // beim Rueckweg aus dem Portal und auf Knopfdruck. Nie im Buchungspfad.
        const providerKey = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        try {
            if (!isStripeConfigured()) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not connected yet', correlationId }));
                return;
            }
            const r = await syncBillingReadiness(providerKey);
            if (!r) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, readiness: { ready: r.ready, reasons: r.reasons, synced_at: r.syncedAt, payment_method: r.paymentMethodLabel, changed: r.changed }, correlationId }));
        } catch (err) {
            // Die Stripe-Meldung gehoert ins Log, nicht auf den Draht: ein
            // fehlendes Recht am Restricted Key (permission_error) ist sonst
            // von einem Netzfehler nicht zu unterscheiden (Befund 2026-10-04).
            const detail = err instanceof StripeError ? { stripeStatus: err.status, stripeCode: err.code, stripeType: err.type, detail: err.message } : { detail: err instanceof Error ? err.message : String(err) };
            structuredLog('error', 'Billing sync failed', { correlationId, errorCode: 'ERR_BILLING_SYNC', severity: 'error', route: req.url, ...detail });
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'STRIPE_ERROR', message: 'Stripe request failed', correlationId }));
        }
    } else if (req.method === 'GET' && /^\/api\/v1\/provider\/[a-z0-9-]+\/bookings$/.test(req.url || '')) {
        // Matchmaking v2: the provider's paid leads (bookings). The dossier —
        // user identity + intake message — is included from booking time
        // (spec §11 P7: charged at booking, value delivered immediately).
        const providerKey = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        try {
            const rows = (await supabaseApi.select('scheduling', { provider_key: providerKey }, { order: 'slot_start.desc', limit: 100 })) as any[];
            const users = (await supabaseApi.select('users', {})) as any[];
            const byId: Record<string, any> = {};
            users.forEach((u: any) => { byId[u.id] = u; });
            // Canvas-Wahl 2 V1 (2026-10-01): die Firma kommt aus der Anfrage des
            // Nutzers an DIESEN Anbieter (structured_answers.company), dazu
            // Bereich und Markt als Thema. Vorher riet das UI die Firma aus der
            // E-Mail-Domain. Die Buchung hat die Identitaet bereits freigegeben
            // (Dossier-Regel); ohne Anfrage oder ohne Angabe bleibt sie null —
            // das UI schreibt dann "Firma nicht angegeben", nie eine Domain.
            const engagements = (await supabaseApi.select('engagement_requests', { provider_key: providerKey }, { order: 'created_at.desc', limit: 200 })) as any[];
            const anfrageVon: Record<string, any> = {};
            for (const e of engagements) {
                if (!e.user_id) continue;
                const bisher = anfrageVon[e.user_id];
                // Neueste Anfrage gewinnt; eine aeltere fuellt nur eine fehlende Firma.
                if (!bisher) anfrageVon[e.user_id] = e;
                else if (!bisher.structured_answers?.company && e.structured_answers?.company) anfrageVon[e.user_id] = { ...bisher, structured_answers: { ...bisher.structured_answers, company: e.structured_answers.company } };
            }
            // Phase 4: je Lead, was er gekostet hat (Spec B "standard fee,
            // discount, final charge") und die 10 % fuer den Nutzer samt
            // Selbstauskunft des Anbieters.
            const ledgerIds = rows.map((b: any) => b.lead_ledger_id).filter(Boolean);
            const ledgerRows = (await Promise.all(ledgerIds.map((id: string) => supabaseApi.select('provider_lead_ledger', { id }, { limit: 1 }) as Promise<any[]>))).flat();
            const eventRows = (await Promise.all(ledgerIds.map((id: string) => supabaseApi.select('provider_lead_ledger_payment_events', { ledger_id: id }, { order: 'created_at.asc', limit: 20 }) as Promise<any[]>))).flat();
            const reports = (await supabaseApi.select('lead_proposal_reports', { provider_key: providerKey }, { limit: 500 })) as any[];
            const ledgerById: Record<string, any> = {}; ledgerRows.forEach((l: any) => { ledgerById[l.id] = l; });
            const reportByBooking: Record<string, any> = {}; reports.forEach((r: any) => { reportByBooking[r.booking_id] = r; });
            const bookings = rows.map((b: any) => {
                const anfrage = b.user_id ? anfrageVon[b.user_id] : undefined;
                const company = typeof anfrage?.structured_answers?.company === 'string' ? anfrage.structured_answers.company.trim() : '';
                const l = b.lead_ledger_id ? ledgerById[b.lead_ledger_id] : null;
                const rep = reportByBooking[b.id];
                return {
                    id: b.id,
                    slot_start: b.slot_start,
                    slot_end: b.slot_end,
                    status: b.status,
                    lead_charged: !!b.lead_charged,
                    user_email: b.user_id && byId[b.user_id] ? byId[b.user_id].email : null,
                    user_company: company || null,
                    category: anfrage?.category ?? null,
                    country: anfrage?.country ?? null,
                    message: b.message ?? null,
                    acknowledgement_version: b.acknowledgement_version ?? null,
                    price_snapshot: b.price_snapshot ?? null,
                    lead: l ? {
                        band: l.computed_band, standard_fee_cents: l.standard_fee_cents, discount_pct: l.discount_pct,
                        discount_sequence: l.discount_sequence ?? null, final_fee_cents: l.final_fee_cents, currency: l.currency,
                        payment_status: resolveLedgerStatus(l, eventRows.filter((e: any) => e.ledger_id === l.id)),
                        fee_enabled: l.payment_status !== 'n/a',
                    } : null,
                    user_discount_pct: b.user_discount_pct ?? null,
                    proposal: rep ? { proposal_issued: !!rep.proposal_issued, discount_shown: !!rep.discount_shown, reported_at: rep.reported_at } : null,
                };
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, providerKey, bookings, correlationId }));
        } catch {
            structuredLog('error', 'Provider bookings fetch failed', { correlationId, errorCode: 'ERR_PROVIDER_BOOKINGS', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Provider bookings fetch failed', correlationId }));
        }
    } else if (req.method === 'PATCH' && /^\/api\/v1\/scheduling\/[0-9a-f-]+$/.test(req.url || '')) {
        // Cancel / mark outcome of a booking. Owner (user) or service key only.
        // Lead fee is NOT refunded on cancel/no-show (spec §11 P7 value principle).
        const bookingId = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        let patchBody = '';
        req.on('data', (chunk: any) => patchBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(patchBody || '{}');
                const status = typeof d.status === 'string' ? d.status : '';
                const newSlot = typeof d.slot_start === 'string' ? d.slot_start : '';
                if (!newSlot && !['cancelled', 'completed', 'no_show'].includes(status)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'status must be cancelled|completed|no_show, or slot_start for a reschedule', correlationId }));
                    return;
                }
                const rows = (await supabaseApi.select('scheduling', { id: bookingId }, { limit: 1 })) as any[];
                const b = rows[0];
                if (!b) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Booking not found', correlationId }));
                    return;
                }
                if (!authViaApiKey && (!authUserId || b.user_id !== authUserId)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'FORBIDDEN', message: 'Not your booking', correlationId }));
                    return;
                }
                // Reschedule path: move a confirmed booking to a new slot. Same
                // lead — the fee was charged at booking and is NOT charged again.
                if (newSlot) {
                    if (b.status !== 'confirmed') {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errorCode: 'CONFLICT', message: 'Only confirmed bookings can be rescheduled', correlationId }));
                        return;
                    }
                    const start = new Date(newSlot);
                    if (isNaN(start.getTime()) || start.getTime() <= Date.now()) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'slot_start must be a future ISO timestamp', correlationId }));
                        return;
                    }
                    const clash = (await supabaseApi.select('scheduling', { provider_key: b.provider_key, status: 'confirmed', slot_start: start.toISOString() }, { limit: 1 })) as any[];
                    if (clash[0] && clash[0].id !== bookingId) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errorCode: 'SLOT_TAKEN', message: 'Slot already booked', correlationId }));
                        return;
                    }
                    const end = new Date(start.getTime() + 30 * 60 * 1000);
                    await supabaseApi.update('scheduling', { id: bookingId }, { slot_start: start.toISOString(), slot_end: end.toISOString(), updated_at: new Date().toISOString() });
                    await supabaseApi.insert('event_log', { type: 'booking_rescheduled', payload: { bookingId, providerKey: b.provider_key, userId: b.user_id, from: b.slot_start, to: start.toISOString() } });
                    // `actor` gesetzt: wer selbst verschiebt, bekommt keine
                    // Nachricht darueber. Uebrig bleibt der Fall, dass jemand
                    // anderes den Termin bewegt hat.
                    await notify({
                        to: b.user_id, actor: authUserId, type: 'booking_rescheduled',
                        subject: 'booking', subjectId: bookingId,
                        payload: { providerRef: await refOf(b.provider_key), from: b.slot_start, to: start.toISOString() },
                    });
                    // Notify the provider (fire-and-forget, in their language):
                    // the user moved the slot, the provider's calendar must not
                    // silently drift. Delivery problems are events, not errors.
                    (async () => {
                        const provs = (await supabaseApi.select('providers', { provider_key: b.provider_key }, { limit: 1 })) as any[];
                        await sendRescheduleMail({
                            to: provs[0]?.contact_email ?? null,
                            bookingId,
                            providerKey: b.provider_key,
                            fromIso: b.slot_start,
                            toIso: start.toISOString(),
                            locale: provs[0]?.languages?.[0],
                            correlationId,
                        });
                    })().catch(() => { /* logged inside the mailer */ });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, id: bookingId, status: b.status, slot_start: start.toISOString(), slot_end: end.toISOString(), correlationId }));
                    return;
                }
                const jetzt = new Date().toISOString();
                // Wer abgesagt hat, wird mitgeschrieben. Ohne diese Spalte ist
                // eine Absage des Mandanten von einer des Anbieters nicht zu
                // unterscheiden — und damit jede Auswertung darueber Raterei
                // (Migration 20260831000001).
                await supabaseApi.update('scheduling', { id: bookingId }, {
                    status, updated_at: jetzt,
                    ...(status === 'cancelled'
                        // Diese Route gehoert dem Mandanten (403 oben, wenn die
                        // Buchung nicht seine ist). Der Server-Key handelt im
                        // Auftrag des Betriebs, nicht des Anbieters.
                        ? { cancelled_by: authViaApiKey ? 'system' : 'user', cancelled_at: jetzt }
                        : {}),
                });
                const evType = status === 'cancelled' ? 'user_cancelled' : status === 'no_show' ? 'no_show' : 'outcome_check';
                await supabaseApi.insert('event_log', { type: evType, payload: { bookingId, providerKey: b.provider_key, userId: b.user_id, status } });
                if (status === 'cancelled') {
                    await notify({
                        to: b.user_id, actor: authUserId, type: 'booking_cancelled',
                        subject: 'booking', subjectId: bookingId,
                        payload: { providerRef: await refOf(b.provider_key), from: b.slot_start },
                    });
                    // Der Anbieter erfuhr bis 2026-08-31 GAR NICHTS von einer
                    // Absage — der Verschieben-Pfad mailte, dieser nicht. Er
                    // behielt den Termin im Kalender und erschien zum Gespraech.
                    // Wie beim Verschieben: nebenlaeufig, Zustellprobleme sind
                    // Ereignisse im Protokoll und keine Fehler der Route.
                    (async () => {
                        const provs = (await supabaseApi.select('providers', { provider_key: b.provider_key }, { limit: 1 })) as any[];
                        await sendCancellationMail({
                            to: provs[0]?.contact_email ?? null,
                            bookingId,
                            providerKey: b.provider_key,
                            slotIso: b.slot_start,
                            locale: provs[0]?.languages?.[0],
                            correlationId,
                        });
                    })().catch(() => { /* im Mailer protokolliert */ });
                }
                // Outcome "completed" feeds the quality score (spec §6): bump the
                // provider's completed_count used in the anonymous listing card.
                if (status === 'completed') {
                    try {
                        const provs = (await supabaseApi.select('providers', { provider_key: b.provider_key }, { limit: 1 })) as any[];
                        if (provs[0]) await supabaseApi.update('providers', { provider_key: b.provider_key }, { completed_count: (provs[0].completed_count || 0) + 1 });
                    } catch { /* aggregate update must not break the outcome */ }
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, id: bookingId, status, correlationId }));
            } catch {
                structuredLog('error', 'Booking patch failed', { correlationId, errorCode: 'ERR_BOOKING_PATCH', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Booking patch failed', correlationId }));
            }
        });
    } else if (req.method === 'GET' && /^\/api\/v1\/acknowledgement(\?|$)/.test(req.url || '')) {
        // Phase 4: der Text, den der Nutzer vor der Buchung bestaetigt, mit
        // Fassung und der Liste der geteilten Felder. Oeffentlich — er steht
        // ohnehin auf dem Bildschirm, bevor jemand bucht.
        res.setHeader('x-correlation-id', correlationId);
        try {
            const lang = (new URL(req.url || '/', 'http://x').searchParams.get('lang') || 'en').slice(0, 2).toLowerCase();
            const rows = (await supabaseApi.select('booking_acknowledgements', {}, { limit: 100 })) as any[];
            const ack = currentAcknowledgement(rows, lang);
            const policies = (await supabaseApi.select('user_discount_policy', {}, { limit: 50 })) as any[];
            const today = new Date().toISOString().slice(0, 10);
            const policy = policies.filter((r) => String(r.effective_from) <= today).sort((a, b) => b.version - a.version)[0] ?? null;
            if (!ack) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'ACKNOWLEDGEMENT_MISSING', message: 'No booking acknowledgement is configured', correlationId }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ok: true, version: ack.version, language: ack.language, body: ack.body, shared_fields: ack.shared_fields,
                user_discount: policy ? { pct: policy.pct, policy_version: policy.version, recurring_treatment: policy.recurring_treatment } : null,
                correlationId,
            }));
        } catch {
            structuredLog('error', 'Acknowledgement fetch failed', { correlationId, errorCode: 'ERR_ACK', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Acknowledgement fetch failed', correlationId }));
        }
    } else if (req.method === 'POST' && req.url === '/api/v1/scheduling') {
        // Phase 4 (Spec B "Booking confirmation and data handover", ADR-0005):
        // Bestaetigung mit Fassung → Preis-Snapshot → Band + Rabatt → Belastung
        // der Anbieterkarte → ERST DANN die Buchung mit Offenlegung. Scheitert
        // die Belastung, gibt es keine Buchung, keinen Namen, keinen Slot-
        // Verlust; der Nutzer liest einen neutralen Satz, der Anbieter den
        // Grund. Reihenfolge und Fehlerzweige: leadCharge.ts.
        res.setHeader('x-correlation-id', correlationId);
        if (!authUserId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'UNAUTHORIZED', message: 'Login required to book', correlationId }));
        } else {
            let schedBody = '';
            req.on('data', (chunk: any) => schedBody += chunk.toString());
            req.on('end', async () => {
                const fail = (status: number, errorCode: string, message: string, extra: Record<string, unknown> = {}) => {
                    res.writeHead(status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode, message, ...extra, correlationId }));
                };
                try {
                    const d = JSON.parse(schedBody || '{}');
                    const ref = typeof d.public_ref === 'string' ? d.public_ref : '';
                    const slotStart = typeof d.slot_start === 'string' ? d.slot_start : '';
                    const ackVersion = typeof d.acknowledgement_version === 'string' ? d.acknowledgement_version.slice(0, 40) : '';
                    const lang = typeof d.language === 'string' ? d.language.slice(0, 2).toLowerCase() : 'en';
                    if (!ref || Number.isNaN(Date.parse(slotStart))) {
                        fail(400, 'VALIDATION_ERROR', 'public_ref and slot_start (ISO) required'); return;
                    }
                    if (Date.parse(slotStart) < Date.now()) { fail(400, 'VALIDATION_ERROR', 'slot_start is in the past'); return; }
                    if (!ackVersion) { fail(400, 'VALIDATION_ERROR', 'acknowledgement_version required'); return; }

                    const p = await resolveRef(ref);
                    const view = p ? await matchableRows(p.provider_key) : [];
                    if (!p || !view.length) { fail(404, 'NOT_FOUND', 'Provider not found'); return; }
                    // Buchbar heisst matchbar UND zahlungsbereit (Spec A §21.1). Das
                    // Gate sperrt die Buchung, nie das Matching (§14).
                    if (!view.some((r: any) => r.bookable_chargeable)) {
                        fail(409, 'BILLING_NOT_READY', 'This provider cannot take bookings yet'); return;
                    }
                    const providerKey = p.provider_key as string;

                    // Die Fassung, die der Nutzer gesehen hat, muss die gueltige sein.
                    const ackRows = (await supabaseApi.select('booking_acknowledgements', {}, { limit: 100 })) as any[];
                    const ack = currentAcknowledgement(ackRows, lang);
                    if (!ack) { fail(503, 'ACKNOWLEDGEMENT_MISSING', 'No booking acknowledgement is configured'); return; }
                    if (ack.version !== ackVersion) {
                        fail(409, 'ACKNOWLEDGEMENT_OUTDATED', 'The booking acknowledgement has changed — please read it again', { current_version: ack.version }); return;
                    }

                    // Ein bestaetigter Termin je Slot — vor der Belastung geprueft, vom
                    // Unique Index garantiert.
                    const clash = (await supabaseApi.select('scheduling', { provider_key: providerKey, status: 'confirmed', slot_start: slotStart }, { limit: 1 })) as any[];
                    if (clash.length) { fail(409, 'SLOT_TAKEN', 'This slot has just been taken'); return; }

                    // Opportunity aus der Sitzung des Nutzers, begrenzt auf das Angebot.
                    let session: { country?: string | null; categories?: string[] | null; markets?: string[] | null } | null = null;
                    if (typeof d.session_id === 'string' && d.session_id) {
                        const own = (await supabaseApi.select('sessions', { id: d.session_id }, { limit: 1 })) as any[];
                        if (!own[0] || own[0].user_id !== authUserId) { fail(404, 'NOT_FOUND', 'Session not found'); return; }
                        session = own[0];
                    }
                    const opp = deriveOpportunity(view, session, d);
                    if (!opp.ok) { fail(400, opp.code, 'The booking needs the area and markets it refers to'); return; }

                    // Band, Rabatt, Policy, Snapshot — alles Konfiguration, nichts Hardcoding.
                    const [cfg, sub] = await Promise.all([loadPricingConfig(), getActiveSubscription(providerKey)]);
                    const now = new Date();
                    const cycleStart = cycleStartFor(sub, now);
                    const used = await getDiscountCounter(providerKey, cycleStart);
                    const quote = quoteLeadFee(cfg, sub, opp.opp, used, now);
                    const policies = (await supabaseApi.select('user_discount_policy', {}, { limit: 50 })) as any[];
                    const today = now.toISOString().slice(0, 10);
                    const policy = policies.filter((r) => String(r.effective_from) <= today).sort((a, b) => b.version - a.version)[0] ?? null;
                    const svcRows = (await supabaseApi.select('provider_services', { id: opp.serviceRow.service_id }, { limit: 1 })) as any[];
                    const terms = (await supabaseApi.select('provider_agreement_acceptance', { provider_key: providerKey, agreement_type: 'commercial_terms' }, { limit: 10 })) as any[];
                    const termsVersion = terms.find((t) => !t.superseded_at)?.version ?? null;
                    const snapshot = priceSnapshotFrom(opp.serviceRow, svcRows[0] ?? null, termsVersion, now);

                    // Zahlungsmittel: ohne Karte wird nichts versucht und nichts geschrieben.
                    const chargeable = quote.enabled && quote.finalFeeCents > 0;
                    let paymentMethodId: string | null = null;
                    if (chargeable) {
                        const customerId = p.stripe_customer_id ? String(p.stripe_customer_id) : null;
                        if (customerId && isStripeConfigured()) {
                            try { paymentMethodId = (await getCustomerBilling(customerId)).defaultPaymentMethodId; } catch { paymentMethodId = null; }
                        }
                        if (!customerId || !paymentMethodId) {
                            await syncBillingReadiness(providerKey).catch(() => null);
                            fail(409, 'BILLING_NOT_READY', 'This provider cannot take bookings yet'); return;
                        }
                    }

                    // ── Ab hier wird geschrieben: Ledger → Stripe → Buchung ──
                    const charge = await chargeLeadFee({
                        providerKey, userId: authUserId, quote, opp: opp.opp,
                        customerId: p.stripe_customer_id ? String(p.stripe_customer_id) : null, paymentMethodId,
                        receiptEmail: p.contact_email ?? null, correlationId,
                    });
                    if (charge.outcome === 'failed') {
                        if (charge.result.kind === 'card') {
                            await recordPaymentFailure({ providerKey, ledgerId: charge.ledgerId, result: charge.result, paymentMethodId, correlationId });
                            // Neutral und ohne Decline-Code: das liegt nicht am Nutzer.
                            fail(409, 'BOOKING_NOT_COMPLETED', 'The booking could not be completed. This is not on your side — the provider has been informed.', { reason: 'provider_billing' });
                        } else {
                            await supabaseApi.insert('event_log', { type: 'lead_payment_error', payload: { providerKey, ledgerId: charge.ledgerId, detail: charge.result.detail.slice(0, 200) } }).catch(() => {});
                            structuredLog('error', 'Lead charge failed at Stripe', { correlationId, errorCode: 'ERR_LEAD_CHARGE', severity: 'error', route: req.url });
                            fail(502, 'BILLING_ERROR', 'The payment service did not answer. Please try again in a moment.');
                        }
                        return;
                    }

                    const slotEnd = new Date(Date.parse(slotStart) + 30 * 60 * 1000).toISOString();
                    const sharingAt = now.toISOString();
                    let booking: any;
                    try {
                        const inserted = (await supabaseApi.insert('scheduling', {
                            provider_key: providerKey,
                            user_id: authUserId,
                            slot_start: slotStart,
                            slot_end: slotEnd,
                            status: 'confirmed',
                            message: typeof d.message === 'string' ? d.message.slice(0, 2000) : null,
                            lead_charged: charge.outcome === 'captured',
                            identity_revealed: true,
                            service_id: opp.serviceRow.service_id ?? null,
                            price_snapshot: snapshot,
                            shared_fields: [...SHARED_FIELDS_V1],
                            sharing_confirmed_at: sharingAt,
                            acknowledgement_version: ack.version,
                            lead_ledger_id: charge.ledgerId,
                            user_discount_pct: policy?.pct ?? null,
                            user_discount_policy_version: policy?.version ?? null,
                        })) as any[];
                        booking = inserted?.[0];
                        if (!booking?.id) throw new Error('scheduling insert returned no row');
                    } catch (insErr) {
                        // Belastet, aber keine Buchung: erstatten und protokollieren.
                        if (charge.outcome === 'captured') {
                            try {
                                await refundPaymentIntent(charge.paymentIntentId, `${charge.ledgerId}:refund`);
                                await supabaseApi.insert('provider_lead_ledger_payment_events', { ledger_id: charge.ledgerId, status: 'refunded', stripe_ref: charge.paymentIntentId, detail: 'booking insert failed' });
                                await supabaseApi.insert('event_log', { type: 'lead_charge_reversed', payload: { providerKey, ledgerId: charge.ledgerId, paymentIntentId: charge.paymentIntentId } });
                            } catch (refErr) {
                                await supabaseApi.insert('event_log', { type: 'lead_charge_reversed_failed', payload: { providerKey, ledgerId: charge.ledgerId, paymentIntentId: charge.paymentIntentId, error: String(refErr).slice(0, 200) } }).catch(() => {});
                            }
                        }
                        const dup = /23505|duplicate|unique/i.test(String(insErr));
                        if (dup) fail(409, 'SLOT_TAKEN', 'This slot has just been taken');
                        else { structuredLog('error', 'Scheduling insert failed after charge', { correlationId, errorCode: 'ERR_SCHEDULING', severity: 'error', route: req.url }); fail(500, 'INTERNAL', 'Scheduling create failed'); }
                        return;
                    }

                    if (quote.enabled) {
                        await supabaseApi.upsert('provider_discount_counter', 'provider_key,cycle_start', {
                            provider_key: providerKey, cycle_start: cycleStart, used: quote.counterUsedAfter, updated_at: sharingAt,
                        }).catch(() => {});
                    }
                    await supabaseApi.insert('event_log', { type: 'scheduling_confirmed', payload: { bookingId: booking.id, providerKey, userId: authUserId, slotStart, ledgerId: charge.ledgerId } });
                    await supabaseApi.insert('event_log', { type: 'provider_lead_charged', payload: {
                        bookingId: booking.id, providerKey, userId: authUserId, ledgerId: charge.ledgerId,
                        band: quote.band, finalFeeCents: quote.finalFeeCents, currency: quote.currency,
                        paymentIntentId: charge.outcome === 'captured' ? charge.paymentIntentId : null, feeEnabled: quote.enabled,
                    } });
                    await supabaseApi.insert('event_log', { type: 'lead.revealed', payload: {
                        bookingId: booking.id, providerKey, userId: authUserId, sharedFields: [...SHARED_FIELDS_V1],
                        acknowledgementVersion: ack.version, sharingConfirmedAt: sharingAt,
                    } });
                    // Der Anbieter erfaehrt es im Dashboard und per Mail; beides ohne Nutzeridentitaet im Text.
                    (async () => {
                        const members = (await supabaseApi.select('provider_members', { provider_key: providerKey }, { limit: 20 })) as Array<{ user_id: string }>;
                        for (const m of members) {
                            await notify({ to: m.user_id, actor: authUserId, type: 'booking_created', subject: 'booking', subjectId: booking.id,
                                payload: { providerKey, slot: slotStart }, dedupeKey: `booking_created:${booking.id}:${m.user_id}` });
                        }
                        await sendBookingMail({ to: p.contact_email ?? null, bookingId: booking.id, providerKey, slotIso: slotStart, locale: p.languages?.[0], correlationId });
                    })().catch(() => { /* non-blocking */ });

                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        ok: true,
                        booking: {
                            id: booking.id, public_ref: ref, slot_start: slotStart, slot_end: slotEnd, status: 'confirmed',
                            acknowledgement_version: ack.version, shared_fields: [...SHARED_FIELDS_V1],
                            user_discount: policy ? { pct: policy.pct, policy_version: policy.version } : null,
                        },
                        // Offenlegung erst jetzt (Spec B Schritt 5): Name und Kontakt nach der Belastung.
                        provider_identity: { name: p.name, website_url: p.website_url ?? null, contact_email: p.contact_email ?? null },
                        correlationId,
                    }));
                } catch {
                    structuredLog('error', 'Scheduling create failed', { correlationId, errorCode: 'ERR_SCHEDULING', severity: 'error', route: req.url });
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Scheduling create failed', correlationId }));
                }
            });
        }
    } else if (req.method === 'POST' && req.url === '/api/v1/reviews') {
        // Matchmaking v2 (notifications-alerts-concept §2): two-sided reviews,
        // only from real bookings. user→provider ratings update the provider's
        // aggregate rating (ranking quality factor); provider→user feeds the
        // internal lead-quality signal.
        res.setHeader('x-correlation-id', correlationId);
        if (!authUserId && !authViaApiKey) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'UNAUTHORIZED', message: 'Login required', correlationId }));
        } else {
            let revBody = '';
            req.on('data', (chunk: any) => revBody += chunk.toString());
            req.on('end', async () => {
                try {
                    const d = JSON.parse(revBody || '{}');
                    const fromRole = d.from_role === 'provider' ? 'provider' : 'user';
                    const rating = typeof d.rating === 'number' ? Math.max(0, Math.min(5, d.rating)) : null;
                    // Bewertungen tragen 0.3 des Ranking-Scores. Bis 2026-09-22
                    // nahm diese Route jede Bewertung ohne Buchung an und
                    // stempelte sie `verified: true` — damit war das Ranking
                    // kaeuflich per Fake-Account. Jetzt: nur aus einer echten,
                    // bereits stattgefundenen Buchung, nur von deren Beteiligten,
                    // einmal je Seite. Der Anbieter kommt aus der Buchung, nie
                    // aus dem Body.
                    if (typeof d.booking_id !== 'string' || !d.booking_id || rating === null) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'booking_id and rating required', correlationId }));
                        return;
                    }
                    const booking = ((await supabaseApi.select('scheduling', { id: d.booking_id }, { limit: 1 })) as any[])[0];
                    const beteiligt = booking && (fromRole === 'user'
                        ? (authViaApiKey || booking.user_id === authUserId)
                        : await canAccessProvider({ userId: authUserId, isAdmin: authIsAdmin, viaApiKey: authViaApiKey }, booking.provider_key));
                    if (!booking || !beteiligt) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Booking not found', correlationId }));
                        return;
                    }
                    const stattgefunden = booking.status !== 'cancelled'
                        && (booking.status === 'completed' || (booking.slot_start && new Date(booking.slot_start).getTime() <= Date.now()));
                    if (!stattgefunden) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errorCode: 'BOOKING_NOT_HELD', message: 'Reviews are possible after the consultation took place', correlationId }));
                        return;
                    }
                    const schon = (await supabaseApi.select('reviews', { booking_id: d.booking_id, from_role: fromRole }, { limit: 1 })) as any[];
                    if (schon.length) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errorCode: 'ALREADY_REVIEWED', message: 'This booking has already been reviewed', correlationId }));
                        return;
                    }
                    const providerKey: string = booking.provider_key;
                    await supabaseApi.insert('reviews', {
                        booking_id: d.booking_id,
                        provider_key: providerKey,
                        from_role: fromRole,
                        to_role: fromRole === 'user' ? 'provider' : 'user',
                        rating,
                        categories: Array.isArray(d.categories) ? d.categories : [],
                        body: typeof d.body === 'string' ? d.body.slice(0, 2000) : null,
                        verified: true, // jetzt begruendet: an eine gehaltene Buchung gebunden
                    });
                    if (fromRole === 'user') {
                        // Aggregat nur aus buchungsgebundenen Bewertungen. Alt-Zeilen
                        // ohne booking_id zaehlen nicht mehr mit.
                        try {
                            const all = (await supabaseApi.select('reviews', { provider_key: providerKey, from_role: 'user' }, { limit: 500 })) as any[];
                            const rated = all.filter((r: any) => r.rating != null && r.booking_id);
                            if (rated.length) {
                                const avg = rated.reduce((s: number, r: any) => s + Number(r.rating), 0) / rated.length;
                                await supabaseApi.update('providers', { provider_key: providerKey }, { rating: Math.round(avg * 10) / 10 });
                            }
                        } catch { /* aggregate must not break the write */ }
                    }
                    await supabaseApi.insert('event_log', { type: 'review_submitted', payload: { providerKey, bookingId: d.booking_id, fromRole, rating } });
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, correlationId }));
                } catch {
                    structuredLog('error', 'Review submit failed', { correlationId, errorCode: 'ERR_REVIEW', severity: 'error', route: req.url });
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Review submit failed', correlationId }));
                }
            });
        }
    } else if (req.method === 'POST' && req.url === '/api/v1/provider/intake') {
        // Matchmaking v2 (spec §10): token-gated provider intake. Providers are
        // recruited offline/B2B and submit their package via a link; vetting is a
        // manual admin step before partner_status becomes 'active'. The intake
        // token is issued server-side (admin) — verified here via x-api-key OR a
        // dedicated intake token in the body (checked against env secret).
        res.setHeader('x-correlation-id', correlationId);
        let intakeBody = '';
        req.on('data', (chunk: any) => intakeBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(intakeBody || '{}');
                const intakeToken = typeof d.intake_token === 'string' ? d.intake_token : '';
                const expected = process.env.PROVIDER_INTAKE_TOKEN || '';
                if (!authViaApiKey && (!expected || intakeToken !== expected)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'FORBIDDEN', message: 'Valid intake token required', correlationId }));
                    return;
                }
                const name = typeof d.name === 'string' ? d.name.trim() : '';
                if (!name) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'name required', correlationId }));
                    return;
                }
                const providerKey = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
                // Phase 3: Freitexte, die ein Nutzer vor der Buchung sieht, duerfen
                // keine Identitaet tragen. Gefunden wird benannt, nicht still
                // gespeichert — der Anbieter soll wissen, was er aendern muss.
                const intakeFindings = scanFields({
                    region: d.region, work_mode: d.work_mode, services: d.services, credentials: d.certifications,
                    excluded_services: d.excluded_services, pricing_table: d.pricing_table,
                }, { providerName: name, website: typeof d.website_url === 'string' ? d.website_url : null });
                if (intakeFindings.length) { identityRejection(res, correlationId, intakeFindings); return; }
                // B2B evidence for the reverse-charge invoicing (VAT brief #4):
                // validate the VAT ID against VIES and persist the verdict WITH
                // its timestamp. Fail-soft — a VIES outage must not block intake,
                // the admin sees the status during vetting either way.
                const vatRaw = typeof d.vat_id === 'string' ? d.vat_id : '';
                const vat = vatRaw ? await checkVatId(vatRaw) : null;
                await supabaseApi.insert('providers', {
                    provider_key: providerKey,
                    name,
                    website_url: d.website_url ?? null,
                    vat_id: vat?.vatId ?? null,
                    vat_id_status: vat?.status ?? null,
                    vat_id_checked_at: vat?.checkedAt ?? null,
                    billing_country: typeof d.billing_country === 'string' ? d.billing_country.toUpperCase().slice(0, 2) : (vat?.countryCode ?? null),
                    partner_status: 'inactive', // vetting gate: admin flips to 'active' after review
                    countries_supported: Array.isArray(d.countries_supported) ? d.countries_supported : [],
                    languages: Array.isArray(d.languages) ? d.languages : [],
                    categories: Array.isArray(d.categories) ? d.categories : [],
                    billing_model: ['abo', 'hourly', 'project', 'mixed'].includes(d.billing_model) ? d.billing_model : 'project',
                    pricing_table: d.pricing_table ?? null,
                    // pseudonym_label wird nicht mehr angenommen: der Titel vor der
                    // Buchung entsteht in der API (anonymity.ts).
                    region: d.region ?? null,
                    active_since: Number.isInteger(d.active_since) ? d.active_since : null,
                    // Dossier fuer die Partnerseite: bisher zaehlte der Intake die
                    // Nachweise nur fuer das Event-Log und warf sie dann weg. Jetzt
                    // werden sie gespeichert — sonst bleibt die Karte "Qualifikation"
                    // auf der Partnerseite fuer immer leer.
                    services: Array.isArray(d.services) ? d.services : null,
                    credentials: Array.isArray(d.certifications) ? d.certifications : null,
                    excluded_services: Array.isArray(d.excluded_services) ? d.excluded_services : null,
                    work_mode: typeof d.work_mode === 'string' ? d.work_mode.slice(0, 120) : null,
                });
                await supabaseApi.insert('event_log', { type: 'provider_intake_submitted', payload: { providerKey, certifications: Array.isArray(d.certifications) ? d.certifications.length : 0, vatIdStatus: vat?.status ?? null } });
                // Kommt der Intake mit einem Login, gehoert der neue Anbieter
                // diesem Login (provider_members). Ohne Login verknuepft ein
                // Admin spaeter per POST /api/v1/admin/provider/:key/member.
                // Ein Login, der schon einem Anbieter gehoert, bekommt keinen zweiten.
                if (authUserId && !authViaApiKey) {
                    const schonMitglied = (await supabaseApi.select('provider_members', { user_id: authUserId }, { limit: 1 })) as any[];
                    if (!schonMitglied.length) {
                        await supabaseApi.insert('provider_members', { provider_key: providerKey, user_id: authUserId, role: 'owner' });
                    }
                }
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, provider_key: providerKey, status: 'in_review', vat_id_status: vat?.status ?? null, correlationId }));
            } catch {
                structuredLog('error', 'Provider intake failed', { correlationId, errorCode: 'ERR_INTAKE', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Provider intake failed', correlationId }));
            }
        });
    } else if (req.method === 'GET' && /^\/api\/v1\/provider\/[a-z0-9-]+\/coverage$/.test(req.url || '')) {
        // B5: current public coverage for the Add-Market drawer.
        const providerKey = (req.url || '').split('/')[4];
        try {
            const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as
                Array<{ provider_key: string; name: string; countries_supported: string[]; languages: string[]; sla_target_confirm_hours: number }>;
            if (!rows[0]) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                return;
            }
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, coverage: rows[0] }));
        } catch {
            structuredLog('error', 'Coverage fetch failed', { correlationId, errorCode: 'ERR_COVERAGE', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Coverage fetch failed', correlationId }));
        }
    } else if (req.method === 'PATCH' && /^\/api\/v1\/provider\/[a-z0-9-]+\/coverage$/.test(req.url || '')) {
        // B5: add a market to the provider's coverage. New markets require a
        // 2-business-day re-verification before ranking — recorded as an event.
        const providerKey = (req.url || '').split('/')[4];
        let covBody = '';
        req.on('data', (chunk: any) => covBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(covBody || '{}');
                const country = typeof d.add_country === 'string' ? d.add_country.trim().toUpperCase().slice(0, 2) : '';
                if (!/^[A-Z]{2}$/.test(country)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'add_country (ISO-2) required', correlationId }));
                    return;
                }
                const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as
                    Array<{ countries_supported: string[] | null }>;
                if (!rows[0]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                    return;
                }
                const current = rows[0].countries_supported ?? [];
                if (current.includes(country)) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'ALREADY_COVERED', message: `${country} is already in your coverage`, correlationId }));
                    return;
                }
                await supabaseApi.update('providers', { provider_key: providerKey }, {
                    countries_supported: [...current, country],
                    updated_at: new Date().toISOString(),
                });
                await supabaseApi.insert('event_log', {
                    type: 'provider_coverage_updated',
                    payload: { providerKey, added: country, verification: 'pending-2bd' },
                });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, providerKey, countries_supported: [...current, country], verification: 'pending-2bd' }));
            } catch {
                structuredLog('error', 'Coverage patch failed', { correlationId, errorCode: 'ERR_COVERAGE_PATCH', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Coverage update failed', correlationId }));
            }
        });
    } else if (req.method === 'PATCH' && /^\/api\/v1\/provider\/[a-z0-9-]+\/profile$/.test(req.url || '')) {
        // Matchmaking v2 (spec §10): provider self-service for the anonymous
        // listing card + detail page — billing model, full pricing table and the
        // anonymized identity fields. All provider-entered, editable any time.
        const providerKey = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        let profBody = '';
        req.on('data', (chunk: any) => profBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(profBody || '{}');
                const patch: Record<string, unknown> = {};
                if (typeof d.billing_model === 'string' && ['abo', 'hourly', 'project', 'mixed'].includes(d.billing_model)) patch.billing_model = d.billing_model;
                if (d.pricing_table !== undefined) patch.pricing_table = d.pricing_table;
                // pseudonym_label wird seit Phase 3 ignoriert (kein Fehler): der
                // Titel entsteht in der API. Region und Preistabelle laufen durch
                // den Identitaets-Scan, weil ein Nutzer sie vor der Buchung sieht.
                if (typeof d.region === 'string') patch.region = d.region.slice(0, 80);
                {
                    const own = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
                    const findings = scanFields({ region: patch.region, pricing_table: patch.pricing_table }, identityCtx(own[0]));
                    if (findings.length) { identityRejection(res, correlationId, findings); return; }
                }
                if (Number.isInteger(d.active_since)) patch.active_since = d.active_since;
                if (Object.keys(patch).length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'No valid profile fields', correlationId }));
                    return;
                }
                patch.updated_at = new Date().toISOString();
                await supabaseApi.update('providers', { provider_key: providerKey }, patch);
                await supabaseApi.insert('event_log', { type: 'provider_profile_updated', payload: { providerKey, fields: Object.keys(patch) } });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, providerKey, updated: Object.keys(patch), correlationId }));
            } catch {
                structuredLog('error', 'Provider profile update failed', { correlationId, errorCode: 'ERR_PROFILE', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Profile update failed', correlationId }));
            }
        });
    } else if (req.method === 'GET' && /^\/api\/v1\/provider\/[a-z0-9-]+\/invoices$/.test(req.url || '')) {
        // B7: invoice history incl. line items. Stripe-issued via the monthly
        // billing run; open rows pull their payment status here.
        // Why polling and not a webhook: this was once justified with the
        // staging basic-auth wall supposedly sitting in front of /api. That is
        // wrong — the API's Traefik router carries only `complihub-noindex`
        // (checked 2026-08-30). No webhook endpoint has been built yet, so the
        // polling stays until one is; the wall was never the reason.
        const providerKey = (req.url || '').split('/')[4];
        try {
            await syncOpenInvoices(providerKey).catch(() => { /* list still renders */ });
            const invoices = await supabaseApi.select('invoices', { provider_key: providerKey }, { order: 'period.desc', limit: 24 });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, invoices }));
        } catch {
            structuredLog('error', 'Invoices fetch failed', { correlationId, errorCode: 'ERR_INVOICES', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Invoices fetch failed', correlationId }));
        }
    } else if (req.method === 'PATCH' && /^\/api\/v1\/provider\/[a-z0-9-]+\/availability$/.test(req.url || '')) {
        // C2: availability toggle. 'ooo' re-routes new requests + freezes rank.
        const providerKey = (req.url || '').split('/')[4];
        let availBody = '';
        req.on('data', (chunk: any) => availBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(availBody || '{}');
                if (!['available', 'ooo'].includes(d.status)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: "status must be 'available' or 'ooo'", correlationId }));
                    return;
                }
                const updated = (await supabaseApi.update('providers', { provider_key: providerKey }, {
                    availability: d.status,
                    ooo_until: d.status === 'ooo' ? (d.until ?? null) : null,
                    updated_at: new Date().toISOString(),
                })) as unknown[];
                if (!updated.length) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                    return;
                }
                await supabaseApi.insert('event_log', {
                    type: 'provider_availability_changed',
                    payload: { providerKey, status: d.status, until: d.until ?? null },
                });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, providerKey, availability: d.status, ooo_until: d.status === 'ooo' ? (d.until ?? null) : null }));
            } catch {
                structuredLog('error', 'Availability patch failed', { correlationId, errorCode: 'ERR_AVAILABILITY', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Availability update failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && /^\/api\/v1\/provider\/[a-z0-9-]+\/billing-portal$/.test(req.url || '')) {
        // C3: Stripe billing portal (spec: Stripe-issued invoices + payment
        // methods). Lazily creates the Stripe customer on first use. Returns
        // 503 with a clear code until STRIPE_SECRET_KEY is configured.
        const providerKey = (req.url || '').split('/')[4];
        try {
            if (!isStripeConfigured()) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not connected yet', correlationId }));
                return;
            }
            const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as
                Array<{ name: string; contact_email?: string | null; stripe_customer_id?: string | null }>;
            if (!rows[0]) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                return;
            }
            const customerId = await ensureStripeCustomer(providerKey);
            const appUrl = (process.env.PUBLIC_APP_URL || 'https://staging.complihub360.com').replace(/\/$/, '');
            // `?from=portal`: die Abrechnungsseite stoesst beim Rueckweg den
            // Readiness-Sync an (Phase 4) — so wird aus einer neuen Karte ohne
            // Webhook sofort `billing_ready`.
            const session = await stripeRequest('POST', 'billing_portal/sessions', {
                customer: customerId,
                return_url: `${appUrl}/en/partner-dashboard/billing?from=portal`,
            });
            await supabaseApi.insert('event_log', { type: 'billing_portal_opened', payload: { providerKey } });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, url: session.url }));
        } catch {
            structuredLog('error', 'Billing portal failed', { correlationId, errorCode: 'ERR_BILLING_PORTAL', severity: 'error', route: req.url });
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'STRIPE_ERROR', message: 'Stripe request failed', correlationId }));
        }
    } else if (req.method === 'POST' && /^\/api\/v1\/provider\/[a-z0-9-]+\/change-email$/.test(req.url || '')) {
        // B8: request a contact-email change. A single-use verify link (1h)
        // goes to the NEW address; nothing changes until it is clicked.
        const providerKey = (req.url || '').split('/')[4];
        let ceBody = '';
        req.on('data', (chunk: any) => ceBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(ceBody || '{}');
                const newEmail = typeof d.new_email === 'string' ? d.new_email.trim().toLowerCase() : '';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'new_email must be a valid address', correlationId }));
                    return;
                }
                const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as
                    Array<{ name: string; contact_email?: string | null }>;
                if (!rows[0]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                    return;
                }
                if ((rows[0].contact_email ?? '').toLowerCase() === newEmail) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'SAME_ADDRESS', message: 'This is already the contact address', correlationId }));
                    return;
                }
                const nodeCrypto = await import('node:crypto');
                const rawToken = nodeCrypto.randomBytes(32).toString('base64url');
                const tokenHash = nodeCrypto.createHash('sha256').update(rawToken).digest('hex');
                await supabaseApi.insert('email_change_tokens', {
                    provider_key: providerKey,
                    new_email: newEmail,
                    token_hash: tokenHash,
                    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                });
                await supabaseApi.insert('event_log', {
                    type: 'provider_email_change_requested',
                    payload: { providerKey, newEmailDomain: newEmail.split('@')[1] },
                });
                (async () => {
                    await sendEmailChangeMail({
                        providerKey,
                        providerName: rows[0].name || providerKey,
                        newEmail,
                        confirmQuery: `?token=${rawToken}`,
                        correlationId,
                        locale: typeof d.locale === 'string' ? d.locale : undefined,
                    });
                })().catch(() => { /* logged inside the mailer */ });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, sent: true }));
            } catch {
                structuredLog('error', 'Email change request failed', { correlationId, errorCode: 'ERR_EMAIL_CHANGE', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Email change request failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/provider/confirm-email') {
        // B8: redeem the verify token — applies the new contact address.
        let confBody = '';
        req.on('data', (chunk: any) => confBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(confBody || '{}');
                const token = typeof d.token === 'string' ? d.token : '';
                const nodeCrypto = await import('node:crypto');
                const tokenHash = nodeCrypto.createHash('sha256').update(token).digest('hex');
                const rows = (await supabaseApi.select('email_change_tokens', { token_hash: tokenHash }, { limit: 1 })) as
                    Array<{ id: string; provider_key: string; new_email: string; expires_at: string; used_at: string | null }>;
                const t = rows[0];
                if (!t || t.used_at || new Date(t.expires_at).getTime() < Date.now()) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'INVALID_TOKEN', message: 'Link is invalid, used, or expired', correlationId }));
                    return;
                }
                const now = new Date().toISOString();
                await supabaseApi.update('email_change_tokens', { id: t.id }, { used_at: now });
                await supabaseApi.update('providers', { provider_key: t.provider_key }, { contact_email: t.new_email, updated_at: now });
                await supabaseApi.insert('event_log', {
                    type: 'provider_email_changed',
                    payload: { providerKey: t.provider_key, newEmailDomain: t.new_email.split('@')[1] },
                });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, providerKey: t.provider_key, contact_email: t.new_email }));
            } catch {
                structuredLog('error', 'Email change confirm failed', { correlationId, errorCode: 'ERR_EMAIL_CONFIRM', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Email change confirm failed', correlationId }));
            }
        });
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/alert-prefs')) {
        // B15: alert preferences for an owner key (guest_key today).
        try {
            const u = new URL(req.url, 'http://localhost');
            const owner = u.searchParams.get('owner') || 'demo-user';
            const rows = (await supabaseApi.select('alert_prefs', { owner_key: owner })) as Array<{ prefs: Record<string, unknown> }>;
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, owner, prefs: rows[0]?.prefs ?? null }));
        } catch {
            structuredLog('error', 'Alert prefs fetch failed', { correlationId, errorCode: 'ERR_ALERT_PREFS', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Alert prefs fetch failed', correlationId }));
        }
    } else if (req.method === 'PUT' && req.url === '/api/v1/alert-prefs') {
        // B15: upsert alert preferences.
        let prefsBody = '';
        req.on('data', (chunk: any) => prefsBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(prefsBody || '{}');
                const owner = typeof d.owner === 'string' && d.owner ? d.owner.slice(0, 120) : 'demo-user';
                const prefs = d.prefs && typeof d.prefs === 'object' ? d.prefs : {};
                const now = new Date().toISOString();
                const updated = (await supabaseApi.update('alert_prefs', { owner_key: owner }, { prefs, updated_at: now })) as unknown[];
                if (!updated.length) await supabaseApi.insert('alert_prefs', { owner_key: owner, prefs, updated_at: now });
                await supabaseApi.insert('event_log', { type: 'alert_prefs_updated', payload: { owner } });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, owner, prefs }));
            } catch {
                structuredLog('error', 'Alert prefs save failed', { correlationId, errorCode: 'ERR_ALERT_PREFS', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Alert prefs save failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/market-requests') {
        // „Request This Market“ (Zustand marketUnavailable). Pruefung und Zeile
        // in marketRequests.ts; hier nur Upsert und Protokoll. Das Protokoll
        // traegt den Markt, nie den guest_key.
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            res.setHeader('x-correlation-id', correlationId);
            let input: Record<string, unknown>;
            try {
                input = JSON.parse(body || '{}');
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INVALID_JSON', message: 'Invalid JSON payload', correlationId }));
                return;
            }
            const check = checkMarketRequest(input, authUserId);
            if (!check.ok) {
                res.writeHead(check.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: check.errorCode, message: check.message, correlationId }));
                return;
            }
            try {
                await supabaseApi.upsert('market_requests', 'requester_key,market', check.row);
                await supabaseApi.insert('event_log', {
                    type: 'market_requested',
                    payload: { market: check.row.market, account: !!check.row.user_id, notify: check.row.notify },
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, market: check.row.market, notify: check.row.notify }));
            } catch (err) {
                structuredLog('error', 'Market request failed', { correlationId, errorCode: 'ERR_MARKET_REQUEST', severity: 'error', route: req.url, detail: String(err).slice(0, 500) });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Market request failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/session') {
        // Wave A1: persist a wizard session (guest via guest_key, later adopted
        // by the account). The session is the user-side dossier source.
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(body);
                if (!d.guest_key && !d.user_id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'guest_key or user_id required', correlationId }));
                    return;
                }
                const inserted = (await supabaseApi.insert('sessions', {
                    user_id: d.user_id || null,
                    guest_key: d.guest_key || null,
                    country: d.country || null,
                    markets: d.markets || [],
                    categories: d.categories || [],
                    answers: d.answers || {},
                    risk_summary: d.risk_summary || null,
                })) as Array<{ id: string }>;
                await supabaseApi.insert('event_log', { type: 'session_saved', payload: { sessionId: inserted?.[0]?.id, guest: !d.user_id } });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, id: inserted?.[0]?.id }));
            } catch {
                structuredLog('error', 'Session save failed', { correlationId, errorCode: 'ERR_SESSION', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Session save failed', correlationId }));
            }
        });
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/sessions')) {
        // Zwei Ausweise, nach Rang: ein verifizierter JWT schlaegt den
        // guest_key. Der guest_key steht im localStorage EINES Browsers —
        // wer sich am Telefon anmeldet, haette damit eine leere Liste, obwohl
        // die Sitzungen laengst seinem Konto gehoeren (adoption.ts setzt
        // user_id und laesst guest_key stehen). Deshalb entscheidet die
        // Anmeldung, nicht das Geraet.
        try {
            const u = new URL(req.url, 'http://localhost');
            const guestKey = u.searchParams.get('guest_key');
            if (!authUserId && !guestKey) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'guest_key required', correlationId }));
                return;
            }
            const filter = authUserId ? { user_id: authUserId } : { guest_key: guestKey as string };
            const rows = await supabaseApi.select('sessions', filter, { order: 'created_at.desc', limit: 20 });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, sessions: rows }));
        } catch {
            structuredLog('error', 'Sessions list failed', { correlationId, errorCode: 'ERR_SESSIONS', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Sessions list failed', correlationId }));
        }
    } else if (req.method === 'GET' && /^\/api\/v1\/engagement\/[0-9a-f-]{36}$/.test(req.url || '')) {
        // Wave B: engagement detail + thread — one payload for the Thread-Drawer
        // on both sides (provider /requests · user /requests).
        const engagementId = (req.url || '').split('/').pop() as string;
        try {
            const eng = (await supabaseApi.select('engagement_requests', { id: engagementId }, { limit: 1 })) as Array<Record<string, unknown>>;
            if (!eng[0]) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Engagement not found', correlationId }));
                return;
            }
            const messages = await supabaseApi.select('engagement_messages', { engagement_id: engagementId }, { order: 'created_at.asc', limit: 100 });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, engagement: eng[0], messages }));
        } catch {
            structuredLog('error', 'Engagement detail failed', { correlationId, errorCode: 'ERR_ENGAGEMENT_DETAIL', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Engagement detail failed', correlationId }));
        }
    } else if (req.method === 'POST' && /^\/api\/v1\/engagement\/[0-9a-f-]{36}\/message$/.test(req.url || '')) {
        // Thread message from the dashboards (author user|provider). Magic-link
        // replies land here too via the provider/reply handler.
        const engagementId = (req.url || '').split('/')[4];
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(body);
                if (!d.body || typeof d.body !== 'string' || !['user', 'provider'].includes(d.author)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'author (user|provider) and body required', correlationId }));
                    return;
                }
                // B1 (Provider Flows §5): optional structured proposal on a reply.
                let proposal: Record<string, unknown> | null = null;
                if (d.proposal && typeof d.proposal === 'object') {
                    const p = d.proposal as Record<string, unknown>;
                    proposal = {
                        ...(typeof p.price_range === 'string' && p.price_range ? { price_range: p.price_range.slice(0, 120) } : {}),
                        ...(typeof p.timeline === 'string' && p.timeline ? { timeline: p.timeline.slice(0, 120) } : {}),
                        ...(Array.isArray(p.deliverables) ? { deliverables: p.deliverables.filter((x: unknown) => typeof x === 'string').slice(0, 10).map((x: string) => x.slice(0, 160)) } : {}),
                        ...(typeof p.engagement_model === 'string' && p.engagement_model ? { engagement_model: p.engagement_model.slice(0, 60) } : {}),
                    };
                    if (!Object.keys(proposal).length) proposal = null;
                }
                const inserted = (await supabaseApi.insert('engagement_messages', {
                    engagement_id: engagementId, author: d.author, body: d.body,
                    ...(proposal ? { proposal } : {}),
                })) as Array<{ id: string; created_at: string }>;
                await supabaseApi.insert('event_log', {
                    type: 'engagement_message_posted',
                    payload: { engagementId, author: d.author },
                });
                // Nur die Gegenrichtung: schreibt der Anbieter, erfaehrt es der
                // Anfragende. Schreibt der Anfragende, gibt es (noch) niemanden
                // zu benachrichtigen — Anbieter haengen an keinem Konto.
                if (d.author === 'provider') {
                    const msgEng = (await supabaseApi.select('engagement_requests', { id: engagementId }, { limit: 1 })) as
                        Array<{ user_id?: string | null; provider_key?: string | null }>;
                    await notify({
                        to: msgEng[0]?.user_id, type: 'engagement_message',
                        subject: 'engagement', subjectId: engagementId,
                        payload: { providerRef: await refOf(msgEng[0]?.provider_key) },
                    });
                }
                if (proposal) {
                    await supabaseApi.insert('event_log', {
                        type: 'proposal_submitted',
                        payload: { engagementId, fields: Object.keys(proposal) },
                    });
                }
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, id: inserted?.[0]?.id, created_at: inserted?.[0]?.created_at }));
            } catch {
                structuredLog('error', 'Thread message failed', { correlationId, errorCode: 'ERR_THREAD_MSG', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Thread message failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && /^\/api\/v1\/engagement\/[0-9a-f-]{36}\/remind$/.test(req.url || '')) {
        // B14: manual reminder — re-issue fresh single-use magic links and send
        // the mail again with an urgent subject. Only while awaiting confirm.
        // Core logic lives in issueReminder() (watchers.ts) so the manual route
        // and the autonomous SLA watcher share one code path.
        const engagementId = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        // Eigentuemer-Bindung (2026-09-05, gleiches Muster wie Anfragen-Liste
        // und Pflicht-Staende): nur der Ersteller (oder der Server-Key) darf
        // erinnern — fremde Anfragen bleiben ein 404.
        const own = (await supabaseApi.select('engagement_requests', { id: engagementId }, { limit: 1 })) as
            Array<{ id: string; user_id?: string | null }>;
        if (!own[0] || !(authViaApiKey || (authUserId && own[0].user_id === authUserId))) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Engagement not found', correlationId }));
            return;
        }
        const reminderOutcome = await issueReminder(engagementId, { auto: false });
        if (reminderOutcome === 'not_found') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Engagement not found', correlationId }));
        } else if (reminderOutcome === 'invalid_state') {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INVALID_STATE', message: 'Cannot remind — request is not awaiting confirmation', correlationId }));
        } else if (reminderOutcome === 'error') {
            structuredLog('error', 'Reminder failed', { correlationId, errorCode: 'ERR_REMIND', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Reminder failed', correlationId }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, id: engagementId, reminded: true }));
        }
    } else if (req.method === 'POST' && /^\/api\/v1\/engagement\/[0-9a-f-]{36}\/withdraw$/.test(req.url || '')) {
        // B14: the requester withdraws an open request. Terminal state; all
        // open magic links are invalidated so the mailed buttons stop working.
        const engagementId = (req.url || '').split('/')[4];
        try {
            const eng = (await supabaseApi.select('engagement_requests', { id: engagementId }, { limit: 1 })) as
                Array<{ id: string; status: string; user_id?: string | null }>;
            // Eigentuemer-Bindung (2026-09-05): fremde Anfragen sind ein 404.
            if (!eng[0] || !(authViaApiKey || (authUserId && eng[0].user_id === authUserId))) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Engagement not found', correlationId }));
                return;
            }
            // 'expired' darf ebenfalls zurueckgezogen werden (Befund 2026-09-05):
            // sonst blieb eine vom Anbieter verpasste Anfrage fuer immer unter
            // "Wartet auf Sie", ohne dass der Nutzer sie schliessen konnte.
            if (!['created', 'delivered', 'viewed', 'expired'].includes(eng[0].status)) {
                res.writeHead(409, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INVALID_STATE', message: `Cannot withdraw in status '${eng[0].status}'`, correlationId }));
                return;
            }
            const now = new Date().toISOString();
            await supabaseApi.update('engagement_requests', { id: engagementId }, { status: 'withdrawn', updated_at: now });
            // Burn every still-open token for this engagement.
            const tokens = (await supabaseApi.select('magic_link_tokens', { engagement_id: engagementId })) as
                Array<{ id: string; used_at: string | null }>;
            for (const t of tokens.filter(t => !t.used_at)) {
                await supabaseApi.update('magic_link_tokens', { id: t.id }, { used_at: now });
            }
            await supabaseApi.insert('event_log', { type: 'engagement_withdrawn', payload: { engagementId } });
            await supabaseApi.insert('engagement_messages', {
                engagement_id: engagementId, author: 'system', body: 'Request withdrawn by the client — all pending action links were deactivated.',
            }).catch(() => { /* thread note is best-effort */ });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, id: engagementId, status: 'withdrawn' }));
        } catch {
            structuredLog('error', 'Withdraw failed', { correlationId, errorCode: 'ERR_WITHDRAW', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Withdraw failed', correlationId }));
        }
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/admin/stats')) {
        // Admin control center: one aggregated read across engagements, the
        // audit log and the privacy pipeline. Approximations share the caveats
        // of /metrics (no per-transition timestamps yet).
        // Befund Phase 2 (2026-09-22): bis dahin reichte jeder Login — das
        // Protokoll mit Anbieter-Schluesseln und Anfragen-Status war fuer jeden
        // Nutzer lesbar. Jetzt wie Cockpit: Admin-JWT oder Server-Key.
        res.setHeader('x-correlation-id', correlationId);
        if (!authViaApiKey && !authIsAdmin) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'FORBIDDEN', message: 'Admin stats are admin-only', correlationId }));
            return;
        }
        try {
            const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
            const engagements = (await supabaseApi.select('engagement_requests', {}, { order: 'created_at.desc', limit: 500 })) as
                Array<{ id: string; provider_key: string; country: string; category: string; status: string; created_at: string; updated_at?: string; sla_confirm_deadline?: string; sla_reply_deadline?: string }>;
            const events = (await supabaseApi.select('event_log', {}, { order: 'timestamp.desc', limit: 100 })) as
                Array<{ type: string; payload?: Record<string, unknown>; timestamp?: string; created_at?: string }>;
            const documents = (await supabaseApi.select('documents', {}, { order: 'created_at.desc', limit: 200 })) as
                Array<{ classification: string; sanitized_ready: boolean; consent_ai?: boolean; ai_allowed: boolean; created_at?: string; redaction_report?: { countsByType?: Record<string, number> } }>;

            const total = engagements.length;
            const confirmedPlus = engagements.filter(r => r.status === 'confirmed' || r.status === 'replied');
            const requestsToday = engagements.filter(r => new Date(r.created_at) >= dayStart).length;
            const avgMs = (subset: typeof engagements) => {
                const ds = subset.filter(r => r.updated_at)
                    .map(r => new Date(r.updated_at as string).getTime() - new Date(r.created_at).getTime())
                    .filter(d => d > 0);
                return ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : null;
            };
            const now = Date.now();
            const OPEN_CONFIRM = ['created', 'delivered', 'viewed'];
            const watchlist = engagements
                .filter(r => OPEN_CONFIRM.includes(r.status) || r.status === 'confirmed')
                .map(r => {
                    const deadline = OPEN_CONFIRM.includes(r.status) ? r.sla_confirm_deadline : r.sla_reply_deadline;
                    return { id: r.id, provider_key: r.provider_key, country: r.country, category: r.category, status: r.status, deadline, msLeft: deadline ? new Date(deadline).getTime() - now : null };
                })
                .sort((a, b) => (a.msLeft ?? Infinity) - (b.msLeft ?? Infinity))
                .slice(0, 10);
            const redacted = documents.reduce((s, d) => s + Object.values(d.redaction_report?.countsByType || {}).reduce((a, b) => a + b, 0), 0);
            const consentGiven = documents.filter(d => d.consent_ai === true).length;
            const stats = {
                requestsToday,
                requestsTotal: total,
                confirmRate: total ? confirmedPlus.length / total : null,
                replyRate: confirmedPlus.length ? engagements.filter(r => r.status === 'replied').length / confirmedPlus.length : null,
                avgConfirmMs: avgMs(confirmedPlus),
                breaches: engagements.filter(r => r.status === 'expired').length + watchlist.filter(w => (w.msLeft ?? 1) < 0).length,
            };
            const privacy = {
                uploads: documents.length,
                piiRedacted: redacted,
                consentRate: documents.length ? consentGiven / documents.length : null,
                aiBlocks: events.filter(e => e.type === 'document_ai_blocked').length,
            };
            const security = {
                invalidTokenBlocks: events.filter(e => /invalid_token|magic.*(invalid|expired|used)/i.test(e.type)).length,
                aiGateBlocks: events.filter(e => e.type === 'document_ai_blocked').length,
            };
            const feed = events.slice(0, 12).map(e => ({ ...e, created_at: e.created_at || e.timestamp }));

            // ── 7-day trend series (for the Control Center metric charts) ──────
            // Aggregated from the same in-memory reads; UTC day buckets, oldest → newest.
            const dayKeys: string[] = [];
            for (let i = 6; i >= 0; i--) {
                const dt = new Date(); dt.setUTCHours(0, 0, 0, 0); dt.setUTCDate(dt.getUTCDate() - i);
                dayKeys.push(dt.toISOString().slice(0, 10));
            }
            const dates = dayKeys.map(k => `${k.slice(8, 10)}.${k.slice(5, 7)}`);
            const idxOf = (iso?: string) => dayKeys.indexOf((iso || '').slice(0, 10));
            const bucket = () => new Array(7).fill(0) as number[];
            const reqB = bucket(), confB = bucket(), breachB = bucket(), upB = bucket(), piiB = bucket(), aiB = bucket(), docTotB = bucket(), consB = bucket();
            for (const e of engagements) {
                const ci = idxOf(e.created_at); if (ci >= 0) reqB[ci]++;
                const ui = idxOf(e.updated_at);
                if (ui >= 0 && (e.status === 'confirmed' || e.status === 'replied')) confB[ui]++;
                if (ui >= 0 && e.status === 'expired') breachB[ui]++;
            }
            for (const d of documents) {
                const di = idxOf(d.created_at); if (di < 0) continue;
                upB[di]++; docTotB[di]++;
                piiB[di] += Object.values(d.redaction_report?.countsByType || {}).reduce((a, b) => a + b, 0);
                if (d.consent_ai === true) consB[di]++;
            }
            for (const ev of events) {
                if (ev.type === 'document_ai_blocked') { const ei = idxOf(ev.created_at || ev.timestamp); if (ei >= 0) aiB[ei]++; }
            }
            const series = {
                dates,
                requests: reqB,
                confirmRate: reqB.map((r, i) => (r ? Math.round((confB[i] / r) * 100) : 0)),
                breaches: breachB,
                uploads: upB,
                pii: piiB,
                consent: docTotB.map((tt, i) => (tt ? Math.round((consB[i] / tt) * 100) : 0)),
                aiBlocks: aiB,
            };

            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, stats, watchlist, privacy, security, events: feed, series }));
        } catch {
            structuredLog('error', 'Admin stats failed', { correlationId, errorCode: 'ERR_ADMIN_STATS', severity: 'error', route: req.url });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to compute admin stats', correlationId }));
        }
    } else if (req.method === 'POST' && req.url === '/api/v1/document/upload') {
        // P0 #5: document upload runs through the redaction pipeline BEFORE any
        // persistence — only sanitized content is stored; raw text is discarded
        // here (raw-vault storage is a separate, later concern). The AI gate
        // (sanitized_ready + ai_allowed) is derived from the redaction result.
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body);
                const { filename, mimeType, text, engagementId, userId } = requestData;
                if (!filename || typeof filename !== 'string' || !text || typeof text !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'filename and text are required', correlationId }));
                    return;
                }
                // Consent gate (Art. 6(1)(a) / Art. 7 GDPR): AI eligibility requires
                // an explicit opt-in with this upload — absence or anything other
                // than boolean true counts as NO consent. The document is still
                // stored (sanitized); it just never becomes ai_allowed.
                const consentAI = requestData.consentAI === true;
                const redaction = redactText(text, { profile: 'strict' });
                const aiAllowed = redaction.sanitized_ready && redaction.classification !== 'restricted' && consentAI;
                const inserted = (await supabaseApi.insert('documents', {
                    engagement_id: engagementId || null,
                    user_id: userId || null,
                    filename,
                    mime_type: mimeType || null,
                    content_sanitized: redaction.sanitizedText,
                    redaction_report: redaction.report,
                    classification: redaction.classification,
                    sanitized_ready: redaction.sanitized_ready,
                    consent_ai: consentAI,
                    ai_allowed: aiAllowed
                })) as Array<{ id: string }>;
                const documentId = inserted?.[0]?.id;
                await supabaseApi.insert('event_log', {
                    type: 'document_uploaded',
                    payload: { documentId, filename, classification: redaction.classification, sanitized_ready: redaction.sanitized_ready, consentAI, riskScore: redaction.report.riskScore }
                });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, id: documentId, sanitized_ready: redaction.sanitized_ready, consent_ai: consentAI, ai_allowed: aiAllowed, classification: redaction.classification, report: redaction.report }));
            } catch {
                structuredLog('error', 'Document upload failed', { correlationId, errorCode: 'ERR_DOC_UPLOAD', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Document upload failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/document/request-ai') {
        // P0 #5: the AI gate — a document may only enter any AI flow when the
        // privacy pipeline marked it sanitized_ready AND ai_allowed.
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { documentId } = JSON.parse(body);
                if (!documentId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'documentId is required', correlationId }));
                    return;
                }
                const rows = (await supabaseApi.select('documents', { id: documentId }, { limit: 1 })) as
                    Array<{ id: string; sanitized_ready: boolean; consent_ai: boolean; ai_allowed: boolean; classification: string; content_sanitized: string }>;
                const doc = rows[0];
                if (!doc) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Document not found', correlationId }));
                    return;
                }
                // Defense in depth: ai_allowed already encodes consent at upload
                // time, but the gate re-checks each condition so a later data fix
                // or consent withdrawal (consent_ai=false) is honored immediately.
                if (!doc.sanitized_ready || !doc.consent_ai || !doc.ai_allowed) {
                    const reason = !doc.consent_ai ? 'NO_CONSENT' : 'NOT_SANITIZED';
                    await supabaseApi.insert('event_log', { type: 'document_ai_blocked', payload: { documentId, classification: doc.classification, reason } });
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'PRIVACY_GATE', reason, message: 'Document is not cleared for AI processing', classification: doc.classification, correlationId }));
                    return;
                }
                await supabaseApi.insert('event_log', { type: 'document_ai_requested', payload: { documentId } });
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(202, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, id: documentId, status: 'queued', message: 'Document accepted for AI processing (sanitized content only)' }));
            } catch {
                structuredLog('error', 'Document AI request failed', { correlationId, errorCode: 'ERR_DOC_AI', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Document AI request failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/engagement') {
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body);
                // Note: The ID generation will be handled by the DB via uuid_generate_v4()
                // so we don't strictly need to generate it, but we can generate one to return it immediately
                const crypto = await import('crypto');
                const engagementId = crypto.randomUUID();

                const newEngagement = {
                    id: engagementId,
                    // Der Ersteller kommt aus dem GEPRUEFTEN Token, nie aus dem
                    // Body. Vorher stand hier requestData.user_id — ein
                    // angemeldetes Konto haette Anfragen im Namen jedes anderen
                    // anlegen koennen. Und weil das Frontend das Feld nie
                    // schickte, gehoerte bis 2026-08-31 KEINE einzige
                    // UI-Anfrage jemandem (user_id NULL) — womit auch jede
                    // provider_confirmed/replied/declined-Benachrichtigung ins
                    // Leere lief: notify() hat ohne Empfaenger nichts zu tun.
                    user_id: authUserId || undefined,
                    // Wave A7: link the wizard session + carry the requester
                    // identity (revealed only via the dossier unlock).
                    session_id: requestData.session_id || undefined,
                    provider_key: requestData.provider_key,
                    country: requestData.country,
                    category: requestData.category,
                    structured_answers: {
                        ...(requestData.structured_answers || {}),
                        ...(requestData.requester_email ? { requester_email: requestData.requester_email } : {}),
                        ...(requestData.company ? { company: requestData.company } : {}),
                    },
                    message: requestData.message || "",
                    status: 'created',
                    sla_confirm_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    // Contract (Provider Flows §6.1 / Marketplace Ops §5.1): reply SLA is 48h, not 72h.
                    sla_reply_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                await supabaseApi.insert('engagement_requests', newEngagement);

                // P0 #1: issue signed, expiring, single-use magic-link tokens
                // (one per provider action). Only the SHA-256 hash is stored;
                // the raw tokens go into the e-mail links.
                const nodeCrypto = await import('node:crypto');
                const magicLinks: Record<string, string> = {};
                for (const action of ['confirm', 'reply', 'decline'] as const) {
                    const rawToken = nodeCrypto.randomBytes(32).toString('base64url');
                    const tokenHash = nodeCrypto.createHash('sha256').update(rawToken).digest('hex');
                    await supabaseApi.insert('magic_link_tokens', {
                        engagement_id: engagementId,
                        action,
                        token_hash: tokenHash,
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                    });
                    magicLinks[action] = `?id=${engagementId}&token=${rawToken}`;
                }

                // Wave B: the requester's opening message seeds the thread.
                if (newEngagement.message) {
                    await supabaseApi.insert('engagement_messages', {
                        engagement_id: engagementId, author: 'user', body: newEngagement.message,
                    }).catch(() => { /* thread is best-effort at creation time */ });
                }

                await supabaseApi.insert('event_log', {
                    type: 'primary_request_submitted',
                    payload: { engagementId, provider_key: newEngagement.provider_key }
                });

                // Funnel: deliver the magic links to the provider (Resend if
                // configured, e-mail outbox log otherwise). Fire-and-forget —
                // the engagement + tokens exist regardless of delivery.
                (async () => {
                    const provRows = (await supabaseApi.select('providers', { provider_key: newEngagement.provider_key }, { limit: 1 })) as
                        Array<{ name: string; contact_email?: string | null }>;
                    await sendMagicLinkMail({
                        engagementId,
                        providerKey: newEngagement.provider_key,
                        providerName: provRows[0]?.name || newEngagement.provider_key,
                        contactEmail: provRows[0]?.contact_email ?? null,
                        country: newEngagement.country,
                        category: newEngagement.category,
                        message: newEngagement.message,
                        magicLinks,
                        correlationId,
                        locale: typeof requestData.locale === 'string' ? requestData.locale : undefined,
                    });
                })().catch(() => { /* logged inside the mailer */ });

                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, id: engagementId, status: 'created', magicLinks }));
            } catch (err) {
                console.error("Engagement request error:", err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'BAD_REQUEST', message: 'Invalid payload or DB error' }));
            }
        });
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/provider/magic/')) {
        // P0 #1: real token lookup — hash, match, expiry + single-use check.
        const token = req.url.split('/').pop() || '';
        try {
            const nodeCrypto = await import('node:crypto');
            const tokenHash = nodeCrypto.createHash('sha256').update(token).digest('hex');
            const rows = (await supabaseApi.select('magic_link_tokens', { token_hash: tokenHash }, { limit: 1 })) as
                Array<{ engagement_id: string; action: string; expires_at: string; used_at: string | null }>;
            const row = rows[0];
            const valid = !!row && row.used_at === null && new Date(row.expires_at).getTime() > Date.now();
            // Anonymized dossier (Addendum 2026-07-10): situational context +
            // redacted message. Requester identity is NEVER in this response —
            // it unlocks only via the confirm action.
            let dossier: Record<string, unknown> | null = null;
            if (valid) {
                const eng = (await supabaseApi.select('engagement_requests', { id: row.engagement_id }, { limit: 1 })) as
                    Array<{ country: string; category: string; message?: string; structured_answers?: Record<string, unknown>; created_at: string; sla_confirm_deadline?: string }>;
                if (eng[0]) {
                    const redacted = redactText(eng[0].message || '', { profile: 'strict' });
                    // Identity keys live inside structured_answers for the unlock
                    // stage — they must NEVER appear in the anonymized dossier.
                    const { requester_email: _re, company: _co, ...anonAnswers } = (eng[0].structured_answers || {}) as Record<string, unknown>;
                    dossier = {
                        country: eng[0].country,
                        category: eng[0].category,
                        structured_answers: anonAnswers,
                        message_redacted: redacted.sanitizedText,
                        created_at: eng[0].created_at,
                        sla_confirm_deadline: eng[0].sla_confirm_deadline,
                    };
                }
            }
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(valid ? 200 : 403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(valid
                ? { ok: true, engagementId: row.engagement_id, action: row.action, expiresAt: row.expires_at, dossier }
                : { ok: false, errorCode: 'INVALID_TOKEN', message: 'Magic link invalid, expired or already used' }));
        } catch {
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Token verification failed', correlationId }));
        }
    } else if (req.method === 'POST' && req.url === '/api/v1/provider/confirm') {
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body);
                const engagementId = requestData.engagementId;

                // P0 #1: a valid single-use magic token is mandatory.
                const tokenOk = await verifyAndBurnMagicToken(engagementId, 'confirm', requestData.token);
                if (!tokenOk) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'INVALID_TOKEN', message: 'Magic link invalid, expired or already used' }));
                    return;
                }

                await supabaseApi.update('engagement_requests',
                    { id: engagementId },
                    { status: 'confirmed', updated_at: new Date().toISOString() }
                );

                await supabaseApi.insert('event_log', {
                    type: 'provider_confirmed',
                    payload: { engagementId }
                });

                // Dossier unlock (Addendum 2026-07-10): confirming reveals the
                // unredacted message + requester identity. Disclosure is an
                // auditable moment (dossier_unlocked).
                const engRows = (await supabaseApi.select('engagement_requests', { id: engagementId }, { limit: 1 })) as
                    Array<{ user_id?: string | null; provider_key?: string | null; message?: string; structured_answers?: Record<string, unknown> & { requester_email?: string; company?: string } }>;
                const eng = engRows[0];
                // Der Anfragende erfaehrt es in seinem Arbeitsbereich. Kein
                // Akteur-Vergleich noetig: hier handelt immer der Anbieter,
                // ueber einen Magic Link ohne angemeldetes Konto.
                await notify({
                    to: eng?.user_id, type: 'provider_confirmed',
                    subject: 'engagement', subjectId: engagementId,
                    payload: { providerRef: await refOf(eng?.provider_key) },
                });
                const unlocked = eng ? {
                    message: eng.message || '',
                    requester_identity: {
                        company: eng.structured_answers?.company ?? null,
                        email: eng.structured_answers?.requester_email ?? null,
                    },
                } : null;
                await supabaseApi.insert('event_log', {
                    type: 'dossier_unlocked',
                    payload: { engagementId }
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, message: "Provider confirmed", unlocked }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: String(err) }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/provider/reply') {
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body);
                const engagementId = requestData.engagementId;

                // P0 #1: a valid single-use magic token is mandatory.
                const tokenOk = await verifyAndBurnMagicToken(engagementId, 'reply', requestData.token);
                if (!tokenOk) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'INVALID_TOKEN', message: 'Magic link invalid, expired or already used' }));
                    return;
                }

                await supabaseApi.update('engagement_requests',
                    { id: engagementId },
                    { status: 'replied', updated_at: new Date().toISOString() }
                );

                // Wave B: the reply text joins the engagement thread so both
                // dashboards show one shared history.
                if (requestData.message && typeof requestData.message === 'string') {
                    await supabaseApi.insert('engagement_messages', {
                        engagement_id: engagementId, author: 'provider', body: requestData.message,
                    });
                }

                await supabaseApi.insert('event_log', {
                    type: 'provider_replied',
                    payload: { engagementId }
                });

                const replyEng = (await supabaseApi.select('engagement_requests', { id: engagementId }, { limit: 1 })) as
                    Array<{ user_id?: string | null; provider_key?: string | null }>;
                // Nur die Tatsache, nicht der Text: der Antworttext steht im
                // Verlauf, wo er hingehoert, und nicht in einer Nutzlast.
                await notify({
                    to: replyEng[0]?.user_id, type: 'provider_replied',
                    subject: 'engagement', subjectId: engagementId,
                    payload: { providerRef: await refOf(replyEng[0]?.provider_key) },
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, message: "Provider replied" }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: String(err) }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/provider/decline') {
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body);
                const engagementId = requestData.engagementId;

                // Same magic-token contract as confirm/reply.
                const tokenOk = await verifyAndBurnMagicToken(engagementId, 'decline', requestData.token);
                if (!tokenOk) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'INVALID_TOKEN', message: 'Magic link invalid, expired or already used' }));
                    return;
                }

                await supabaseApi.update('engagement_requests',
                    { id: engagementId },
                    { status: 'declined', updated_at: new Date().toISOString() }
                );

                await supabaseApi.insert('event_log', {
                    type: 'provider_declined',
                    payload: { engagementId }
                });

                const declEng = (await supabaseApi.select('engagement_requests', { id: engagementId }, { limit: 1 })) as
                    Array<{ user_id?: string | null; provider_key?: string | null }>;
                await notify({
                    to: declEng[0]?.user_id, type: 'provider_declined',
                    subject: 'engagement', subjectId: engagementId,
                    payload: { providerRef: await refOf(declEng[0]?.provider_key) },
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, message: "Provider declined" }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: String(err) }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/search') {
        // Die Referenz-ID steht auf JEDER Antwort, nicht nur auf Fehlern: der
        // Browser kennt sie ohnehin (er hat sie geschickt), und so laesst sich
        // auch eine erfolgreiche, aber falsche Risk Map im Log wiederfinden.
        res.setHeader('x-correlation-id', correlationId);
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            let requestData: any;
            try {
                requestData = JSON.parse(body);
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INVALID_JSON', message: 'Invalid JSON payload', correlationId }));
                return;
            }
            try {
                // 1. Compliance Engine - Generate structural subdomains.
                //    The engine only knows a subset of country profiles — an
                //    unknown country must not kill the search (providers are
                //    still scored; laws just come back empty).
                let engineResults: EnrichedSubdomain[] = [];
                // All requested markets the engine knows a profile for; unknown
                // codes are dropped rather than killing the whole search.
                const requestedMarkets: string[] = Array.isArray(requestData.structured_answers?.markets)
                    ? requestData.structured_answers.markets
                    : [];
                const engineCountries = [...new Set([requestData.country || 'DE', ...requestedMarkets])]
                    .filter((c): c is CountryCode => isKnownCountry(String(c)));
                // Wizard domain slugs → engine domains (focus = user-selected;
                // always included and marked 'confirmed' in the payload).
                const requestedSlugs: string[] = requestData.structured_answers?.domains
                    || requestData.structured_answers?.categories
                    || requestData.domains || [];
                const focusDomains = [...new Set(requestedSlugs.map((s) => SLUG_TO_ENGINE[s]).filter(Boolean))];
                try {
                    // No known market at all → no laws rather than a silent DE
                    // fallback (foreign users must not see German statutes).
                    if (engineCountries.length) {
                        engineResults = generateRelevantSubdomains({
                            countries: engineCountries,
                            industry: requestData.structured_answers?.industry as IndustryType,
                            businessModel: requestData.structured_answers?.businessModel as BusinessModel,
                            focusDomains,
                        });
                    }
                } catch (engineErr) {
                    console.warn('compliance-engine country profile missing:', String(engineErr));
                }

                // 2. Vector Search (RAG) - Query PostgreSQL pgvector
                // Stub embedding since backend currently lacks an active LLM API integration for live vectors
                const queryEmbedding = new Array(768).fill(0.01);

                // Wrap the rpc in try/catch to gracefully handle empty DB tables mapping to empty arrays
                let knowledgeMatches: any[] = [];
                try {
                    const rpcResponse = await supabaseApi.rpc('match_knowledge_chunks', {
                        query_embedding: queryEmbedding,
                        match_threshold: 0.1,
                        match_count: 5
                    });
                    knowledgeMatches = (rpcResponse as any)?.data as any[] || rpcResponse as any[] || [];
                    if (!Array.isArray(knowledgeMatches)) knowledgeMatches = [];
                } catch (e) {
                    console.warn("RPC match_knowledge_chunks fail:", e);
                }

                // 3. Fetch, score and anonymize matched providers.
                //    Ranking = 0.6·Relevance + 0.3·Quality + 0.1·Priority (spec §6).
                //    Output is ANONYMOUS: no name/website/contact — only attributes,
                //    billing_model and a match score. Identity is revealed post-booking.
                const country = requestData.country as string | undefined;
                const rawCats: string[] = requestedSlugs;

                // Sichtbarkeit kommt aus `matchable_provider_services` (§3 × §4 × §19):
                // freigegebene Leistung × freigegebener Markt × gueltiger Kontostatus,
                // als UND-Kette in der View statt als gespeichertes Flag. Eine
                // abgelaufene Freigabe faellt damit von selbst heraus — niemand muss
                // einen Status nachziehen.
                //
                // Absichtlich NICHT gefiltert: `bookable_chargeable`. Das Gate aus
                // §21.1 sperrt die Buchung, nicht das Matching. Wer es hierher zieht,
                // laesst den Zahlungsstatus ueber Sichtbarkeit entscheiden — genau das,
                // was §14 verbietet.
                //
                // `partner_status` und `countries_supported` entscheiden ab hier
                // nichts mehr. Sie bleiben Anzeige- und Ranking-Merkmale (Verified-
                // Badge, Watchdog-Abzug), bis sie entfallen.
                const matchable = (await supabaseApi.select(
                    'matchable_provider_services',
                    country ? { country_code: country } : {},
                )) as any[];

                // Je Anbieter: die freigegebenen Bereiche und die freigegebenen
                // Leistungsnamen. `area_code` rollt eine Unterkategorie auf den
                // Bereich hoch, den der Wizard sendet — deshalb braucht die API keine
                // eigene Abbildung mehr. DOMAIN_TO_DB ist damit ersatzlos entfallen;
                // die Zuordnung lebt in `service_categories`, an einer Stelle.
                const approvedAreas = new Map<string, Set<string>>();
                const approvedNames = new Map<string, Set<string>>();
                for (const row of matchable) {
                    const key = row.provider_key as string;
                    if (!approvedAreas.has(key)) {
                        approvedAreas.set(key, new Set<string>());
                        approvedNames.set(key, new Set<string>());
                    }
                    if (row.area_code) approvedAreas.get(key)!.add(row.area_code);
                    if (row.service_name) approvedNames.get(key)!.add(row.service_name);
                }

                // Bewertung, Reaktionszeit und Region haengen weiter am Anbieter,
                // nicht an der Leistung — die View traegt sie bewusst nicht.
                const eligible = ((await supabaseApi.select('providers', {})) as any[])
                    .filter((p: any) => approvedAreas.has(p.provider_key));

                // Phase 3 (ADR-0004): der Prioritaetsanteil haengt an der
                // Verifikationstiefe — Anteil unabhaengig geprueft er Pflichtnach-
                // weise —, nicht mehr an `partner_status`. Jeder neue Anbieter
                // kann ihn sofort erreichen; Groesse, Alter und Plan zaehlen nicht.
                // Der Watchdog-Abzug (downgraded ×0.4) entfaellt: Verstoesse
                // stecken als breach_count in der Qualitaet, und ein Konto, das
                // gesperrt gehoert, ist ueber den Lifecycle nicht in der View.
                const evidenceAll = eligible.length
                    ? ((await supabaseApi.select('provider_evidence', {}, { limit: 5000 })) as any[])
                    : [];
                const reviewsAll = eligible.length
                    ? ((await supabaseApi.select('reviews', { from_role: 'user' }, { limit: 5000 })) as any[])
                        .filter((r: any) => r.verified !== false && r.booking_id && r.rating != null)
                    : [];
                const viewByKey = new Map<string, any[]>();
                for (const row of matchable) {
                    if (!viewByKey.has(row.provider_key)) viewByKey.set(row.provider_key, []);
                    viewByKey.get(row.provider_key)!.push(row);
                }
                const reg = await visibilityRegister();
                const labels = await areaLabels([...new Set(matchable.map((r: any) => r.area_code as string).filter(Boolean))]);

                const scoreOf = (p: any) => {
                    // Die View ist bereits nach `country` gefiltert: wer hier steht,
                    // hat eine gueltige Freigabe fuer diesen Markt. Ohne Land in der
                    // Anfrage gibt es nichts zu treffen.
                    const countryMatch = country ? 1 : 0;
                    const areas = approvedAreas.get(p.provider_key) ?? new Set<string>();
                    // Welche der ANGEFRAGTEN Bereiche dieser Anbieter freigegeben hat —
                    // nicht, welche er von sich behauptet. Als Indizes auf rawCats,
                    // damit der Draht die Slugs des Aufrufers zurueckgibt.
                    const coveredIdx = rawCats
                        .map((slug, i) => (areas.has(slug) ? i : -1))
                        .filter((i) => i >= 0);
                    const catOverlap = rawCats.length
                        ? coveredIdx.length / rawCats.length
                        : (areas.size ? 0.5 : 0);
                    const relevance = 0.6 * countryMatch + 0.4 * catOverlap;

                    const ownReviews = reviewsAll.filter((r: any) => r.provider_key === p.provider_key);
                    const ratingFromBookings = ownReviews.length
                        ? ownReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / ownReviews.length : null;
                    const ratingN = (ratingFromBookings ?? (p.rating != null ? Number(p.rating) : 4.5)) / 5;
                    const confN = p.confirmation_rate != null ? Number(p.confirmation_rate) : 0.8;
                    const respN = p.avg_response_hours != null
                        ? Math.max(0, 1 - Number(p.avg_response_hours) / 24) : 0.7;
                    const breachN = Math.max(0, 1 - (p.breach_count || 0) * 0.1);
                    const quality = 0.4 * ratingN + 0.3 * confN + 0.2 * respN + 0.1 * breachN;

                    const rows = viewByKey.get(p.provider_key) ?? [];
                    const { required, usable, depth } = depthFor(rows, evidenceAll.filter((e: any) => e.provider_key === p.provider_key));
                    const priority = depth;
                    let total = 0.6 * relevance + 0.3 * quality + 0.1 * priority;
                    if (p.availability === 'ooo') total *= 0.5; // out-of-office → rank frozen/low
                    const basis = rankBasis({
                        required, evidence: usable,
                        avg_response_hours: p.avg_response_hours, confirmation_rate: p.confirmation_rate,
                        rating: ratingFromBookings != null ? Math.round(ratingFromBookings * 10) / 10 : null, reviews_count: ownReviews.length,
                    });
                    return { relevance, total, countryMatch, coveredIdx, basis };
                };
                const tierOf = (pct: number) => pct >= 90 ? 'high' : pct >= 75 ? 'strong' : 'moderate';

                const anonProviders = eligible
                    .map((p: any) => {
                        const { relevance, total, countryMatch, coveredIdx, basis } = scoreOf(p);
                        const match = Math.round(relevance * 100);
                        return {
                            // Nur Felder der Klasse anonymous (Register §13) plus
                            // public_ref. provider_key und pseudonym_label sind ab
                            // hier nie mehr auf dem Draht.
                            ...serializeProvider(p, reg, 'anonymous'),
                            region: typeof p.region === 'string' ? maskIdentity(p.region, identityCtx(p)) : null,
                            active_since: p.active_since ?? null,
                            // Freigegebene Leistungsnamen aus der Taxonomie, nicht die
                            // Selbstauskunft aus `categories`.
                            specializations: Array.from(approvedNames.get(p.provider_key) ?? []).sort(),
                            languages: p.languages || [],
                            rating: basis.rating ?? (p.rating != null ? Number(p.rating) : null),
                            completed_count: p.completed_count ?? null,
                            avg_response_hours: p.avg_response_hours != null ? Number(p.avg_response_hours) : null,
                            billing_model: p.billing_model || 'project',
                            // Wer in der View steht, ist verifiziert — sonst stuende
                            // er nicht drin. partner_status entscheidet nichts mehr.
                            is_verified: true,
                            match,                       // percentage, relevance-normalised
                            match_tier: tierOf(match),
                            // The percentage decomposed, so the UI can show WHY it is
                            // what it is instead of asserting a bare number:
                            //   match = 60 * country_covered + 40 * (matched / requested)
                            match_basis: {
                                country: country ?? null,
                                country_covered: countryMatch === 1,
                                domains_requested: rawCats,
                                domains_matched: coveredIdx.map((i: number) => rawCats[i]),
                            },
                            // Die Fakten hinter der REIHENFOLGE — Verifikationstiefe,
                            // Antwortzeit, Bestaetigungsrate, Bewertungen aus Buchungen.
                            // Fakten, keine Gewichte (Canvas Sektion 2).
                            rank_basis: basis,
                            _rank: total,
                            _areas: Array.from(approvedAreas.get(p.provider_key) ?? []),
                            _region: p.region ?? null,
                        };
                    })
                    .sort((a: any, b: any) => b._rank - a._rank)
                    // Der Buchstabe ist die Position in DIESER Liste (A, B, C …);
                    // die Beschreibung kommt aus freigegebenen Bereichen und Region.
                    .map(({ _rank, _areas, _region, ...pub }: any, i: number) => {
                        const title = publicTitle(i, _areas.map((a: string) => labels.get(a) ?? a), pub.region ?? _region);
                        return { ...pub, title: title.label, letter: title.letter, descriptor: title.descriptor, area_codes: [..._areas].sort(), descriptor_region: pub.region ?? _region };
                    });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    // Says what the payload IS. The knowledge-chunk lookup above
                    // still runs on a stub embedding and the assistant that would
                    // ground a real summary is feature-flagged off, so the string
                    // must not claim a synthesis that does not happen: everything
                    // below `laws` comes out of the deterministic engine.
                    overview_summary: "Obligations identified by the compliance engine for the requested markets and domains.",
                    providers: anonProviders,
                    // Enriched obligations payload: severity + statute + penalty +
                    // cadence from the engine's editorial map. `state` mirrors the
                    // wizard: explicitly selected domains are 'confirmed', the
                    // score-ranked top-up domains are 'likely'.
                    laws: engineResults.map((r) => ({
                        id: r.id,
                        title: r.label,
                        description: r.description,
                        domain: r.domain,
                        severity: r.severity,
                        markets: r.markets,          // [] = EU-wide
                        source: r.source ?? null,
                        // Verified EU legal basis — lets the risk map link the
                        // authoritative, always-current text instead of a plain
                        // paragraph string (EUR-Lex, work package B).
                        celex: r.celex ?? null,
                        source_url: r.sourceUrl ?? null,
                        penalty: r.penalty ?? null,
                        penalty_max_eur: r.penaltyMaxEur ?? null,
                        // Die belegte Obergrenze mit Fundstelle und Stand.
                        // `penalty` bleibt daneben stehen, solange Flaechen
                        // davon leben — aber die Risikokarte liest ab jetzt
                        // diese hier, damit Karte und Bereichsseite nicht zwei
                        // verschiedene Zahlen zur selben Pflicht zeigen.
                        penalty_ceiling: r.penaltyCeiling ?? null,
                        due: r.due ?? null,
                        due_days: r.dueDays ?? null,
                        // ISO date an obligation starts to apply. Null for the
                        // vast majority (already in force); set where an act is
                        // adopted but not yet applicable, so the map can show a
                        // countdown instead of claiming the duty is live.
                        applies_from: r.appliesFrom ?? null,
                        state: r.focus ? 'confirmed' : 'likely',
                    })),
                    tutorials: knowledgeMatches.map((m: any) => ({ id: m.id, content: m.content })),
                    articles: [],
                    tips: []
                }));
            } catch (err) {
                // Bis 2026-09-22: `400 { error: String(err) }` fuer JEDEN Fehler —
                // ein Datenbankausfall hiess "deine Anfrage ist falsch", die
                // interne Meldung ging roh an den Browser, und im Log stand
                // nichts. Der Nutzer sah "Risk Map failed" ohne Spur, der
                // Support hatte keine. Jetzt: Log mit Referenz-ID, 500, und
                // nach aussen nur die ID.
                structuredLog('error', 'Search failed', {
                    correlationId,
                    errorCode: 'ERR_SEARCH',
                    severity: 'error',
                    route: '/api/v1/search',
                    // Die Ursache gehoert ins Log, nicht in die Antwort. Gekappt,
                    // weil ein PostgREST-Fehlertext beliebig lang sein kann.
                    detail: String(err).slice(0, 500),
                });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Search failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/assistant/chat') {
        // Chatbot plan phase ②: RAG assistant over knowledge_chunks +
        // jurisdiction_facts (assistant.ts). 503 until GEMINI_API_KEY is set.
        handleAssistantChat(req, res, correlationId, ip, { userId: authUserId, email: authEmail });
    } else if (req.method === 'POST' && req.url === '/api/v1/assistant/checkout') {
        // Phase ③: Stripe Checkout for Assistant Pro (12 $/month).
        handleAssistantCheckout(req, res, correlationId, { userId: authUserId, email: authEmail }, ip);
    } else if (req.method === 'GET' && /^\/api\/v1\/provider\/[a-z0-9-]+\/subscription$/.test(req.url || '')) {
        // Das eigene Abo: Tarif, Zyklus, Periode und die waehlbaren Tarife.
        // Nur fuer den Anbieter selbst (Ownership-Guard oben) — Spec B haelt
        // Abo-Daten aus allem Nutzerseitigen heraus.
        await handleSubscriptionGet(res, correlationId, (req.url || '').split('/')[4]);
    } else if (req.method === 'POST' && /^\/api\/v1\/provider\/[a-z0-9-]+\/subscription$/.test(req.url || '')) {
        // Tarifwahl. Legt das Abo an; die Abo-RECHNUNG stellt weiter der
        // Monatslauf (/admin/billing/run) — es gibt kein Stripe-Abo, sonst
        // wuerde zweimal abgerechnet.
        await handleSubscriptionSelect(req, res, correlationId, caller, (req.url || '').split('/')[4]);
    } else if (req.method === 'POST' && req.url === '/api/v1/admin/provider-subscriptions') {
        // Admin-Zuweisung: {provider_key, action: 'start'|'end', ...}.
        await handleAdminSubscription(req, res, correlationId, caller);
    } else if (req.method === 'GET' && /^\/api\/v1\/provider\/[a-z0-9-]+\/billing\/preview$/.test(req.url || '')) {
        // Current-period charge preview for the provider billing page (pricing
        // decision 2026-08-09) — behind the normal auth gate, no Stripe needed.
        await handleBillingPreview(res, correlationId, (req.url || '').split('/')[4]);
    } else if (req.method === 'POST' && req.url === '/api/v1/admin/billing/run') {
        // Monthly platform-fee run (billing.ts) — server-to-server key only.
        handleBillingRun(req, res, correlationId, authViaApiKey);
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/admin/cockpit')) {
        // Founder cockpit read-model: five lenses aggregated across the live
        // systems (cockpit.ts) — server-to-server key only.
        res.setHeader('x-correlation-id', correlationId);
        if (!authViaApiKey && !authIsAdmin) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'FORBIDDEN', message: 'Cockpit is admin-only', correlationId }));
        } else {
            try {
                const cockpit = await buildCockpit();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, cockpit, correlationId }));
            } catch {
                structuredLog('error', 'Cockpit build failed', { correlationId, errorCode: 'ERR_COCKPIT', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Cockpit build failed', correlationId }));
            }
        }
    } else if (req.method === 'POST' && req.url === '/api/v1/admin/watchers/tick') {
        // Force one SLA-watcher tick now (Beta verification) — server-to-server
        // key only. Runs the same pass the scheduler runs every WATCHERS_TICK_MS.
        res.setHeader('x-correlation-id', correlationId);
        if (!authViaApiKey) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'FORBIDDEN', message: 'Watcher ticks are admin-only', correlationId }));
        } else {
            try {
                const summary = await runWatcherTick();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, summary, correlationId }));
            } catch {
                structuredLog('error', 'Watcher tick failed', { correlationId, errorCode: 'ERR_WATCHER_TICK', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Watcher tick failed', correlationId }));
            }
        }
    } else if (req.method === 'POST' && req.url === '/api/v1/assistant/verify') {
        // Phase ③: verify-on-return — confirms the subscription after checkout.
        handleAssistantVerify(req, res, correlationId, { userId: authUserId, email: authEmail });
    } else if (req.method === 'GET' && req.url === '/api/v1/dashboard') {
        // Kennzahlen des Arbeitsbereichs aus echten Zeilen (dashboard.ts).
        await handleDashboard(res, correlationId, authUserId);
    } else if (req.method === 'GET' && /^\/api\/v1\/domain\/[a-z-]+$/.test(req.url || '')) {
        // Bereichs-Querschnitt: die Pflichten EINES Bereichs ueber alle
        // Sitzungen des Nutzers (domain.ts, Canvas "Bereichsseite" 2026-09-13).
        await handleDomain(res, correlationId, authUserId, (req.url || '').split('/').pop() as string);
    } else if (req.method === 'POST' && req.url === '/api/v1/auth/adopt') {
        // Signup adoption: the signed-in account claims its guest sessions (adoption.ts).
        handleAuthAdopt(req, res, correlationId, { userId: authUserId, email: authEmail });
    } else {
        res.setHeader('x-correlation-id', correlationId);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Not Found', correlationId }));
    }
});

const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
    console.log(`Compliance API running on port ${PORT}`);
    // Start the autonomous SLA watchers (reminder / breach / expiry). Shadow-first
    // by default (WATCHERS_SHADOW=true): computes and logs intended actions without
    // sending mail or mutating state until explicitly switched live.
    startSlaWatchers();
});
