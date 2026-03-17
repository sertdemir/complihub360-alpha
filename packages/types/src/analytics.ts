/**
 * Core event names supported by the telemetry system.
 * Designed to track the primary KPIs without collecting PII.
 */
export type AnalyticsEventName =
    | "search_submitted"
    | "results_rendered"
    | "secondary_clicked"
    | "primary_clicked"         // Main KPI
    | "primary_request_submitted"
    | "provider_confirmed";

/**
 * Standard telemetry event envelope.
 * Strictly avoids PII.
 */
export interface AnalyticsEvent {
    eventId: string;           // UUID
    timestamp: string;         // ISO-8601
    serverTimestamp?: string;  // ISO-8601 (Server generated on ingestion)
    sessionId: string;         // UUID (anonymous browser session)
    userId?: string;           // Obfuscated / UUID only
    correlationId: string;     // Observability trace
    tenantId?: string;
    eventName: AnalyticsEventName;
    properties: Record<string, any>;
}

/**
 * Basic Alert schema for MVP monitoring features.
 * Assumes no PII is allowed.
 */
export interface AlertRecord {
    id: string;                // UUID
    timestamp: string;         // ISO-8601
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details: Record<string, any>;
}
