import type { AgentId, AgentCapability } from "@complihub/agent-core";

// Re-export AgentId for convenience if needed by consumers of the registry
export type { AgentId };

export interface RegisteredAgent {
    id: AgentId;
    name: string;
    description?: string;
    version: string;
    capabilities?: AgentCapability[];
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

    public getByCapability(name: string): RegisteredAgent[] {
        return this.list().filter(agent =>
            agent.capabilities?.some(cap => cap.name === name)
        );
    }

    public hasCapability(agentId: AgentId, capability: string): boolean {
        const agent = this.get(agentId);
        if (!agent) return false;
        return !!agent.capabilities?.some(cap => cap.name === capability);
    }
}
