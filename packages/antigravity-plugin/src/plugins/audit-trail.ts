import type { ExecutionEvent, AgentId } from "@complihub/agent-core";
import type { ExecutionObserver } from "@complihub/task-orchestrator";
import type { Plugin } from "../types.js";

export interface AuditEntry {
    timestamp: string;
    agentId: AgentId;
    tenantId: string;
    appId: string;
    intent?: string;
    capability?: string;
    durationMs: number;
    success: boolean;
    error?: { name: string; message: string };
}

export class AuditTrailStore {
    private entries: AuditEntry[] = [];

    public record(event: ExecutionEvent): void {
        this.entries.push({
            timestamp: new Date(event.finishedAt).toISOString(),
            agentId: event.agentId,
            tenantId: event.tenantId,
            appId: event.appId,
            intent: event.intent,
            capability: event.capability,
            durationMs: event.durationMs,
            success: event.success,
            error: event.error
        });
    }

    public getEntries(): readonly AuditEntry[] {
        return this.entries;
    }

    public getByTenant(tenantId: string): AuditEntry[] {
        return this.entries.filter(e => e.tenantId === tenantId);
    }

    public getByAgent(agentId: AgentId): AuditEntry[] {
        return this.entries.filter(e => e.agentId === agentId);
    }

    public clear(): void {
        this.entries = [];
    }
}

export function createAuditTrailPlugin(store?: AuditTrailStore): Plugin & { store: AuditTrailStore } {
    const auditStore = store ?? new AuditTrailStore();

    const observer: ExecutionObserver = {
        onExecution(event: ExecutionEvent): void {
            auditStore.record(event);
        }
    };

    return {
        meta: {
            name: "audit-trail",
            version: "0.1.0",
            description: "Records all agent execution events into an audit trail store."
        },
        observers: [observer],
        store: auditStore,
        async destroy() {
            auditStore.clear();
        }
    };
}
