export interface AuditEvent {
    eventId: string;
    timestamp: string;
    action: 'STORE_RAW' | 'STORE_SANITIZED' | 'AI_PROCESSING_REQUEST' | 'RETENTION_DELETION' | 'REDACT_EXECUTE';
    documentId: string;
    actor: string;
    details: any;
}

/**
 * Interface for Immutable Audit Log
 */
export interface IAuditLog {
    logEvent(event: AuditEvent): Promise<void>;
    queryEvents(documentId: string): Promise<AuditEvent[]>;
}

export class AuditLog implements IAuditLog {
    async logEvent(event: AuditEvent): Promise<void> {
        console.log(`[AUDIT] ${event.action} on ${event.documentId}`);
    }
    async queryEvents(documentId: string): Promise<AuditEvent[]> {
        return [];
    }
}
