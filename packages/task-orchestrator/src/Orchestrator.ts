import type { AgentId } from "@complihub/agent-core";
import type { AgentRegistry } from "@complihub/agent-registry";
import type { ExecutableAgent, TaskContext, ExecutionResult, Middleware, ExecutionOptions } from "./types";
import { composeMiddlewares } from "./middleware";
import { IntentRouter } from "./IntentRouter";

export interface LifecycleHooks {
    beforeExecute?: (agentId: AgentId, context: TaskContext) => void | Promise<void>;
    afterExecute?: (agentId: AgentId, context: TaskContext, result: ExecutionResult) => void | Promise<void>;
    onError?: (agentId: AgentId, context: TaskContext, error: unknown) => void | Promise<void>;
}

export class Orchestrator {
    private executableAgents = new Map<string, ExecutableAgent>();
    private middlewares: Middleware[] = [];

    constructor(
        private registry: AgentRegistry,
        private hooks: LifecycleHooks = {}
    ) { }

    public use(middleware: Middleware): void {
        this.middlewares.push(middleware);
    }

    public registerExecutable(agent: ExecutableAgent): void {
        if (!this.registry.get(agent.id)) {
            throw new Error(`Execution error: Agent ${agent.id} must be registered in the AgentRegistry before execution registration.`);
        }
        this.executableAgents.set(agent.id, agent);
    }

    public async execute(agentId: AgentId, context: TaskContext, options?: ExecutionOptions): Promise<ExecutionResult> {
        const agent = this.executableAgents.get(agentId);

        if (!agent) {
            return {
                ok: false,
                error: { name: "AgentNotFoundError", message: `Agent with id '${agentId}' not found or not registered for execution.` },
                durationMs: 0,
                agentId
            };
        }

        if (this.hooks.beforeExecute) {
            await this.hooks.beforeExecute(agentId, context);
        }

        const start = Date.now();
        const chain = composeMiddlewares(this.middlewares);

        const executionPromise = chain(context, async () => {
            return await agent.execute(context);
        }, agentId);

        let result: ExecutionResult;

        if (options?.timeoutMs) {
            const timeoutPromise = new Promise<ExecutionResult>((_, reject) => {
                setTimeout(() => {
                    reject(new Error("Execution timed out"));
                }, options.timeoutMs);
            });

            try {
                result = await Promise.race([executionPromise, timeoutPromise]);
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                const isTimeout = err.message === "Execution timed out";

                if (this.hooks.onError) {
                    await this.hooks.onError(agentId, context, err);
                }

                result = {
                    ok: false,
                    error: {
                        name: err.name,
                        message: err.message,
                        stack: err.stack,
                        code: isTimeout ? "TIMEOUT" : "EXECUTION_ERROR"
                    },
                    durationMs: Date.now() - start,
                    agentId
                };
            }
        } else {
            try {
                result = await executionPromise;
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                if (this.hooks.onError) {
                    await this.hooks.onError(agentId, context, err);
                }
                result = {
                    ok: false,
                    error: {
                        name: err.name,
                        message: err.message,
                        stack: err.stack,
                        code: "EXECUTION_ERROR"
                    },
                    durationMs: Date.now() - start,
                    agentId
                };
            }
        }

        // Ensure duration is always accurately set by orchestrator
        result.durationMs = Date.now() - start;

        if (this.hooks.afterExecute) {
            await this.hooks.afterExecute(agentId, context, result);
        }

        return result;
    }

    public async executeByCapability(capability: string, context: TaskContext, options?: ExecutionOptions): Promise<ExecutionResult> {
        const start = Date.now();
        const agents = this.registry.getByCapability(capability);

        if (agents.length === 0) {
            return {
                ok: false,
                error: {
                    name: "CapabilityError",
                    message: `No agent found with capability '${capability}'.`,
                    code: "CAPABILITY_NOT_FOUND"
                },
                durationMs: Date.now() - start,
                agentId: "task-orchestrator" as AgentId
            };
        }

        if (agents.length > 1) {
            return {
                ok: false,
                error: {
                    name: "CapabilityError",
                    message: `Multiple agents found with capability '${capability}'. Cannot resolve unambiguously.`,
                    code: "AMBIGUOUS_CAPABILITY"
                },
                durationMs: Date.now() - start,
                agentId: "task-orchestrator" as AgentId
            };
        }

        return this.execute(agents[0].id, context, options);
    }

    public async executeByIntent(intent: string, context: TaskContext, options?: ExecutionOptions): Promise<ExecutionResult> {
        const start = Date.now();
        const router = new IntentRouter(this.registry);

        try {
            const agent = router.route(intent);
            return await this.execute(agent.id, context, options);
        } catch (e) {
            return {
                ok: false,
                error: {
                    name: "IntentRoutingError",
                    message: e instanceof Error ? e.message : String(e),
                    code: "INTENT_NOT_FOUND"
                },
                durationMs: Date.now() - start,
                agentId: "task-orchestrator" as AgentId
            };
        }
    }
}
