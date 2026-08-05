import { createServer, IncomingMessage, ServerResponse } from "http";
import * as crypto from "node:crypto";
import { Orchestrator } from "@complihub/task-orchestrator";
import { createDefaultRegistry } from "@complihub/agent-registry";
import { DefaultPolicyEngine } from "@complihub/policy-engine";
import { createTaskContext, ComplianceCheckRequest, type TaskContext, normalizeCorrelationId, structuredLog, type AnalyticsEvent, type AlertRecord } from "@complihub360/types";
import { generateRelevantSubdomains, type CountryCode, type IndustryType, type BusinessModel } from "@complihub/compliance-engine";

import { supabaseApi } from "./supabase.js";
import { sendMagicLinkMail, sendEmailChangeMail } from "./mailer.js";
import { handleAssistantChat, handleAssistantCheckout, handleAssistantVerify } from "./assistant.js";
import { handleAuthAdopt } from "./adoption.js";
import { handleBillingRun, syncOpenInvoices } from "./billing.js";
import { startSlaWatchers, runWatcherTick, issueReminder } from "./watchers.js";
import { buildCockpit } from "./cockpit.js";
import { redactText } from "@complihub360/redaction";

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
const RATE_LIMIT_MAX = 100;
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

    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PATCH, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-correlation-id, Authorization, x-api-key');

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

    // 2.c Native Supabase JWT Authentication (Skip for /health and /ready)
    if (req.url !== '/health' && req.url !== '/ready') {
        let isAuthenticated = false;
        const authHeader = req.headers['authorization'];
        const devKey = req.headers['x-api-key'];

        // 1. Verify the Supabase access token (HS256): algorithm + signature + exp/nbf + role.
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const jwtSecret = process.env.SUPABASE_JWT_SECRET;
            const parts = token.split('.');
            if (jwtSecret && parts.length === 3) {
                try {
                    const [headerB64, payloadB64, signatureB64] = parts;
                    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
                    // Pin the algorithm — reject alg:none and RS/ES "confusion" tokens.
                    if (header.alg === 'HS256') {
                        const expectedSignature = crypto
                            .createHmac('sha256', jwtSecret)
                            .update(`${headerB64}.${payloadB64}`)
                            .digest('base64url'); // JWT uses Base64URL encoding
                        const sigBuf = Buffer.from(signatureB64);
                        const expBuf = Buffer.from(expectedSignature);
                        // Constant-time comparison to avoid signature timing leaks.
                        if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
                            const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
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
                } catch (e) {
                    // Malformed token → fall through to 401
                }
            }
        }

        // 2. Fallback to API_KEY if JWT not provided or invalid (for server-to-server internal admin)
        const expectedApiKey = process.env.API_KEY;
        if (!isAuthenticated && expectedApiKey && devKey === expectedApiKey) {
            isAuthenticated = true;
            authViaApiKey = true;
        }

        if (!isAuthenticated) {
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
            } catch (err) {
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
            } catch (err) {
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
            } catch (err) {
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
        // Provider request inbox — the first dashboard read endpoint. Auth is
        // enforced by the global guard above; rows come straight from
        // engagement_requests (newest first, capped at 50).
        try {
            const rows = await supabaseApi.select('engagement_requests', {}, { order: 'created_at.desc', limit: 50 });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, requests: rows }));
        } catch (err) {
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
        } catch (err) {
            structuredLog('error', 'Metrics failed', { correlationId, errorCode: 'ERR_METRICS', severity: 'error', route: req.url });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to compute metrics', correlationId }));
        }
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/notifications')) {
        // Aggregated event feed straight from event_log (newest first). The
        // table's time column is `timestamp` (init migration) — alias it to
        // created_at in the response for the FE mappers.
        try {
            const rows = (await supabaseApi.select('event_log', {}, { order: 'timestamp.desc', limit: 50 })) as
                Array<{ timestamp?: string; created_at?: string }>;
            const notifications = rows.map(r => ({ ...r, created_at: r.created_at || r.timestamp }));
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, notifications }));
        } catch (err) {
            structuredLog('error', 'Notifications list failed', { correlationId, errorCode: 'ERR_NOTIFICATIONS', severity: 'error', route: req.url });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to load notifications', correlationId }));
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
        } catch (err) {
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
            } catch (err) {
                structuredLog('error', 'Read-state update failed', { correlationId, errorCode: 'ERR_READS', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to mark seen', correlationId }));
            }
        });
    } else if (req.method === 'PATCH' && /^\/api\/v1\/session\/[0-9a-f-]{36}$/.test(req.url || '')) {
        // B13: rename (label) / archive (status) a saved session.
        const sessionId = (req.url || '').split('/').pop() as string;
        let patchBody = '';
        req.on('data', (chunk: any) => patchBody += chunk.toString());
        req.on('end', async () => {
            try {
                const d = JSON.parse(patchBody || '{}');
                const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
                if (typeof d.label === 'string') patch.label = d.label.slice(0, 120) || null;
                if (d.status === 'active' || d.status === 'archived') patch.status = d.status;
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
            } catch (err) {
                structuredLog('error', 'Session patch failed', { correlationId, errorCode: 'ERR_SESSION_PATCH', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Session update failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && /^\/api\/v1\/session\/[0-9a-f-]{36}\/duplicate$/.test(req.url || '')) {
        // B13: duplicate a session as an editable copy.
        const sessionId = (req.url || '').split('/')[4];
        try {
            const rows = (await supabaseApi.select('sessions', { id: sessionId }, { limit: 1 })) as Array<Record<string, unknown>>;
            if (!rows[0]) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Session not found', correlationId }));
                return;
            }
            const src = rows[0];
            const copy = (await supabaseApi.insert('sessions', {
                user_id: src.user_id ?? null,
                guest_key: src.guest_key ?? null,
                country: src.country ?? null,
                markets: src.markets ?? [],
                categories: src.categories ?? [],
                answers: src.answers ?? {},
                risk_summary: src.risk_summary ?? null,
                label: `Copy of ${String(src.label || src.country || 'session')}`.slice(0, 120),
                status: 'active',
            })) as Array<{ id: string }>;
            await supabaseApi.insert('event_log', { type: 'session_duplicated', payload: { sourceId: sessionId, copyId: copy?.[0]?.id } });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, id: copy?.[0]?.id }));
        } catch (err) {
            structuredLog('error', 'Session duplicate failed', { correlationId, errorCode: 'ERR_SESSION_DUP', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Session duplicate failed', correlationId }));
        }
    } else if (req.method === 'GET' && /^\/api\/v1\/provider\/[a-z0-9-]+\/detail$/.test(req.url || '')) {
        // Matchmaking v2 (spec §8): stage-2 ANONYMOUS provider detail. Opening it
        // is the monetised event `provider_detail_opened`, deduped server-side to
        // 1× per (user, provider) per rolling 30 days (spec §11 P3). Requires auth
        // (listing sits behind the register gate). Never leaks name/contact.
        const providerKey = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        if (!authUserId && !authViaApiKey) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'UNAUTHORIZED', message: 'Login required', correlationId }));
        } else {
            try {
                const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
                const p = rows[0];
                if (!p || p.partner_status !== 'active') {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                    return;
                }
                // Dedup: only charge if no detail-open by this user for this provider in the last 30d.
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
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    ok: true,
                    detail: {
                        provider_key: p.provider_key,
                        pseudonym_label: p.pseudonym_label || `Verifizierter Spezialist${p.region ? ' · ' + p.region : ''}`,
                        region: p.region ?? null,
                        active_since: p.active_since ?? null,
                        specializations: p.categories || [],
                        languages: p.languages || [],
                        countries_supported: p.countries_supported || [],
                        rating: p.rating != null ? Number(p.rating) : null,
                        completed_count: p.completed_count ?? null,
                        avg_response_hours: p.avg_response_hours != null ? Number(p.avg_response_hours) : null,
                        billing_model: p.billing_model || 'project',
                        pricing_table: p.pricing_table ?? null, // stage-2 reveal: full pricing
                        is_verified: true,
                        availability: p.availability || 'available',
                    },
                    detail_open_charged: charged,
                    correlationId,
                }));
            } catch (err) {
                structuredLog('error', 'Provider detail failed', { correlationId, errorCode: 'ERR_DETAIL', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Provider detail failed', correlationId }));
            }
        }
    } else if (req.method === 'GET' && /^\/api\/v1\/provider\/[a-z0-9-]+\/slots$/.test(req.url || '')) {
        // Matchmaking v2: bookable slots for the scheduling page. Until the
        // calendar-sync integration (spec §11 P4) lands, generate business-hour
        // slots for the next 5 business days minus already-booked ones.
        const providerKey = (req.url || '').split('/')[4];
        res.setHeader('x-correlation-id', correlationId);
        try {
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
            res.end(JSON.stringify({ ok: true, providerKey, slots, correlationId }));
        } catch (err) {
            structuredLog('error', 'Slots fetch failed', { correlationId, errorCode: 'ERR_SLOTS', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Slots fetch failed', correlationId }));
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
                const bookings = rows.map((b: any) => {
                    const p = byKey[b.provider_key] || {};
                    return {
                        id: b.id,
                        provider_key: b.provider_key,
                        provider_name: b.identity_revealed ? (p.name ?? b.provider_key) : (p.pseudonym_label ?? 'Verifizierter Spezialist'),
                        provider_region: p.region ?? null,
                        slot_start: b.slot_start,
                        slot_end: b.slot_end,
                        status: b.status,
                        message: b.message ?? null,
                    };
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, bookings, correlationId }));
            } catch (err) {
                structuredLog('error', 'Bookings fetch failed', { correlationId, errorCode: 'ERR_BOOKINGS', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Bookings fetch failed', correlationId }));
            }
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
            const bookings = rows.map((b: any) => ({
                id: b.id,
                slot_start: b.slot_start,
                slot_end: b.slot_end,
                status: b.status,
                lead_charged: !!b.lead_charged,
                user_email: b.user_id && byId[b.user_id] ? byId[b.user_id].email : null,
                message: b.message ?? null,
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, providerKey, bookings, correlationId }));
        } catch (err) {
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
                if (!['cancelled', 'completed', 'no_show'].includes(status)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'status must be cancelled|completed|no_show', correlationId }));
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
                await supabaseApi.update('scheduling', { id: bookingId }, { status, updated_at: new Date().toISOString() });
                const evType = status === 'cancelled' ? 'user_cancelled' : status === 'no_show' ? 'no_show' : 'outcome_check';
                await supabaseApi.insert('event_log', { type: evType, payload: { bookingId, providerKey: b.provider_key, userId: b.user_id, status } });
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
            } catch (err) {
                structuredLog('error', 'Booking patch failed', { correlationId, errorCode: 'ERR_BOOKING_PATCH', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Booking patch failed', correlationId }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/scheduling') {
        // Matchmaking v2 (spec §11 P7): booking a slot IS the paid lead. On
        // create: scheduling row + `scheduling_confirmed` + `provider_lead_charged`
        // events + identity reveal (both sides). Charged even if a no-show occurs
        // later — the provider receives the dossier (value) at booking time.
        res.setHeader('x-correlation-id', correlationId);
        if (!authUserId) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'UNAUTHORIZED', message: 'Login required to book', correlationId }));
        } else {
            let schedBody = '';
            req.on('data', (chunk: any) => schedBody += chunk.toString());
            req.on('end', async () => {
                try {
                    const d = JSON.parse(schedBody || '{}');
                    const providerKey = typeof d.provider_key === 'string' ? d.provider_key : '';
                    const slotStart = typeof d.slot_start === 'string' ? d.slot_start : '';
                    if (!providerKey || Number.isNaN(Date.parse(slotStart))) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'provider_key and slot_start (ISO) required', correlationId }));
                        return;
                    }
                    const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
                    const p = rows[0];
                    if (!p || p.partner_status !== 'active') {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }));
                        return;
                    }
                    const slotEnd = new Date(Date.parse(slotStart) + 30 * 60 * 1000).toISOString();
                    const inserted = (await supabaseApi.insert('scheduling', {
                        provider_key: providerKey,
                        user_id: authUserId,
                        slot_start: slotStart,
                        slot_end: slotEnd,
                        status: 'confirmed',
                        message: typeof d.message === 'string' ? d.message.slice(0, 2000) : null,
                        lead_charged: true,
                        identity_revealed: true,
                    })) as any[];
                    const booking = inserted?.[0];
                    await supabaseApi.insert('event_log', { type: 'scheduling_confirmed', payload: { bookingId: booking?.id, providerKey, userId: authUserId, slotStart } });
                    await supabaseApi.insert('event_log', { type: 'provider_lead_charged', payload: { bookingId: booking?.id, providerKey, userId: authUserId } });
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        ok: true,
                        booking: { id: booking?.id, provider_key: providerKey, slot_start: slotStart, slot_end: slotEnd, status: 'confirmed' },
                        // Stage-3 reveal: identity becomes visible at booking (spec §5).
                        provider_identity: { name: p.name, website_url: p.website_url ?? null, contact_email: p.contact_email ?? null },
                        correlationId,
                    }));
                } catch (err) {
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
                    if (!d.provider_key || rating === null) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'provider_key and rating required', correlationId }));
                        return;
                    }
                    await supabaseApi.insert('reviews', {
                        booking_id: d.booking_id ?? null,
                        provider_key: d.provider_key,
                        from_role: fromRole,
                        to_role: fromRole === 'user' ? 'provider' : 'user',
                        rating,
                        categories: Array.isArray(d.categories) ? d.categories : [],
                        body: typeof d.body === 'string' ? d.body.slice(0, 2000) : null,
                        verified: true,
                    });
                    if (fromRole === 'user') {
                        // Recompute the provider's aggregate rating from verified user reviews.
                        try {
                            const all = (await supabaseApi.select('reviews', { provider_key: d.provider_key, from_role: 'user' }, { limit: 500 })) as any[];
                            const rated = all.filter((r: any) => r.rating != null);
                            if (rated.length) {
                                const avg = rated.reduce((s: number, r: any) => s + Number(r.rating), 0) / rated.length;
                                await supabaseApi.update('providers', { provider_key: d.provider_key }, { rating: Math.round(avg * 10) / 10 });
                            }
                        } catch { /* aggregate must not break the write */ }
                    }
                    await supabaseApi.insert('event_log', { type: 'review_submitted', payload: { providerKey: d.provider_key, bookingId: d.booking_id ?? null, fromRole, rating } });
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, correlationId }));
                } catch (err) {
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
                await supabaseApi.insert('providers', {
                    provider_key: providerKey,
                    name,
                    website_url: d.website_url ?? null,
                    partner_status: 'inactive', // vetting gate: admin flips to 'active' after review
                    countries_supported: Array.isArray(d.countries_supported) ? d.countries_supported : [],
                    languages: Array.isArray(d.languages) ? d.languages : [],
                    categories: Array.isArray(d.categories) ? d.categories : [],
                    billing_model: ['abo', 'hourly', 'project', 'mixed'].includes(d.billing_model) ? d.billing_model : 'project',
                    pricing_table: d.pricing_table ?? null,
                    pseudonym_label: d.pseudonym_label ?? null,
                    region: d.region ?? null,
                    active_since: Number.isInteger(d.active_since) ? d.active_since : null,
                });
                await supabaseApi.insert('event_log', { type: 'provider_intake_submitted', payload: { providerKey, certifications: Array.isArray(d.certifications) ? d.certifications.length : 0 } });
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, provider_key: providerKey, status: 'in_review', correlationId }));
            } catch (err) {
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
        } catch (err) {
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
            } catch (err) {
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
                if (typeof d.pseudonym_label === 'string') patch.pseudonym_label = d.pseudonym_label.slice(0, 120);
                if (typeof d.region === 'string') patch.region = d.region.slice(0, 80);
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
            } catch (err) {
                structuredLog('error', 'Provider profile update failed', { correlationId, errorCode: 'ERR_PROFILE', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Profile update failed', correlationId }));
            }
        });
    } else if (req.method === 'GET' && /^\/api\/v1\/provider\/[a-z0-9-]+\/invoices$/.test(req.url || '')) {
        // B7: invoice history incl. line items. Stripe-issued via the monthly
        // billing run; open rows pull their payment status here (no webhook —
        // the staging basic-auth wall blocks Stripe callbacks).
        const providerKey = (req.url || '').split('/')[4];
        try {
            await syncOpenInvoices(providerKey).catch(() => { /* list still renders */ });
            const invoices = await supabaseApi.select('invoices', { provider_key: providerKey }, { order: 'period.desc', limit: 24 });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, invoices }));
        } catch (err) {
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
            } catch (err) {
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
            const stripeKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeKey) {
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
            const stripe = async (path: string, params: Record<string, string>) => {
                const resp = await fetch(`https://api.stripe.com/v1/${path}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(params).toString(),
                });
                const body = await resp.json();
                if (!resp.ok) throw new Error(`Stripe ${path}: ${(body as { error?: { message?: string } }).error?.message || resp.status}`);
                return body as Record<string, unknown>;
            };
            let customerId = rows[0].stripe_customer_id ?? null;
            if (!customerId) {
                const customer = await stripe('customers', {
                    name: rows[0].name || providerKey,
                    ...(rows[0].contact_email ? { email: rows[0].contact_email } : {}),
                    'metadata[provider_key]': providerKey,
                });
                customerId = String(customer.id);
                await supabaseApi.update('providers', { provider_key: providerKey }, { stripe_customer_id: customerId });
            }
            const appUrl = (process.env.PUBLIC_APP_URL || 'https://staging.complihub360.com').replace(/\/$/, '');
            const session = await stripe('billing_portal/sessions', {
                customer: customerId,
                return_url: `${appUrl}/en/partner-dashboard/billing`,
            });
            await supabaseApi.insert('event_log', { type: 'billing_portal_opened', payload: { providerKey } });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, url: session.url }));
        } catch (err) {
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
            } catch (err) {
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
            } catch (err) {
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
        } catch (err) {
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
            } catch (err) {
                structuredLog('error', 'Alert prefs save failed', { correlationId, errorCode: 'ERR_ALERT_PREFS', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Alert prefs save failed', correlationId }));
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
            } catch (err) {
                structuredLog('error', 'Session save failed', { correlationId, errorCode: 'ERR_SESSION', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Session save failed', correlationId }));
            }
        });
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/sessions')) {
        // List sessions for a guest key (registered listing lands with real auth).
        try {
            const u = new URL(req.url, 'http://localhost');
            const guestKey = u.searchParams.get('guest_key');
            if (!guestKey) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'guest_key required', correlationId }));
                return;
            }
            const rows = await supabaseApi.select('sessions', { guest_key: guestKey }, { order: 'created_at.desc', limit: 20 });
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, sessions: rows }));
        } catch (err) {
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
        } catch (err) {
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
                if (proposal) {
                    await supabaseApi.insert('event_log', {
                        type: 'proposal_submitted',
                        payload: { engagementId, fields: Object.keys(proposal) },
                    });
                }
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, id: inserted?.[0]?.id, created_at: inserted?.[0]?.created_at }));
            } catch (err) {
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
                Array<{ id: string; status: string }>;
            if (!eng[0]) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Engagement not found', correlationId }));
                return;
            }
            if (!['created', 'delivered', 'viewed'].includes(eng[0].status)) {
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
        } catch (err) {
            structuredLog('error', 'Withdraw failed', { correlationId, errorCode: 'ERR_WITHDRAW', severity: 'error', route: req.url });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Withdraw failed', correlationId }));
        }
    } else if (req.method === 'GET' && req.url?.startsWith('/api/v1/admin/stats')) {
        // Admin control center: one aggregated read across engagements, the
        // audit log and the privacy pipeline. Approximations share the caveats
        // of /metrics (no per-transition timestamps yet).
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
        } catch (err) {
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
            } catch (err) {
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
            } catch (err) {
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
                    user_id: requestData.user_id || undefined,
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
        } catch (err) {
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
                    Array<{ message?: string; structured_answers?: Record<string, unknown> & { requester_email?: string; company?: string } }>;
                const eng = engRows[0];
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

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, message: "Provider declined" }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: String(err) }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/search') {
        let body = '';
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body);
                // 1. Compliance Engine - Generate structural subdomains
                const engineResults = generateRelevantSubdomains({
                    countries: [(requestData.country || 'DE') as CountryCode],
                    industry: requestData.structured_answers?.industry as IndustryType,
                    businessModel: requestData.structured_answers?.businessModel as BusinessModel
                });

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
                const wantedCats: string[] = requestData.structured_answers?.domains
                    || requestData.structured_answers?.categories
                    || requestData.domains || [];

                const providers = (await supabaseApi.select('providers', {
                    partner_status: 'active'
                })) as any[];

                const eligible = country
                    ? providers.filter((p: any) => (p.countries_supported || []).includes(country))
                    : providers;

                const scoreOf = (p: any) => {
                    const countryMatch = country && (p.countries_supported || []).includes(country) ? 1 : 0;
                    const cats: string[] = p.categories || [];
                    const catOverlap = wantedCats.length
                        ? wantedCats.filter((c) => cats.includes(c)).length / wantedCats.length
                        : (cats.length ? 0.5 : 0);
                    const relevance = 0.6 * countryMatch + 0.4 * catOverlap;

                    const ratingN = (p.rating != null ? Number(p.rating) : 4.5) / 5;
                    const confN = p.confirmation_rate != null ? Number(p.confirmation_rate) : 0.8;
                    const respN = p.avg_response_hours != null
                        ? Math.max(0, 1 - Number(p.avg_response_hours) / 24) : 0.7;
                    const breachN = Math.max(0, 1 - (p.breach_count || 0) * 0.1);
                    const quality = 0.4 * ratingN + 0.3 * confN + 0.2 * respN + 0.1 * breachN;

                    const priority = p.partner_status === 'active' ? 1 : 0;
                    let total = 0.6 * relevance + 0.3 * quality + 0.1 * priority;
                    if (p.availability === 'ooo') total *= 0.5; // out-of-office → rank frozen/low
                    return { relevance, total };
                };
                const tierOf = (pct: number) => pct >= 90 ? 'high' : pct >= 75 ? 'strong' : 'moderate';

                const anonProviders = eligible
                    .map((p: any) => {
                        const { relevance, total } = scoreOf(p);
                        const match = Math.round(relevance * 100);
                        return {
                            provider_key: p.provider_key, // opaque handle for the (monetised) detail-open
                            pseudonym_label: p.pseudonym_label
                                || `Verifizierter Spezialist${p.region ? ' · ' + p.region : ''}`,
                            region: p.region ?? null,
                            active_since: p.active_since ?? null,
                            specializations: p.categories || [],
                            languages: p.languages || [],
                            rating: p.rating != null ? Number(p.rating) : null,
                            completed_count: p.completed_count ?? null,
                            avg_response_hours: p.avg_response_hours != null ? Number(p.avg_response_hours) : null,
                            billing_model: p.billing_model || 'project',
                            is_verified: p.partner_status === 'active',
                            match,                       // percentage, relevance-normalised
                            match_tier: tierOf(match),
                            _rank: total,
                        };
                    })
                    .sort((a: any, b: any) => b._rank - a._rank)
                    .map(({ _rank, ...pub }: any) => pub); // drop internal rank from the wire

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    overview_summary: "AI summary synthesized from knowledge chunks and deterministic engine rules.",
                    providers: anonProviders,
                    laws: engineResults.map((r: any) => ({ id: r.id, title: r.label, description: r.description })),
                    tutorials: knowledgeMatches.map((m: any) => ({ id: m.id, content: m.content })),
                    articles: [],
                    tips: []
                }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: String(err) }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/api/v1/assistant/chat') {
        // Chatbot plan phase ②: RAG assistant over knowledge_chunks +
        // jurisdiction_facts (assistant.ts). 503 until GEMINI_API_KEY is set.
        handleAssistantChat(req, res, correlationId, ip, { userId: authUserId, email: authEmail });
    } else if (req.method === 'POST' && req.url === '/api/v1/assistant/checkout') {
        // Phase ③: Stripe Checkout for Assistant Pro (12 $/month).
        handleAssistantCheckout(req, res, correlationId, { userId: authUserId, email: authEmail }, ip);
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
            } catch (err) {
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
            } catch (err) {
                structuredLog('error', 'Watcher tick failed', { correlationId, errorCode: 'ERR_WATCHER_TICK', severity: 'error', route: req.url });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Watcher tick failed', correlationId }));
            }
        }
    } else if (req.method === 'POST' && req.url === '/api/v1/assistant/verify') {
        // Phase ③: verify-on-return — confirms the subscription after checkout.
        handleAssistantVerify(req, res, correlationId, { userId: authUserId, email: authEmail });
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
