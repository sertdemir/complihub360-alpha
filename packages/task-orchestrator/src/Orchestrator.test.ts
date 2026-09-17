import { describe, expect, it } from "vitest";
import type { AgentId, ExecutionEvent } from "@complihub/agent-core";
import { Orchestrator } from "./Orchestrator.js";
import { composeMiddlewares } from "./middleware.js";
import type { Middleware, ExecutableAgent } from "./types.js";
import { createMockTaskContext, type PolicyContext } from "@complihub360/types";

// Vorher war diese Datei ein `runTests()`-Skript mit node:assert und
// console.log, das sich am Ende selbst aufrief. vitest fand darin keine Suite
// ("No test suite found") und meldete die Datei als fehlgeschlagen — die
// Assertions liefen zwar, aber ihr Ergebnis las niemand. Schlimmer: der Ablauf
// war sequenziell hinter einem einzigen catch, also hat die erste scheiternde
// Assertion (Capability-Ambiguität) alles danach stumm übersprungen. Intent-
// Routing, Observability, Tenant-Isolation und Policy-Engine sind deshalb
// über längere Zeit gar nicht geprüft worden.

const mockCtx = createMockTaskContext();

const agentRef = (id: string) => ({ id: id as AgentId, name: id, version: "1" });

/** Führt eine Ausführung auf `id` zurück, die immer gelingt. */
const okAgent = (id: string): ExecutableAgent => ({
    id: id as AgentId,
    execute: async () => ({ ok: true, durationMs: 0, agentId: id as AgentId }),
});

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

    // Gab früher bedingungslos [] zurück. Damit war nur der Null-Treffer-Zweig
    // von executeByCapability erreichbar: die Ambiguitäts-Erwartung konnte gar
    // nicht eintreten (sie war die Assertion, die den Rest der Datei abwürgte),
    // und der Erfolgsfall lief ebenfalls ins Leere. Jetzt bedient der Mock alle
    // drei Zweige — 0, >1 und genau 1 Treffer.
    getByCapability(name: string) {
        if (name === "ambiguous") return [agentRef("dup-one"), agentRef("dup-two")];
        if (name === "code-generation") return [agentRef("repo-engineer")];
        return [];
    }
}

describe("composeMiddlewares", () => {
    it("durchläuft die Kette als Zwiebel: hin 1-2, Kern 3, zurück 2-1", async () => {
        const order: number[] = [];
        const m1: Middleware = async (_ctx, next) => { order.push(1); const r = await next(); order.push(1); return r; };
        const m2: Middleware = async (_ctx, next) => { order.push(2); const r = await next(); order.push(2); return r; };

        const composed = composeMiddlewares([m1, m2]);
        await composed(
            mockCtx,
            async () => { order.push(3); return { ok: true, durationMs: 0, agentId: "test-agent" as AgentId }; },
            "test-agent" as AgentId,
        );

        expect(order).toEqual([1, 2, 3, 2, 1]);
    });
});

describe("Orchestrator.execute", () => {
    it("lässt eine Middleware den Absturz eines Agenten abfangen", async () => {
        const orch = new Orchestrator(new MockRegistry() as any);
        orch.use(async (_ctx, next, id) => {
            try { return await next(); }
            catch (e) {
                return { ok: false, error: { name: "Error", message: (e as Error).message }, durationMs: 5, agentId: id };
            }
        });
        orch.registerExecutable({
            id: "error-agent" as AgentId,
            execute: async () => { throw new Error("Agent crashed!"); },
        });

        const res = await orch.execute("error-agent" as AgentId, mockCtx);

        expect(res.ok).toBe(false);
        expect(!res.ok && res.error.message).toBe("Agent crashed!");
    });

    it("bricht eine Ausführung ab, die ihr Zeitbudget überschreitet", async () => {
        const orch = new Orchestrator(new MockRegistry() as any);
        orch.registerExecutable({
            id: "slow-agent" as AgentId,
            execute: async () => new Promise(resolve =>
                setTimeout(() => resolve({ ok: true, durationMs: 100, agentId: "slow-agent" as AgentId }), 100)),
        });

        const res = await orch.execute("slow-agent" as AgentId, mockCtx, { timeoutMs: 10 });

        expect(res.ok).toBe(false);
        expect(!res.ok && res.error.code).toBe("TIMEOUT");
    });

    it("feuert die Lifecycle-Hooks um eine erfolgreiche Ausführung", async () => {
        const hookLogs: string[] = [];
        const orch = new Orchestrator(new MockRegistry() as any, {
            beforeExecute: () => { hookLogs.push("before"); },
            afterExecute: () => { hookLogs.push("after"); },
        });
        orch.registerExecutable(okAgent("normal-agent"));

        await orch.execute("normal-agent" as AgentId, mockCtx);

        expect(hookLogs).toEqual(["before", "after"]);
    });
});

