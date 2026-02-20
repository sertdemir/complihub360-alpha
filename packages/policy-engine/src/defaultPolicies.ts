import type { TenantPolicy } from "@complihub/agent-core";

export const DefaultTenantPolicies = new Map<string, TenantPolicy>([
    ["default", {
        maxExecutionMs: 10000,
        maxPayloadBytes: 1024 * 512, // 512KB
        concurrencyLimit: 5,
        rateLimit: { windowMs: 60000, max: 100 }
    }],
    ["tenant-a", {
        maxExecutionMs: 30000,
        concurrencyLimit: 10,
        rateLimit: { windowMs: 60000, max: 500 }
    }],
    ["strict-tenant", {
        maxExecutionMs: 5000,
        maxPayloadBytes: 1024 * 50, // 50KB
        concurrencyLimit: 1,
        allowedCapabilities: ["code-generation"]
    }]
]);
