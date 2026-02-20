import type { AgentId } from "@complihub/agent-core";
import { type PolicyContext, createPolicyContext } from "@complihub360/types";
import type { AgentRegistry } from "@complihub/agent-registry";
import type { ExecutableAgent, TaskContext, ExecutionResult, Middleware, ExecutionOptions, ExecutionObserver } from "./types";
import { composeMiddlewares } from "./middleware";
import { IntentRouter } from "./IntentRouter";
import type { PolicyEngine } from "@complihub/policy-engine";

export interface LifecycleHooks {
    beforeExecute?: (agentId: AgentId, context: TaskContext) => void | Promise<void>;
    afterExecute?: (agentId: AgentId, context: TaskContext, result: ExecutionResult) => void | Promise<void>;
    onError?: (agentId: AgentId, context: TaskContext, error: unknown) => void | Promise<void>;
}

export class Orchestrator {
    private executableAgents = new Map<string, ExecutableAgent>();
    private middlewares: Middleware[] = [];
    private observers: ExecutionObserver[] = [];

    constructor(
        private registry: AgentRegistry,
        private hooks: LifecycleHooks = {},
        private policyEngine?: PolicyEngine
    ) { }

    public use(middleware: Middleware): void {
        this.middlewares.push(middleware);
    }

    public addObserver(observer: ExecutionObserver): void {
        this.observers.push(observer);
    }

    public registerExecutable(agent: ExecutableAgent): void {
        if (!this.registry.get(agent.id)) {
            throw new Error(`Execution error: Agent ${agent.id} must be registered in the AgentRegistry before execution registration.`);
        }
        this.executableAgents.set(agent.id, agent);
    }

    public async execute(agentId: AgentId, context: TaskContext, options?: ExecutionOptions): Promise<ExecutionResult> {
        const start = Date.now();
        const agent = this.executableAgents.get(agentId);
        const registered = this.registry.get(agentId);

        if (!agent || !registered) {
            const error = { name: "AgentNotFoundError", message: `Agent with id '${agentId}' not found or not registered for execution.` };
            this.notifyObservers(agentId, context, start, Date.now(), false, error, options);
            return {
                ok: false,
                error,
                durationMs: 0,
                agentId
            };
        }

        if (registered.tenantIds && !registered.tenantIds.includes(context.tenantId)) {
            const error = { name: "TenantIsolationError", message: `Agent with id '${agentId}' is not permitted to execute for tenant '${context.tenantId}'.`, code: "TENANT_MISMATCH" };
            this.notifyObservers(agentId, context, start, Date.now(), false, error, options);
            return {
                ok: false,
                error,
                durationMs: 0,
                agentId
            };
        }

        let clampedExecutionMs = options?.timeoutMs;
        const policyCtx: PolicyContext = createPolicyContext(context, {
            agentId,
            intent: options?.intent,
            capability: options?.capability
        });

        if (this.policyEngine) {
            const decision = this.policyEngine.evaluate(policyCtx);
            if (!decision.allowed) {
                const error = { name: "PolicyDeniedError", message: decision.reason || "Execution denied by policy engine.", code: "POLICY_DENIED" };
                this.notifyObservers(agentId, context, start, Date.now(), false, error, options);
                return {
                    ok: false,
                    error,
                    durationMs: 0,
                    agentId
                };
            }

            if (!this.policyEngine.acquire(policyCtx)) {
                const error = { name: "PolicyConcurrencyError", message: "Concurrency limit exceeded for tenant.", code: "CONCURRENCY_LIMITED" };
                this.notifyObservers(agentId, context, start, Date.now(), false, error, options);
                return {
                    ok: false,
                    error,
                    durationMs: 0,
                    agentId
                };
            }

            if (decision.metadata?.clampedExecutionMs) {
                clampedExecutionMs = clampedExecutionMs
                    ? Math.min(clampedExecutionMs, decision.metadata.clampedExecutionMs)
                    : decision.metadata.clampedExecutionMs;
            }
        }

        if (this.hooks.beforeExecute) {
            await this.hooks.beforeExecute(agentId, context);
        }

        const chain = composeMiddlewares(this.middlewares);

        const executionPromise = chain(context, async () => {
            return await agent.execute(context);
        }, agentId);

        let result: ExecutionResult;

        if (clampedExecutionMs) {
            const timeoutPromise = new Promise<ExecutionResult>((_, reject) => {
                setTimeout(() => {
                    reject(new Error("Execution timed out"));
                }, clampedExecutionMs);
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

        if (this.policyEngine) {
            this.policyEngine.release(createPolicyContext(context));
        }

        this.notifyObservers(agentId, context, start, Date.now(), result.ok, result.ok ? undefined : result.error, options);

        return result;
    }

    private notifyObservers(agentId: AgentId, context: TaskContext, start: number, end: number, success: boolean, error?: { name: string, message: string }, options?: ExecutionOptions) {
        if (this.observers.length === 0) return;

        const event = {
            agentId,
            tenantId: context.tenantId,
            appId: context.appId,
            intent: options?.intent,
            capability: options?.capability,
            startedAt: start,
            finishedAt: end,
            durationMs: end - start,
            success,
            error
        };

        for (const obs of this.observers) {
            try {
                obs.onExecution(event);
            } catch (e) {
                console.error(`Observer failed during onExecution for agent ${agentId}:`, e);
            }
        }
    }

    public async executeByCapability(capability: string, context: TaskContext, options?: ExecutionOptions): Promise<ExecutionResult> {
        const start = Date.now();
        const agents = this.registry.getByCapability(capability, context.tenantId);

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

        return this.execute(agents[0].id, context, { ...options, capability });
    }

    public async executeByIntent(intent: string, context: TaskContext, options?: ExecutionOptions): Promise<ExecutionResult> {
        const start = Date.now();
        const router = new IntentRouter(this.registry);

        try {
            const agent = router.route(intent, context.tenantId);
            return await this.execute(agent.id, context, { ...options, intent });
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
