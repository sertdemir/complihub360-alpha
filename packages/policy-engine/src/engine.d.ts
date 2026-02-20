import type { PolicyContext, PolicyDecision, TenantPolicy } from "@complihub/agent-core";
export interface PolicyEngine {
    evaluate(ctx: PolicyContext): PolicyDecision;
    acquire(ctx: PolicyContext): boolean;
    release(ctx: PolicyContext): void;
}
export declare class DefaultPolicyEngine implements PolicyEngine {
    private store;
    private limiter;
    constructor(store: Map<string, TenantPolicy>);
    evaluate(ctx: PolicyContext): PolicyDecision;
    acquire(ctx: PolicyContext): boolean;
    release(ctx: PolicyContext): void;
}
//# sourceMappingURL=engine.d.ts.map