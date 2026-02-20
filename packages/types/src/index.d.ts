export interface UnifiedComplianceNode {
    id: string;
    parentId?: string;
    type: 'REGULATION' | 'CONTROL' | 'POLICY' | 'EVIDENCE';
    status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
    metadata: Record<string, any>;
    version: number;
    lastUpdated: string;
}
export interface EventEnvelope<T> {
    eventId: string;
    traceId: string;
    source: string;
    timestamp: number;
    payload: T;
    securityContext: {
        tenantId: string;
        actorId: string;
        scopes: string[];
    };
}
//# sourceMappingURL=index.d.ts.map