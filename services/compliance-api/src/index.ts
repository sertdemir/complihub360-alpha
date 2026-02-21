import { createServer, IncomingMessage, ServerResponse } from "http";
import { Orchestrator } from "@complihub/task-orchestrator";
import { createDefaultRegistry } from "@complihub/agent-registry";
import { DefaultPolicyEngine } from "@complihub/policy-engine";
import { createTaskContext, ComplianceCheckRequest, type TaskContext, normalizeCorrelationId, structuredLog, type AnalyticsEvent, type AlertRecord } from "@complihub360/types";
import { startCriticalFlowMonitor } from "./monitor.js";

// Local in-memory store for dev-mode analytics and alerts
const eventStore: AnalyticsEvent[] = [];
const alertStore: AlertRecord[] = [];

// Security Hardening: Rate limiting state
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Start Background Critical Flow Monitor
startCriticalFlowMonitor(eventStore, alertStore);

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

    // 2.c API Key Authentication (Skip for /health and /ready)
    if (req.url !== '/health' && req.url !== '/ready') {
        const expectedApiKey = process.env.API_KEY;
        if (expectedApiKey) {
            const authHeader = req.headers['authorization'];
            const apiKeyHeader = req.headers['x-api-key'];

            const providedKey = apiKeyHeader || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

            if (!providedKey || providedKey !== expectedApiKey) {
                res.setHeader('x-correlation-id', correlationId);
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    errorCode: 'UNAUTHORIZED',
                    message: 'Missing or invalid API key',
                    correlationId
                }));
                return;
            }
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
        // Minimal Readiness check (process + local event array OK)
        if (eventStore && alertStore) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "ready" }));
        } else {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "not_ready" }));
        }
        return;
    }

    if (req.method === 'POST' && req.url === '/api/compliance/check') {
        const startTime = Date.now();

        // 2.e Reduce Payload Limit
        const MAX_PAYLOAD_SIZE = 100 * 1024; // 100KB
        let payloadSize = 0;
        let isTooLarge = false;
        let body = '';

        req.on('data', chunk => {
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

                if (requestData.tags !== undefined && (!Array.isArray(requestData.tags) || requestData.tags.some(t => typeof t !== 'string'))) {
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

        req.on('data', chunk => {
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

        req.on('end', () => {
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
                    serverTimestamp: new Date().toISOString()
                };

                eventStore.push(recordedEvent);

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
