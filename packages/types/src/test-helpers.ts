import { TaskContext, PolicyContext, createTaskContext, createPolicyContext } from "./context";
import { DEFAULT_APP_ID } from "./app";

export function createMockTaskContext(overrides?: Partial<TaskContext>): TaskContext {
    return createTaskContext({
        appId: DEFAULT_APP_ID,
        tenantId: "tenant-a",
        correlationId: "test-correlation-1",
        requestId: "req-1",
        timestamp: new Date(),
        payload: {},
        ...overrides
    });
}

export function createMockPolicyContext(overrides?: Partial<PolicyContext>): PolicyContext {
    const taskCtx = createMockTaskContext();
    return createPolicyContext(taskCtx, overrides);
}
