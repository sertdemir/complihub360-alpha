import { createServer, IncomingMessage, ServerResponse } from "http";
import { Orchestrator } from "@complihub/task-orchestrator";
import { createDefaultRegistry } from "@complihub/agent-registry";
import { DefaultPolicyEngine } from "@complihub/policy-engine";
import { createTaskContext, ComplianceCheckRequest, type TaskContext } from "@complihub360/types";

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    if (req.method === 'POST' && req.url === '/api/compliance/check') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body) as ComplianceCheckRequest;

                // Fallback for missing fields in minimal requests
                requestData.tenantId = requestData.tenantId || "default-tenant";
                requestData.appId = requestData.appId || "vs1-demo";

                const fallbackCtx = createTaskContext({
                    tenantId: requestData.tenantId,
                    appId: requestData.appId
                });

                const responseData = await orchestrator.runComplianceCheck(requestData, fallbackCtx);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(responseData));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
        });
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not Found" }));
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Compliance API running on port ${PORT}`);
});
