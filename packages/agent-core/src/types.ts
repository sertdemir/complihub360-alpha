export type AgentId =
    | "task-orchestrator"
    | "repo-engineer"
    | "ui-builder"
    | "qa-sentinel"
    | "knowledge-librarian"
    | "compliance-check-agent";

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

export type IntentDescriptor = {
    intent: string;
    tags?: string[];
    priority?: number;
}

export interface AgentCapability {
    name: string;
    description?: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
    supportedIntents?: IntentDescriptor[];
}

export interface Agent {
    id: AgentId;
    displayName: string;
    capabilities?: AgentCapability[];
    tenantIds?: string[];
    run: (input: TaskInput, ctx: AgentContext) => Promise<TaskResult>;
}

export type ExecutionEvent = {
    agentId: AgentId;
    tenantId: string;
    appId: string;
    intent?: string;
    capability?: string;
    startedAt: number;
    finishedAt: number;
    durationMs: number;
    success: boolean;
    error?: {
        name: string;
        message: string;
    };
};

export interface PolicyDecision {
    allowed: boolean;
    reason?: string;
    metadata?: Record<string, any>;
}

export type { PolicyContext, TaskContext } from "@complihub360/types";

export interface TenantPolicy {
    allowedAgents?: AgentId[];
    deniedAgents?: AgentId[];
    allowedCapabilities?: string[];
    deniedCapabilities?: string[];
    allowedIntents?: string[];
    deniedIntents?: string[];
    maxPayloadBytes?: number;
    maxExecutionMs?: number;
    rateLimit?: { windowMs: number; max: number };
    concurrencyLimit?: number;
    modelAllowList?: string[];
}