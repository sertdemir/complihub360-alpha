import type { AgentRegistry, RegisteredAgent } from "@complihub/agent-registry";

export class IntentRouter {
    constructor(private registry: AgentRegistry) { }

    public route(intent: string): RegisteredAgent {
        const agents = this.registry.list();
        let bestScore = -1;
        let candidates: RegisteredAgent[] = [];

        for (const agent of agents) {
            let maxScoreForAgent = -1;

            if (agent.capabilities) {
                for (const cap of agent.capabilities) {
                    let baseCapScore = cap.name === intent ? 2 : 0;
                    let highestIntentScore = 0;

                    if (cap.supportedIntents) {
                        for (const intentDesc of cap.supportedIntents) {
                            let descScore = 0;

                            if (intentDesc.intent === intent) {
                                descScore = 10;
                            } else if (intentDesc.tags && intentDesc.tags.includes(intent)) {
                                descScore = 3;
                            }

                            if (descScore > 0) {
                                descScore += (intentDesc.priority || 0);
                            }

                            if (descScore > highestIntentScore) {
                                highestIntentScore = descScore;
                            }
                        }
                    }

                    const totalCapScore = baseCapScore + highestIntentScore;
                    if (totalCapScore > 0 && totalCapScore > maxScoreForAgent) {
                        maxScoreForAgent = totalCapScore;
                    }
                }
            }

            if (maxScoreForAgent > 0) {
                if (maxScoreForAgent > bestScore) {
                    bestScore = maxScoreForAgent;
                    candidates = [agent];
                } else if (maxScoreForAgent === bestScore) {
                    candidates.push(agent);
                }
            }
        }

        if (candidates.length === 0) {
            throw new Error(`No agent found matching intent: '${intent}'`);
        }

        // Deterministic fallback (alphabetical AgentId) if tie
        candidates.sort((a, b) => a.id.localeCompare(b.id));

        return candidates[0];
    }
}
