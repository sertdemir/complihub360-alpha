import { AnalyticsEvent, AlertRecord } from "@complihub360/types";
import { structuredLog, generateCorrelationId } from "@complihub360/types";

// How long (in ms) to wait before alerting that a submitted request hasn't been confirmed.
// Configuring extremely low (e.g., 60s) for dev simulation, realistically (24h) in prod.
const TIMEOUT_MS = process.env.NODE_ENV === "production" ? 24 * 60 * 60 * 1000 : 30 * 1000;

/**
 * Critical Flow Monitor (MVP)
 * Detects if a `primary_request_submitted` event occurs but lacks a 
 * subsequent `provider_confirmed` event within a given TIME window.
 */
export function startCriticalFlowMonitor(eventStore: AnalyticsEvent[], alertStore: AlertRecord[]): NodeJS.Timeout {
    console.log(`[Monitor] Starting critical flow loop with timeout window of ${TIMEOUT_MS}ms`);

    return setInterval(() => {
        const now = Date.now();

        // Find all submissions
        const submissions = eventStore.filter(e => e.eventName === 'primary_request_submitted');

        submissions.forEach(sub => {
            // Did it time out?
            const subTime = new Date((sub as any).serverTimestamp || sub.timestamp).getTime();
            if (now - subTime > TIMEOUT_MS) {
                // Check if a confirming action happened for the same session
                const hasConfirmation = eventStore.some(
                    e => e.eventName === 'provider_confirmed' && e.sessionId === sub.sessionId
                );

                if (!hasConfirmation) {
                    // Check if we already alerted this specific session/event
                    const alreadyAlerted = alertStore.some(
                        a => a.details.originEventId === sub.eventId
                    );

                    if (!alreadyAlerted) {
                        const alertId = generateCorrelationId();
                        const alert: AlertRecord = {
                            id: alertId,
                            timestamp: new Date().toISOString(),
                            severity: 'high',
                            message: 'ALERT: Critical Flow Stuck',
                            details: {
                                originEventId: sub.eventId,
                                sessionId: sub.sessionId,
                                timeoutMs: TIMEOUT_MS
                            }
                        };

                        alertStore.push(alert);

                        structuredLog('error', alert.message, {
                            correlationId: alertId,
                            severity: alert.severity,
                            errorCode: 'ERR_FLOW_TIMEOUT',
                            ...alert.details
                        });
                    }
                }
            }
        });
    }, Math.max(TIMEOUT_MS / 2, 5000)); // Tick at least every 5s, or half the timeout limit
}
