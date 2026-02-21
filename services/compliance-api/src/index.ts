import { createServer, IncomingMessage, ServerResponse } from "http";
import { Orchestrator } from "@complihub/task-orchestrator";
import { createDefaultRegistry } from "@complihub/agent-registry";
import { DefaultPolicyEngine } from "@complihub/policy-engine";
import { createTaskContext, ComplianceCheckRequest, type TaskContext, normalizeCorrelationId, structuredLog, type AnalyticsEvent, type AlertRecord } from "@complihub360/types";
import { startCriticalFlowMonitor } from "./monitor";

// Local in-memory store for dev-mode analytics and alerts
const eventStore: AnalyticsEvent[] = [];
const alertStore: AlertRecord[] = [];

// Security Hardening: Rate limiting state (dev only)
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);

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
    // Simple CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-correlation-id');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const correlationId = normalizeCorrelationId(req.headers['x-correlation-id']);

    // Security Hardening: In-memory Rate Limit (dev only)
    if (process.env.NODE_ENV !== 'production') {
        const ip = req.socket.remoteAddress || 'unknown';
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

        const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB
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
                res.end(JSON.stringify({ errorCode: 'PAYLOAD_TOO_LARGE', message: 'Payload exceeds 1MB limit', correlationId }));
                return;
            }
            body += chunk.toString();
        });

        req.on('end', async () => {
            if (isTooLarge) return;
            structuredLog('info', 'Incoming compliance check request', { correlationId, route: req.url, method: req.method });

            try {
                const requestData = JSON.parse(body) as ComplianceCheckRequest;

                // Security Hardening: Request Validation
                if (!requestData.tenantId || typeof requestData.tenantId !== 'string' || requestData.tenantId.trim() === '') {
                    res.setHeader('x-correlation-id', correlationId);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'tenantId is required and must be a non-empty string', correlationId }));
                    return;
                }

                if (requestData.tags !== undefined && (!Array.isArray(requestData.tags) || requestData.tags.some(t => typeof t !== 'string'))) {
                    res.setHeader('x-correlation-id', correlationId);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'tags must be an array of strings', correlationId }));
                    return;
                }

                // Fallback for missing fields in minimal requests
                requestData.appId = requestData.appId || "vs1-demo";

                const fallbackCtx = createTaskContext({
                    tenantId: requestData.tenantId,
                    appId: requestData.appId,
                    correlationId
                });

                const responseData = await orchestrator.runComplianceCheck(requestData, fallbackCtx);

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
        const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB
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
                res.end(JSON.stringify({ errorCode: 'PAYLOAD_TOO_LARGE', message: 'Payload exceeds 1MB limit', correlationId }));
                return;
            }
            body += chunk.toString();
        });

        req.on('end', () => {
            if (isTooLarge) return;
            try {
                const eventData = JSON.parse(body) as AnalyticsEvent;
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
