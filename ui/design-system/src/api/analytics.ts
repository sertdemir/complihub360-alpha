import { generateCorrelationId } from "@complihub360/types/src/observability";
import type { AnalyticsEvent, AnalyticsEventName } from "@complihub360/types/src/analytics";

/**
 * Ensures a consistent session ID exists for the current browser session.
 * Does not persist across clearings to respect privacy.
 */
function getOrCreateSessionId(): string {
    const key = "ch360_session_id";
    let sid = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
    if (!sid) {
        sid = generateCorrelationId();
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(key, sid);
        }
    }
    return sid;
}

/**
 * Emits an analytics event to the central ingestion API.
 */
export async function trackEvent(
    eventName: AnalyticsEventName,
    properties: Record<string, any> = {},
    tenantId?: string
): Promise<void> {
    const correlationId = generateCorrelationId();

    const event: AnalyticsEvent = {
        eventId: generateCorrelationId(), // Reuse UUID generator
        timestamp: new Date().toISOString(),
        sessionId: getOrCreateSessionId(),
        correlationId,
        tenantId,
        eventName,
        properties
    };

    try {
        const res = await fetch("/api/events", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-correlation-id": correlationId
            },
            body: JSON.stringify(event)
        });

        if (!res.ok) {
            console.warn(`[Analytics] Failed to emit event ${eventName}: HTTP ${res.status}`);
        } else {
            console.debug(`[Analytics] Emitted ${eventName}`, event);
        }
    } catch (e) {
        // Failing to track must never break the UI
        console.warn(`[Analytics] Network error emitting event ${eventName}`);
    }
}
