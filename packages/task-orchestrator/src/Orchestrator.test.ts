import * as assert from "node:assert";
import type { AgentId } from "@complihub/agent-core";
import { Orchestrator } from "./Orchestrator";
import { composeMiddlewares } from "./middleware";
import type { TaskContext, ExecutionResult, Middleware, ExecutableAgent } from "./types";
import { createMockTaskContext } from "@complihub360/types";

// Mock Registry for Test
class MockRegistry {
    private mockAgents = [
        {
            id: "exact-match-agent" as AgentId, name: "A1", version: "1",
            capabilities: [{ name: "cap1", supportedIntents: [{ intent: "analyze_code" }] }]
        },
        {
            id: "tag-match-agent" as AgentId, name: "A2", version: "1",
            capabilities: [{ name: "cap2", supportedIntents: [{ intent: "other", tags: ["analyze_code"], priority: 5 }] }]
        },
        {
            id: "cap-name-agent" as AgentId, name: "A3", version: "1",
            capabilities: [{ name: "analyze_code" }]
        },
        {
            id: "a-tie-breaker" as AgentId, name: "A4", version: "1",
            capabilities: [{ name: "cap4", supportedIntents: [{ intent: "tie", tags: ["tie"] }] }]
        },
        {
            id: "z-tie-breaker" as AgentId, name: "A5", version: "1",
            capabilities: [{ name: "cap5", supportedIntents: [{ intent: "tie", tags: ["tie"] }] }]
        }
    ];

    get(id: string) { return id ? { id, name: "Test", version: "1" } : undefined; }
    list() { return this.mockAgents; }
    getByCapability(name: string) { return []; }
}

const mockCtx = createMockTaskContext();

