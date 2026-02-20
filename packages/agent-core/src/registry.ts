import type { Agent, AgentId } from "./types";

export class AgentRegistry {
    private agents = new Map<AgentId, Agent>();

    register(agent: Agent) {
        this.agents.set(agent.id, agent);
    }

    get(id: AgentId) {
        const agent = this.agents.get(id);
        if (!agent) throw new Error(`Agent not found: ${id}`);
        return agent;
    }

    list() {
        return Array.from(this.agents.values());
    }
}