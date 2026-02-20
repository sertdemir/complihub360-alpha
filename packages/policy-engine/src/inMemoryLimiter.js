export class InMemoryLimiter {
    tenantConcurrency = new Map();
    rateWindowCounters = new Map();
    acquireConcurrency(tenantId, limit) {
        if (!limit)
            return true;
        const current = this.tenantConcurrency.get(tenantId) || 0;
        if (current >= limit)
            return false;
        this.tenantConcurrency.set(tenantId, current + 1);
        return true;
    }
    releaseConcurrency(tenantId) {
        const current = this.tenantConcurrency.get(tenantId) || 0;
        if (current > 0) {
            this.tenantConcurrency.set(tenantId, current - 1);
        }
    }
    checkRateLimit(tenantId, limit) {
        if (!limit)
            return true;
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
