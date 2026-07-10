import { createServer, IncomingMessage, ServerResponse } from "http";
import * as crypto from "node:crypto";
import { Orchestrator } from "@complihub/task-orchestrator";
import { createDefaultRegistry } from "@complihub/agent-registry";
import { DefaultPolicyEngine } from "@complihub/policy-engine";
import { createTaskContext, ComplianceCheckRequest, type TaskContext, normalizeCorrelationId, structuredLog, type AnalyticsEvent, type AlertRecord } from "@complihub360/types";
import { generateRelevantSubdomains, type CountryCode, type IndustryType, type BusinessModel } from "@complihub/compliance-engine";

import { supabaseApi } from "./supabase.js";
import { sendMagicLinkMail } from "./mailer.js";
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

    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-correlation-id, Authorization, x-api-key');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const correlationId = normalizeCorrelationId(req.headers['x-correlation-id']);

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
                Array<{ classification: string; sanitized_ready: boolean; consent_ai?: boolean; ai_allowed: boolean; redaction_report?: { countsByType?: Record<string, number> } }>;

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
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, stats, watchlist, privacy, security, events: feed }));
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
                    provider_key: requestData.provider_key,
                    country: requestData.country,
                    category: requestData.category,
                    structured_answers: requestData.structured_answers || {},
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
            res.setHeader('x-correlation-id', correlationId);
            res.writeHead(valid ? 200 : 403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(valid
                ? { ok: true, engagementId: row.engagement_id, action: row.action, expiresAt: row.expires_at }
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

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, message: "Provider confirmed" }));
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

                // 3. Fetch matched providers
                const providers = (await supabaseApi.select('providers', {
                    partner_status: 'active'
                })) as any[];

                const filteredProviders = requestData.country
                    ? providers.filter((p: any) => p.countries_supported.includes(requestData.country))
                    : providers;

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    overview_summary: "AI summary synthesized from knowledge chunks and deterministic engine rules.",
                    providers: filteredProviders,
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
    } else {
        res.setHeader('x-correlation-id', correlationId);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'NOT_FOUND', message: 'Not Found', correlationId }));
    }
});

const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
    console.log(`Compliance API running on port ${PORT}`);
});
