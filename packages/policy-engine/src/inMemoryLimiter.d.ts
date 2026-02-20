export declare class InMemoryLimiter {
    private tenantConcurrency;
    private rateWindowCounters;
    acquireConcurrency(tenantId: string, limit?: number): boolean;
    releaseConcurrency(tenantId: string): void;
    checkRateLimit(tenantId: string, limit?: {
        windowMs: number;
        max: number;
    }): boolean;
}
//# sourceMappingURL=inMemoryLimiter.d.ts.map