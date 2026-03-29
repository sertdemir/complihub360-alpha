import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentId } from "@complihub/agent-core";
import type { ExecutableAgent, Middleware, ExecutionObserver } from "@complihub/task-orchestrator";
import type { RegisteredAgent } from "@complihub/agent-registry";
import type { Plugin } from "../types.js";
import { PluginManager } from "../PluginManager.js";

function createMockRegistry() {
    return {
        register: vi.fn(),
        get: vi.fn((id: string) => ({ id, name: "Mock", version: "1" })),
        list: vi.fn(() => []),
        getByCapability: vi.fn(() => []),
        hasCapability: vi.fn(() => false)
    };
}

function createMockOrchestrator() {
    return {
        use: vi.fn(),
        addObserver: vi.fn(),
        registerExecutable: vi.fn()
    };
}

describe("PluginManager", () => {
    let registry: ReturnType<typeof createMockRegistry>;
    let orchestrator: ReturnType<typeof createMockOrchestrator>;
    let manager: PluginManager;

    beforeEach(() => {
        registry = createMockRegistry();
        orchestrator = createMockOrchestrator();
        manager = new PluginManager(registry as any, orchestrator as any);
    });

    it("loads a minimal plugin with only meta", async () => {
        const plugin: Plugin = { meta: { name: "minimal", version: "1.0.0" } };
        await manager.load(plugin);

        expect(manager.isLoaded("minimal")).toBe(true);
        expect(manager.getLoaded()).toHaveLength(1);
        expect(registry.register).not.toHaveBeenCalled();
        expect(orchestrator.use).not.toHaveBeenCalled();
        expect(orchestrator.addObserver).not.toHaveBeenCalled();
        expect(orchestrator.registerExecutable).not.toHaveBeenCalled();
    });

    it("registers agents in the registry", async () => {
        const agent: RegisteredAgent = {
            id: "test-agent" as AgentId,
            name: "Test Agent",
            version: "1.0.0"
        };
        const plugin: Plugin = {
            meta: { name: "agent-plugin", version: "1.0.0" },
            agents: [agent]
        };

        await manager.load(plugin);
        expect(registry.register).toHaveBeenCalledWith(agent);
    });

    it("registers executables with the orchestrator", async () => {
        const exec: ExecutableAgent = {
            id: "exec-agent" as AgentId,
            execute: async () => ({ ok: true as const, durationMs: 0, agentId: "exec-agent" as AgentId })
        };
        const plugin: Plugin = {
            meta: { name: "exec-plugin", version: "1.0.0" },
            executables: [exec]
        };

        await manager.load(plugin);
        expect(orchestrator.registerExecutable).toHaveBeenCalledWith(exec);
    });

    it("adds middleware to the orchestrator", async () => {
        const mw: Middleware = async (_ctx, next, _id) => next();
        const plugin: Plugin = {
            meta: { name: "mw-plugin", version: "1.0.0" },
            middlewares: [mw]
        };

        await manager.load(plugin);
        expect(orchestrator.use).toHaveBeenCalledWith(mw);
    });

    it("adds observers to the orchestrator", async () => {
        const obs: ExecutionObserver = { onExecution: vi.fn() };
        const plugin: Plugin = {
            meta: { name: "obs-plugin", version: "1.0.0" },
            observers: [obs]
        };

        await manager.load(plugin);
        expect(orchestrator.addObserver).toHaveBeenCalledWith(obs);
    });

    it("rejects duplicate plugin names", async () => {
        const plugin: Plugin = { meta: { name: "dupe", version: "1.0.0" } };
        await manager.load(plugin);

        await expect(manager.load(plugin)).rejects.toThrow("Plugin 'dupe' is already loaded.");
    });

    it("calls initialize before registration", async () => {
        const order: string[] = [];
        const plugin: Plugin = {
            meta: { name: "init-plugin", version: "1.0.0" },
            agents: [{ id: "init-agent" as AgentId, name: "Init Agent", version: "1.0.0" }],
            async initialize() {
                order.push("init");
            }
        };
        registry.register.mockImplementation(() => { order.push("register"); });

        await manager.load(plugin);
        expect(order).toEqual(["init", "register"]);
    });

    it("calls destroy on all plugins during destroyAll", async () => {
        const destroyA = vi.fn();
        const destroyB = vi.fn();

        await manager.load({ meta: { name: "a", version: "1" }, destroy: destroyA });
        await manager.load({ meta: { name: "b", version: "1" }, destroy: destroyB });

        await manager.destroyAll();

        expect(destroyA).toHaveBeenCalledOnce();
        expect(destroyB).toHaveBeenCalledOnce();
        expect(manager.getLoaded()).toHaveLength(0);
    });

    it("loadAll preserves order", async () => {
        const order: string[] = [];
        const pluginA: Plugin = {
            meta: { name: "first", version: "1" },
            middlewares: [async (_ctx, next) => { order.push("a"); return next(); }]
        };
        const pluginB: Plugin = {
            meta: { name: "second", version: "1" },
            middlewares: [async (_ctx, next) => { order.push("b"); return next(); }]
        };

        orchestrator.use.mockImplementation((mw: Middleware) => {
            // Track the order middlewares are added
            order.push("use");
        });

        await manager.loadAll([pluginA, pluginB]);

        expect(manager.getLoaded()).toHaveLength(2);
        expect(manager.getLoaded()[0].plugin.meta.name).toBe("first");
        expect(manager.getLoaded()[1].plugin.meta.name).toBe("second");
    });

    it("isLoaded returns false for unknown plugins", () => {
        expect(manager.isLoaded("nonexistent")).toBe(false);
    });
});
