export type AgentId =
    | "task-orchestrator"
    | "repo-engineer"
    | "ui-builder"
    | "qa-sentinel"
    | "knowledge-librarian";

export type TaskStatus = "queued" | "running" | "succeeded" | "failed";

export interface TaskInput {
    title: string;
    description?: string;
    payload?: Record<string, unknown>;
}

export interface TaskResult<T = unknown> {
    status: TaskStatus;
    data?: T;
    error?: { message: string; code?: string };
}

export interface AgentContext {
    correlationId: string;
    repoRoot?: string;
}

export interface AgentCapability {
    name: string;
    description?: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
}

export interface Agent {
    id: AgentId;
    displayName: string;
    capabilities?: AgentCapability[];
    run: (input: TaskInput, ctx: AgentContext) => Promise<TaskResult>;
}