async function runTests() {
    console.log("--- Running Orchestrator Tests ---");

    // TEST 1: Middleware compose order
    const orderList: number[] = [];
    const m1: Middleware = async (ctx, next, id) => { orderList.push(1); const res = await next(); orderList.push(1); return res; };
    const m2: Middleware = async (ctx, next, id) => { orderList.push(2); const res = await next(); orderList.push(2); return res; };

    const composed = composeMiddlewares([m1, m2]);
    await composed(mockCtx, async () => { orderList.push(3); return { ok: true, durationMs: 0, agentId: "test-agent" as AgentId }; }, "test-agent" as AgentId);
    assert.deepStrictEqual(orderList, [1, 2, 3, 2, 1], "Middleware order is incorrect");
    console.log("✅ compose order passed");

    // TEST 2: ErrorBoundary Catching inside Executable
    const errAgent: ExecutableAgent = {
        id: "error-agent" as AgentId,
        execute: async () => { throw new Error("Agent crashed!"); }
    };

    const orch1 = new Orchestrator(new MockRegistry() as any);
    orch1.use(async (ctx, next, id) => {
        try { return await next(); }
        catch (e) {
            return { ok: false, error: { name: "Error", message: (e as Error).message }, durationMs: 5, agentId: id };
        }
    });
    orch1.registerExecutable(errAgent);

    const resErr = await orch1.execute("error-agent" as AgentId, mockCtx);
    assert.strictEqual(resErr.ok, false);
    assert.strictEqual(!resErr.ok && resErr.error.message, "Agent crashed!");
    console.log("✅ Error boundary caught runtime error");

    // TEST 3: Timeout Execution
    const slowAgent: ExecutableAgent = {
        id: "slow-agent" as AgentId,
        execute: async () => new Promise(resolve => setTimeout(() => resolve({ ok: true, durationMs: 100, agentId: "slow-agent" as AgentId }), 100))
    };

    const orch2 = new Orchestrator(new MockRegistry() as any);
    orch2.registerExecutable(slowAgent);

    const resTimeout = await orch2.execute("slow-agent" as AgentId, mockCtx, { timeoutMs: 10 });
    assert.strictEqual(resTimeout.ok, false);
    assert.strictEqual(!resTimeout.ok && resTimeout.error.code, "TIMEOUT");
    console.log("✅ Timeout execution cleanly rejected slow execution");

    // TEST 4: Lifecycle Hooks execution
    let hookLogs: string[] = [];
    const orchHooks = new Orchestrator(new MockRegistry() as any, {
        beforeExecute: () => { hookLogs.push("before"); },
        afterExecute: () => { hookLogs.push("after"); }
    });

    const normalAgent: ExecutableAgent = {
        id: "normal-agent" as AgentId,
        execute: async () => ({ ok: true, durationMs: 10, agentId: "normal-agent" as AgentId })
    };
    orchHooks.registerExecutable(normalAgent);
    await orchHooks.execute("normal-agent" as AgentId, mockCtx);

    assert.deepStrictEqual(hookLogs, ["before", "after"]);
    console.log("✅ Lifecycle hooks triggered accurately");

    // TEST 5: Capability-based Execution
    const orchCap = new Orchestrator(new MockRegistry() as any);

    // Empty capability returns error
    const emptyRes = await orchCap.executeByCapability("missing", mockCtx);
    assert.strictEqual(emptyRes.ok, false);
    assert.strictEqual(!emptyRes.ok && emptyRes.error.code, "CAPABILITY_NOT_FOUND");
    console.log("✅ Capability routing cleanly rejects missing capabilities");

    // Ambiguous capability returns error
    const ambigRes = await orchCap.executeByCapability("ambiguous", mockCtx);
    assert.strictEqual(ambigRes.ok, false);
    assert.strictEqual(!ambigRes.ok && ambigRes.error.code, "AMBIGUOUS_CAPABILITY");
    console.log("✅ Capability routing cleanly rejects ambiguous capabilities");

    // Success falls back to standard execution
    const validAgent: ExecutableAgent = {
        id: "repo-engineer" as AgentId,
        execute: async () => ({ ok: true, durationMs: 15, agentId: "repo-engineer" as AgentId })
    };
    orchCap.registerExecutable(validAgent);

    const successRes = await orchCap.executeByCapability("code-generation", mockCtx);
    assert.strictEqual(successRes.ok, true);
    assert.strictEqual(successRes.ok && successRes.agentId, "repo-engineer");
    console.log("✅ Capability routing properly executes matched agent");

    // TEST 6: Intent-Based Routing Match & Priority
    const orchIntent = new Orchestrator(new MockRegistry() as any);

    // Register mock execution dummies based on MockRegistry agent IDs
    orchIntent.registerExecutable({ id: "exact-match-agent" as AgentId, execute: async () => ({ ok: true, durationMs: 0, agentId: "exact-match-agent" as AgentId }) });
    orchIntent.registerExecutable({ id: "tag-match-agent" as AgentId, execute: async () => ({ ok: true, durationMs: 0, agentId: "tag-match-agent" as AgentId }) });
    orchIntent.registerExecutable({ id: "cap-name-agent" as AgentId, execute: async () => ({ ok: true, durationMs: 0, agentId: "cap-name-agent" as AgentId }) });
    orchIntent.registerExecutable({ id: "a-tie-breaker" as AgentId, execute: async () => ({ ok: true, durationMs: 0, agentId: "a-tie-breaker" as AgentId }) });
    orchIntent.registerExecutable({ id: "z-tie-breaker" as AgentId, execute: async () => ({ ok: true, durationMs: 0, agentId: "z-tie-breaker" as AgentId }) });

    // 1. Exact Match overrides Tag match
    const exactRes = await orchIntent.executeByIntent("analyze_code", mockCtx);
    assert.strictEqual(exactRes.agentId, "exact-match-agent", "Exact match (10) should beat Tag+Priority (8)");

    // 2. Tie Breaker (deterministic fallback alphabetical a-tie over z-tie)
    const tieRes = await orchIntent.executeByIntent("tie", mockCtx);
    assert.strictEqual(tieRes.agentId, "a-tie-breaker", "Alphabetical fallback failed");

    // 3. No match throws standard execution error fallback (code INTENT_NOT_FOUND)
    const missingIntentRes = await orchIntent.executeByIntent("missing_intent", mockCtx);
    assert.strictEqual(missingIntentRes.ok, false);
    assert.strictEqual(!missingIntentRes.ok && missingIntentRes.error.code, "INTENT_NOT_FOUND");

    console.log("✅ Intent routing scoring and fallback successfully verified");

    // TEST 7: Execution Observability
    let observedEvents: any[] = [];
    const orchObs = new Orchestrator(new MockRegistry() as any);
    orchObs.addObserver({
        onExecution: (event) => observedEvents.push(event)
    });

    orchObs.registerExecutable({ id: "exact-match-agent" as AgentId, execute: async () => ({ ok: true, durationMs: 0, agentId: "exact-match-agent" as AgentId }) });

    // Test observer triggers on success with meta tags
    await orchObs.executeByIntent("analyze_code", mockCtx);
    assert.strictEqual(observedEvents.length, 1);
    assert.strictEqual(observedEvents[0].agentId, "exact-match-agent");
    assert.strictEqual(observedEvents[0].success, true);
    assert.strictEqual(observedEvents[0].intent, "analyze_code");
    assert.ok(observedEvents[0].startedAt > 0);
    assert.ok(observedEvents[0].finishedAt >= observedEvents[0].startedAt);

    // Test observer triggers on failure
    orchObs.registerExecutable({ id: "fail-agent" as AgentId, execute: async () => ({ ok: false, durationMs: 0, error: { name: "Err", message: "Failed", code: "FAILED" }, agentId: "fail-agent" as AgentId }) });
    let failCtx = createMockTaskContext({ requestId: "req-fail", correlationId: "fail-id" });
    await orchObs.execute("fail-agent" as AgentId, failCtx);

    assert.strictEqual(observedEvents.length, 2);
    assert.strictEqual(observedEvents[1].agentId, "fail-agent");
    assert.strictEqual(observedEvents[1].success, false);
    assert.strictEqual(observedEvents[1].error.message, "Failed");

    console.log("✅ Execution observability and audit tracking successfully verified");

    // TEST 8: Tenant Isolation
    const tenantRegistry = {
        get: (id: string) => {
            if (id === "global-agent") return { id, name: "Global", version: "1" };
            if (id === "tenant-a-agent") return { id, name: "A", version: "1", tenantIds: ["tenant-a"] };
            return undefined;
        }
    };
    const orchTenant = new Orchestrator(tenantRegistry as any);
    orchTenant.registerExecutable({ id: "global-agent" as AgentId, execute: async () => ({ ok: true, durationMs: 0, agentId: "global-agent" as AgentId }) });
    orchTenant.registerExecutable({ id: "tenant-a-agent" as AgentId, execute: async () => ({ ok: true, durationMs: 0, agentId: "tenant-a-agent" as AgentId }) });

    // Global agent can be executed by anyone
    const resGlobal = await orchTenant.execute("global-agent" as AgentId, { ...mockCtx, tenantId: "tenant-b" });
    assert.strictEqual(resGlobal.ok, true);

    // Tenant A agent executed by Tenant A
    const resTenantA = await orchTenant.execute("tenant-a-agent" as AgentId, { ...mockCtx, tenantId: "tenant-a" });
    assert.strictEqual(resTenantA.ok, true);

    // Tenant A agent executed by Tenant B -> Failure
    const resTenantB = await orchTenant.execute("tenant-a-agent" as AgentId, { ...mockCtx, tenantId: "tenant-b" });
    assert.strictEqual(resTenantB.ok, false);
    assert.strictEqual(!resTenantB.ok && resTenantB.error.code, "TENANT_MISMATCH");

    console.log("✅ Tenant isolation routing securely verified");

    // TEST 9: Policy Engine Integration
    const mockPolicyEngine = {
        evaluate: (ctx: any) => {
            if (ctx.capability === "forbidden-cap") return { allowed: false, reason: "Capability denied" };
            if (ctx.payload && (ctx.payload as any).size > 100) return { allowed: false, reason: "Payload too large" };
            return { allowed: true };
        },
        acquire: (ctx: any) => {
            if (ctx.agentId === "concurrent-agent") return false;
            return true;
        },
        release: (ctx: any) => { }
    };

    const orchPolicy = new Orchestrator(new MockRegistry() as any, {}, mockPolicyEngine as any);
    orchPolicy.registerExecutable({ id: "policy-agent" as AgentId, execute: async () => ({ ok: true, durationMs: 0, agentId: "policy-agent" as AgentId }) });
    orchPolicy.registerExecutable({ id: "concurrent-agent" as AgentId, execute: async () => ({ ok: true, durationMs: 0, agentId: "concurrent-agent" as AgentId }) });

    // 1. Allowed Execution
    const policyRes1 = await orchPolicy.execute("policy-agent" as AgentId, mockCtx);
    assert.strictEqual(policyRes1.ok, true);

    // 2. Denied Capability
    const policyRes2 = await orchPolicy.execute("policy-agent" as AgentId, mockCtx, { capability: "forbidden-cap" });
    assert.strictEqual(policyRes2.ok, false);
    assert.strictEqual(!policyRes2.ok && policyRes2.error.code, "POLICY_DENIED");

    // 3. Payload Limit Exceeded
    const policyRes3 = await orchPolicy.execute("policy-agent" as AgentId, createMockTaskContext({ payload: { size: 150 } }));
    assert.strictEqual(policyRes3.ok, false);
    assert.strictEqual(!policyRes3.ok && policyRes3.error.code, "POLICY_DENIED");
    assert.ok(!policyRes3.ok && policyRes3.error.message.includes("Payload too large"));

    // 4. Concurrency Blocked
    const policyRes4 = await orchPolicy.execute("concurrent-agent" as AgentId, mockCtx);
    assert.strictEqual(policyRes4.ok, false);
    assert.strictEqual(!policyRes4.ok && policyRes4.error.code, "CONCURRENCY_LIMITED");

    console.log("✅ Policy Engine Guardrails natively verified");
}

runTests().catch(e => {
    console.error("Test failed", e);
    process.exit(1);
});
