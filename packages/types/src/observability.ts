/**
 * Generates a unique correlation ID for tracking requests across boundaries.
 */
export function generateCorrelationId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `corr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Was als Referenz-ID von aussen uebernommen wird: 8 bis 64 Zeichen aus
 * Buchstaben, Ziffern und Bindestrich. Eine UUID passt, ebenso das
 * `corr-…`-Format oben.
 *
 * Die ID steht im Log, in der Antwort und — als "Technical details" — vor dem
 * Nutzer, der sie dem Support nennt. Bis 2026-09-22 wurde jeder Header-Wert
 * ungeprueft uebernommen: beliebig lang, beliebiger Text, von jedem Aufrufer.
 */
const ACCEPTED_CORRELATION_ID = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Normalizes an incoming correlation ID from a request header, or generates a new one.
 * A value that does not look like an ID is replaced, not trusted.
 */
export function normalizeCorrelationId(headerValue: string | string[] | undefined | null): string {
    const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    return value && ACCEPTED_CORRELATION_ID.test(value) ? value : generateCorrelationId();
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
 * Extended metadata context specifically for formatting robust Error logs.
 */
export interface ErrorContext extends Record<string, any> {
    correlationId: string;
    route?: string;
    errorCode?: string;
    stack?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Recursively redacts PII from logging metadata.
 */
export function redactPII(obj: any, seen = new WeakSet()): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (seen.has(obj)) {
        return '[Circular]';
    }
    seen.add(obj);

    if (Array.isArray(obj)) {
        return obj.map(item => redactPII(item, seen));
    }

    const redactedContext: Record<string, any> = {};
    const sensitiveKeys = ['password', 'email', 'secret', 'token', 'authorization', 'api_key', 'apikey'];

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
                redactedContext[key] = '[REDACTED]';
            } else {
                redactedContext[key] = redactPII(obj[key], seen);
            }
        }
    }
    return redactedContext;
}

/**
 * Outputs a machine-readable, structured JSON log line.
 */
export function structuredLog(level: 'info' | 'warn' | 'error', message: string, meta: Record<string, any> | ErrorContext = {}): void {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...redactPII(meta)
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
