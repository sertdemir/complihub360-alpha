import { describe, it, expect } from "vitest";
import type { AgentId, ExecutionEvent } from "@complihub/agent-core";
import { AuditTrailStore, createAuditTrailPlugin } from "../plugins/audit-trail.js";

function createMockEvent(overrides?: Partial<ExecutionEvent>): ExecutionEvent {
    return {
        agentId: "compliance-check-agent" as AgentId,
        tenantId: "tenant-a",
        appId: "app-1",
        startedAt: Date.now() - 100,
        finishedAt: Date.now(),
        durationMs: 100,
        success: true,
        ...overrides
    };
}

describe("AuditTrailStore", () => {
    it("records an event", () => {
        const store = new AuditTrailStore();
        const event = createMockEvent();
        store.record(event);

        const entries = store.getEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].agentId).toBe("compliance-check-agent");
        expect(entries[0].success).toBe(true);
    });

    it("filters by tenant", () => {
        const store = new AuditTrailStore();
        store.record(createMockEvent({ tenantId: "tenant-a" }));
        store.record(createMockEvent({ tenantId: "tenant-b" }));
        store.record(createMockEvent({ tenantId: "tenant-a" }));

        expect(store.getByTenant("tenant-a")).toHaveLength(2);
        expect(store.getByTenant("tenant-b")).toHaveLength(1);
        expect(store.getByTenant("tenant-c")).toHaveLength(0);
    });

    it("filters by agent", () => {
        const store = new AuditTrailStore();
        store.record(createMockEvent({ agentId: "repo-engineer" as AgentId }));
        store.record(createMockEvent({ agentId: "ui-builder" as AgentId }));
        store.record(createMockEvent({ agentId: "repo-engineer" as AgentId }));

        expect(store.getByAgent("repo-engineer" as AgentId)).toHaveLength(2);
        expect(store.getByAgent("ui-builder" as AgentId)).toHaveLength(1);
    });

    it("records error details", () => {
        const store = new AuditTrailStore();
        store.record(createMockEvent({
            success: false,
            error: { name: "PolicyDeniedError", message: "Capability denied" }
        }));

        const entries = store.getEntries();
        expect(entries[0].success).toBe(false);
        expect(entries[0].error?.name).toBe("PolicyDeniedError");
        expect(entries[0].error?.message).toBe("Capability denied");
    });

    it("records intent and capability", () => {
        const store = new AuditTrailStore();
        store.record(createMockEvent({ intent: "check_compliance", capability: "compliance_check" }));

        const entries = store.getEntries();
        expect(entries[0].intent).toBe("check_compliance");
        expect(entries[0].capability).toBe("compliance_check");
    });

    it("clear empties the store", () => {
        const store = new AuditTrailStore();
        store.record(createMockEvent());
        store.record(createMockEvent());

        store.clear();
        expect(store.getEntries()).toHaveLength(0);
    });
});

describe("createAuditTrailPlugin", () => {
    it("creates a plugin with correct meta", () => {
        const plugin = createAuditTrailPlugin();
        expect(plugin.meta.name).toBe("audit-trail");
        expect(plugin.meta.version).toBe("0.1.0");
    });

    it("provides an observer that records events", () => {
        const plugin = createAuditTrailPlugin();
        const observer = plugin.observers![0];
        const event = createMockEvent();

        observer.onExecution(event);

        expect(plugin.store.getEntries()).toHaveLength(1);
    });

    it("accepts a custom store", () => {
        const customStore = new AuditTrailStore();
        const plugin = createAuditTrailPlugin(customStore);

        expect(plugin.store).toBe(customStore);
    });

    it("destroy clears the store", async () => {
        const plugin = createAuditTrailPlugin();
        plugin.observers![0].onExecution(createMockEvent());

        expect(plugin.store.getEntries()).toHaveLength(1);
        await plugin.destroy!();
        expect(plugin.store.getEntries()).toHaveLength(0);
    });
});
