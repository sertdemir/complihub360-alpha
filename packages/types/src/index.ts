export interface UnifiedComplianceNode {
    id: string; // UUIDv4
    parentId?: string;
    type: 'REGULATION' | 'CONTROL' | 'POLICY' | 'EVIDENCE';
    status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
    metadata: Record<string, any>;
    version: number;
    lastUpdated: string; // ISO-8601
}

export interface EventEnvelope<T> {
    eventId: string;
    traceId: string;
    source: string; // Service Name
    timestamp: number; // Unix Epoch
    payload: T;
    securityContext: {
        tenantId: string;
        actorId: string;
        scopes: string[];
    };
}
\nexport * from './app';\nexport * from './context';\nexport * from './test-helpers';\n
