import type { PolicyContext, PolicyDecision, TenantPolicy, AgentId } from "@complihub/agent-core";
import { InMemoryLimiter } from "./inMemoryLimiter";

export interface PolicyEngine {
    evaluate(ctx: PolicyContext): PolicyDecision;
    acquire(ctx: PolicyContext): boolean;
    release(ctx: PolicyContext): void;
}

export class DefaultPolicyEngine implements PolicyEngine {
    private limiter = new InMemoryLimiter();

    constructor(private store: Map<string, TenantPolicy>) { }

    public evaluate(ctx: PolicyContext): PolicyDecision {
        const policy = this.store.get(ctx.tenantId);

        if (!policy) {
            return { allowed: false, reason: `No policy configured for tenant: ${ctx.tenantId}` };
        }

        // 1. Check Denied Constraints (Highest Priority)
        if (ctx.agentId && policy.deniedAgents?.includes(ctx.agentId)) {
            return { allowed: false, reason: `Agent '${ctx.agentId}' is explicitly denied by tenant policy.` };
        }
        if (ctx.capability && policy.deniedCapabilities?.includes(ctx.capability)) {
            return { allowed: false, reason: `Capability '${ctx.capability}' is explicitly denied by tenant policy.` };
        }
        if (ctx.intent && policy.deniedIntents?.includes(ctx.intent)) {
            return { allowed: false, reason: `Intent '${ctx.intent}' is explicitly denied by tenant policy.` };
        }

        // 2. Check Explicit Allows (If configured, act as allowlist)
        if (ctx.agentId && policy.allowedAgents && !policy.allowedAgents.includes(ctx.agentId)) {
            return { allowed: false, reason: `Agent '${ctx.agentId}' is not in tenant allowlist.` };
        }
        if (ctx.capability && policy.allowedCapabilities && !policy.allowedCapabilities.includes(ctx.capability)) {
            return { allowed: false, reason: `Capability '${ctx.capability}' is not in tenant allowlist.` };
        }
        if (ctx.intent && policy.allowedIntents && !policy.allowedIntents.includes(ctx.intent)) {
            return { allowed: false, reason: `Intent '${ctx.intent}' is not in tenant allowlist.` };
        }

        // 3. Payload Size Check
        if (ctx.payload && policy.maxPayloadBytes) {
            try {
                // Approximate size check
                const size = new TextEncoder().encode(JSON.stringify(ctx.payload)).length;
                if (size > policy.maxPayloadBytes) {
                    return { allowed: false, reason: `Payload size (${size} bytes) exceeds tenant limit (${policy.maxPayloadBytes} bytes).` };
                }
            } catch (e) {
                // If circular or un-stringifiable, allow but warn (best effort)
                console.warn(`[PolicyEngine] Unable to measure payload size for context: ${ctx.correlationId}`);
            }
        }

        // 4. Rate Limiting Check
        if (!this.limiter.checkRateLimit(ctx.tenantId, policy.rateLimit)) {
            return { allowed: false, reason: `Tenant rate limit exceeded.` };
        }

        // If we reached here, action is allowed. Add metadata clamp if timeout is set.
        const metadata: Record<string, any> = {};
        if (policy.maxExecutionMs) {
            metadata.clampedExecutionMs = policy.maxExecutionMs;
        }

        return { allowed: true, metadata };
    }

    public acquire(ctx: PolicyContext): boolean {
        const policy = this.store.get(ctx.tenantId);
        if (!policy || !policy.concurrencyLimit) return true; // Unrestricted if not configured
        return this.limiter.acquireConcurrency(ctx.tenantId, policy.concurrencyLimit);
    }

    public release(ctx: PolicyContext): void {
        this.limiter.releaseConcurrency(ctx.tenantId);
    }
}
