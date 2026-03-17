# Task Orchestrator & Capability Routing

The `@complihub/task-orchestrator` manages execution lifecycles (middlewares, timeouts, hooks) for agents.

With **Capability-Based Routing**, clients and orchestrators can dynamically route tasks to agents without hardcoding specific agent IDs. Instead, they specify the capability they need (e.g., `code-generation`, `static-analysis`).

## How Capability Routing Works

1. **Definition in Core**: The `AgentCapability` interface is injected into the core `Agent` definition during registration. Agents declare what they are capable of.
2. **Registry Lookup**: The `@complihub/agent-registry` catalogs all agents and their capabilities. It exposes queries like `getByCapability(name)`.
3. **Dynamic Execution**: Instead of calling `orchestrator.execute('repo-engineer', context)`, you can invoke:

```typescript
const result = await orchestrator.executeByCapability('code-generation', context);
```

### Safety Rules

The Orchestrator strictly enforces that capability routing must be unambiguous:

- If **0 agents** declare the capability, it safely returns an `ExecutionResult` describing `CAPABILITY_NOT_FOUND`.
- If **>1 agents** declare the exact same capability, it safely returns `AMBIGUOUS_CAPABILITY` to prevent unknown routing behaviors.
- Exactly **1 agent** will execute correctly and return standard outcomes.