describe("Orchestrator.executeByCapability", () => {
    it("weist eine unbekannte Fähigkeit ab", async () => {
        const orch = new Orchestrator(new MockRegistry() as any);

        const res = await orch.executeByCapability("missing", mockCtx);

        expect(res.ok).toBe(false);
        expect(!res.ok && res.error.code).toBe("CAPABILITY_NOT_FOUND");
    });

    it("rät nicht, wenn mehrere Agenten dieselbe Fähigkeit tragen", async () => {
        const orch = new Orchestrator(new MockRegistry() as any);

        const res = await orch.executeByCapability("ambiguous", mockCtx);

        expect(res.ok).toBe(false);
        expect(!res.ok && res.error.code).toBe("AMBIGUOUS_CAPABILITY");
    });

    it("führt den einen passenden Agenten aus", async () => {
        const orch = new Orchestrator(new MockRegistry() as any);
        orch.registerExecutable(okAgent("repo-engineer"));

        const res = await orch.executeByCapability("code-generation", mockCtx);

        expect(res.ok).toBe(true);
        expect(res.ok && res.agentId).toBe("repo-engineer");
    });
});

describe("Orchestrator.executeByIntent", () => {
    const withAllAgents = () => {
        const orch = new Orchestrator(new MockRegistry() as any);
        for (const id of ["exact-match-agent", "tag-match-agent", "cap-name-agent", "a-tie-breaker", "z-tie-breaker"]) {
            orch.registerExecutable(okAgent(id));
        }
        return orch;
    };

    it("lässt den exakten Intent-Treffer vor Tag plus Priorität gewinnen", async () => {
        const res = await withAllAgents().executeByIntent("analyze_code", mockCtx);

        // Exakter Treffer zählt 10, Tag+Priorität nur 8.
        expect(res.agentId).toBe("exact-match-agent");
    });

    it("löst Gleichstand deterministisch alphabetisch auf", async () => {
        const res = await withAllAgents().executeByIntent("tie", mockCtx);

        expect(res.agentId).toBe("a-tie-breaker");
    });

    it("weist einen Intent ohne jeden Treffer ab", async () => {
        const res = await withAllAgents().executeByIntent("missing_intent", mockCtx);

        expect(res.ok).toBe(false);
        expect(!res.ok && res.error.code).toBe("INTENT_NOT_FOUND");
    });
});

describe("Orchestrator-Observability", () => {
    it("meldet eine erfolgreiche Ausführung mit Intent und Zeitstempeln", async () => {
        const events: ExecutionEvent[] = [];
        const orch = new Orchestrator(new MockRegistry() as any);
        orch.addObserver({ onExecution: (event) => events.push(event) });
        orch.registerExecutable(okAgent("exact-match-agent"));

        await orch.executeByIntent("analyze_code", mockCtx);

        expect(events).toHaveLength(1);
        expect(events[0].agentId).toBe("exact-match-agent");
        expect(events[0].success).toBe(true);
        expect(events[0].intent).toBe("analyze_code");
        expect(events[0].startedAt).toBeGreaterThan(0);
        expect(events[0].finishedAt).toBeGreaterThanOrEqual(events[0].startedAt);
    });

    it("meldet auch eine gescheiterte Ausführung", async () => {
        const events: ExecutionEvent[] = [];
        const orch = new Orchestrator(new MockRegistry() as any);
        orch.addObserver({ onExecution: (event) => events.push(event) });
        orch.registerExecutable({
            id: "fail-agent" as AgentId,
            execute: async () => ({
                ok: false, durationMs: 0,
                error: { name: "Err", message: "Failed", code: "FAILED" },
                agentId: "fail-agent" as AgentId,
            }),
        });

        await orch.execute("fail-agent" as AgentId, createMockTaskContext({ requestId: "req-fail", correlationId: "fail-id" }));

        expect(events).toHaveLength(1);
        expect(events[0].agentId).toBe("fail-agent");
        expect(events[0].success).toBe(false);
        expect(events[0].error?.message).toBe("Failed");
    });
});

