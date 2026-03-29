import type { RegisteredAgent } from "@complihub/agent-registry";
import type { ExecutableAgent, Middleware, ExecutionObserver } from "@complihub/task-orchestrator";

export interface PluginMeta {
    name: string;
    version: string;
    description?: string;
}

export interface Plugin {
    meta: PluginMeta;

    /** Agents to register in the AgentRegistry. */
    agents?: RegisteredAgent[];

    /** Executable agents to register with the Orchestrator. */
    executables?: ExecutableAgent[];

    /** Middleware to insert into the Orchestrator's chain. */
    middlewares?: Middleware[];

    /** Observers to attach to the Orchestrator. */
    observers?: ExecutionObserver[];

    /** Optional async initialization hook called before registration. */
    initialize?(): Promise<void>;

    /** Optional teardown hook. */
    destroy?(): Promise<void>;
}

export interface PluginRegistration {
    plugin: Plugin;
    registeredAt: Date;
}
