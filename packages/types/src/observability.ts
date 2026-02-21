/**
 * Generates a unique correlation ID for tracking requests across boundaries.
 */
export function generateCorrelationId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `corr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Normalizes an incoming correlation ID from a request header, or generates a new one.
 */
export function normalizeCorrelationId(headerValue: string | string[] | undefined | null): string {
    if (!headerValue) return generateCorrelationId();
    return Array.isArray(headerValue) ? headerValue[0] : headerValue;
}

/**
 * Attaches a correlation ID to a set of Headers or a plain object.
 */
export function attachCorrelationId(headers: Headers | Record<string, string>, correlationId: string): void {
    if (headers instanceof Headers) {
        headers.set('x-correlation-id', correlationId);
    } else {
        (headers as Record<string, string>)['x-correlation-id'] = correlationId;
    }
}

/**
 * Outputs a machine-readable, structured JSON log line.
 */
export function structuredLog(level: 'info' | 'warn' | 'error', message: string, meta: Record<string, any> = {}): void {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta
    };

    const logString = JSON.stringify(logEntry);

    if (level === 'error') {
        console.error(logString);
    } else if (level === 'warn') {
        console.warn(logString);
    } else {
        console.log(logString);
    }
}
