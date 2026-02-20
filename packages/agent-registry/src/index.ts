import type { AgentId, AgentCapability } from "@complihub/agent-core";

// Re-export AgentId for convenience if needed by consumers of the registry
export type { AgentId };

export interface RegisteredAgent {
    id: AgentId;
    name: string;
    description?: string;
    version: string;
    capabilities?: AgentCapability[];
    tenantIds?: string[];
}

export class AgentRegistry {
    private readonly agents = new Map<AgentId, RegisteredAgent>();

    public register(agent: RegisteredAgent): void {
        if (this.agents.has(agent.id)) {
            throw new Error(`Agent with id '${agent.id}' is already registered.`);
        }
        this.agents.set(agent.id, agent);
    }

    public get(id: AgentId): RegisteredAgent | undefined {
        return this.agents.get(id);
    }

    public list(): RegisteredAgent[] {
        return Array.from(this.agents.values());
    }

    public getByCapability(name: string, tenantId?: string): RegisteredAgent[] {
        return this.list().filter(agent => {
            const hasCap = agent.capabilities?.some(cap => cap.name === name);
            if (!hasCap) return false;
            if (tenantId && agent.tenantIds && !agent.tenantIds.includes(tenantId)) return false;
            return true;
        });
    }

    public hasCapability(agentId: AgentId, capability: string): boolean {
        const agent = this.get(agentId);
        if (!agent) return false;
        return !!agent.capabilities?.some(cap => cap.name === capability);
    }
}

export function createDefaultRegistry(): AgentRegistry {
    const registry = new AgentRegistry();
    registry.register({
        id: "compliance-check-agent" as AgentId,
        name: "Compliance Check Agent",
        version: "1.0.0",
        capabilities: [
            {
                name: "compliance_check",
                description: "Analyzes text for basic compliance rules."
            }
        ]
    });
    return registry;
}
