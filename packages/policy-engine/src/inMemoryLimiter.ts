export class InMemoryLimiter {
    private tenantConcurrency = new Map<string, number>();
    private rateWindowCounters = new Map<string, { count: number; windowStart: number }>();

    public acquireConcurrency(tenantId: string, limit?: number): boolean {
        if (!limit) return true;
        const current = this.tenantConcurrency.get(tenantId) || 0;
        if (current >= limit) return false;

        this.tenantConcurrency.set(tenantId, current + 1);
        return true;
    }

    public releaseConcurrency(tenantId: string): void {
        const current = this.tenantConcurrency.get(tenantId) || 0;
        if (current > 0) {
            this.tenantConcurrency.set(tenantId, current - 1);
        }
    }

    public checkRateLimit(tenantId: string, limit?: { windowMs: number; max: number }): boolean {
        if (!limit) return true;

        const now = Date.now();
        const record = this.rateWindowCounters.get(tenantId);

        if (!record || now - record.windowStart > limit.windowMs) {
            // New window
            this.rateWindowCounters.set(tenantId, { count: 1, windowStart: now });
            return true;
        }

        if (record.count >= limit.max) {
            return false;
        }

        record.count += 1;
        this.rateWindowCounters.set(tenantId, record);
        return true;
    }
}