describe("Mandantentrennung", () => {
    const tenantRegistry = {
        get: (id: string) => {
            if (id === "global-agent") return { id, name: "Global", version: "1" };
            if (id === "tenant-a-agent") return { id, name: "A", version: "1", tenantIds: ["tenant-a"] };
            return undefined;
        },
    };
    const orchestrator = () => {
        const orch = new Orchestrator(tenantRegistry as any);
        orch.registerExecutable(okAgent("global-agent"));
        orch.registerExecutable(okAgent("tenant-a-agent"));
        return orch;
    };

    it("lässt einen Agenten ohne Mandantenbindung für jeden laufen", async () => {
        const res = await orchestrator().execute("global-agent" as AgentId, { ...mockCtx, tenantId: "tenant-b" });

        expect(res.ok).toBe(true);
    });

    it("lässt den eigenen Mandanten seinen Agenten ausführen", async () => {
        const res = await orchestrator().execute("tenant-a-agent" as AgentId, { ...mockCtx, tenantId: "tenant-a" });

        expect(res.ok).toBe(true);
    });

    it("verweigert einem fremden Mandanten denselben Agenten", async () => {
        const res = await orchestrator().execute("tenant-a-agent" as AgentId, { ...mockCtx, tenantId: "tenant-b" });

        expect(res.ok).toBe(false);
        expect(!res.ok && res.error.code).toBe("TENANT_MISMATCH");
    });
});

describe("Policy-Engine-Leitplanken", () => {
    const mockPolicyEngine = {
        evaluate: (ctx: PolicyContext) => {
            if (ctx.capability === "forbidden-cap") return { allowed: false, reason: "Capability denied" };
            if (((ctx.payload as { size?: number } | undefined)?.size ?? 0) > 100) return { allowed: false, reason: "Payload too large" };
            return { allowed: true };
        },
        acquire: (ctx: PolicyContext) => ctx.agentId !== "concurrent-agent",
        release: () => { },
    };
    const orchestrator = () => {
        const orch = new Orchestrator(new MockRegistry() as any, {}, mockPolicyEngine as any);
        orch.registerExecutable(okAgent("policy-agent"));
        orch.registerExecutable(okAgent("concurrent-agent"));
        return orch;
    };

    it("lässt eine erlaubte Ausführung durch", async () => {
        const res = await orchestrator().execute("policy-agent" as AgentId, mockCtx);

        expect(res.ok).toBe(true);
    });

    it("blockt eine verbotene Fähigkeit", async () => {
        const res = await orchestrator().execute("policy-agent" as AgentId, mockCtx, { capability: "forbidden-cap" });

        expect(res.ok).toBe(false);
        expect(!res.ok && res.error.code).toBe("POLICY_DENIED");
    });

    it("blockt eine zu große Nutzlast und nennt den Grund", async () => {
        const res = await orchestrator().execute("policy-agent" as AgentId, createMockTaskContext({ payload: { size: 150 } }));

        expect(res.ok).toBe(false);
        expect(!res.ok && res.error.code).toBe("POLICY_DENIED");
        expect(!res.ok && res.error.message).toContain("Payload too large");
    });

    it("blockt, wenn kein Nebenläufigkeits-Slot frei ist", async () => {
        const res = await orchestrator().execute("concurrent-agent" as AgentId, mockCtx);

        expect(res.ok).toBe(false);
        expect(!res.ok && res.error.code).toBe("CONCURRENCY_LIMITED");
    });
});
