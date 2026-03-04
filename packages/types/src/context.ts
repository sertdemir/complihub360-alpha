import { DEFAULT_APP_ID } from "./app.js";

export interface TaskContext {
    appId: string;
    tenantId: string;
    correlationId: string;
    requestId: string;
    timestamp: Date;
    payload?: unknown;
}

export interface PrivacyFlags {
    sanitized_ready: boolean;
    consent_allowAI: boolean;
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
    countryCode: string;
}

export interface PolicyContext {
    appId: string;
    tenantId: string;
    correlationId: string;
    requestId: string;
    timestamp: Date;
    agentId?: string;
    capability?: string;
    intent?: string;
    payload?: unknown;
    privacyFlags?: PrivacyFlags;
    metadata?: Record<string, any>;
}

function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function createTaskContext(overrides?: Partial<TaskContext>): TaskContext {
    return {
        appId: DEFAULT_APP_ID,
        tenantId: "default-tenant",
        correlationId: generateId("corr"),
        requestId: generateId("req"),
        timestamp: new Date(),
        payload: {},
        ...overrides,
    };
}

export function createPolicyContext(taskCtx: TaskContext, overrides?: Partial<PolicyContext>): PolicyContext {
    return {
        appId: taskCtx.appId,
        tenantId: taskCtx.tenantId,
        correlationId: taskCtx.correlationId,
        requestId: taskCtx.requestId,
        timestamp: new Date(),
        payload: taskCtx.payload,
        ...overrides,
    };
}
