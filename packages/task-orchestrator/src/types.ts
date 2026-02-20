import type { AgentId } from "@complihub/agent-core"

export interface TaskContext {
    requestId: string;
    payload: unknown;
    timestamp: Date;
}

// Ensure error is serializable
export interface ExecutionError {
    name: string;
    message: string;
    stack?: string;
    code?: string;
}

export type ExecutionResult<T = unknown> =
    | { ok: true; data?: T; durationMs: number; agentId: AgentId; meta?: Record<string, unknown> }
    | { ok: false; error: ExecutionError; durationMs: number; agentId: AgentId; meta?: Record<string, unknown> }

export interface ExecutableAgent {
    id: AgentId;
    execute(context: TaskContext): Promise<ExecutionResult>;
}

export type MiddlewareNext = () => Promise<ExecutionResult>;
export type Middleware = (context: TaskContext, next: MiddlewareNext, agentId: AgentId) => Promise<ExecutionResult>;

export interface ExecutionOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
}