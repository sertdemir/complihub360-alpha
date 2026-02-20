import * as assert from "node:assert";
import type { AgentId } from "@complihub/agent-core";
import { Orchestrator } from "./Orchestrator";
import { composeMiddlewares } from "./middleware";
import type { TaskContext, ExecutionResult, Middleware, ExecutableAgent } from "./types";

// Mock Registry for Test
class MockRegistry {
    get(id: string) { return id ? { id, name: "Test", version: "1" } : undefined; }
}

const mockCtx: TaskContext = { requestId: "req-1", payload: {}, timestamp: new Date() };

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
}

runTests().catch(e => {
    console.error("Test failed", e);
    process.exit(1);
});
