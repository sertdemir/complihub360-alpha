export interface ComplianceCheckRequest {
    tenantId: string;
    appId: string;
    text: string;
    tags?: string[];
}

export interface ComplianceCheckFinding {
    id: string; // z.B. UUID
    severity: "low" | "medium" | "high";
    title: string;
    description?: string;
    suggestion?: string;
}

export interface ComplianceCheckResponse {
    requestId: string;
    correlationId: string;
    decision: "allowed" | "denied";
    reason?: string;
    findings: ComplianceCheckFinding[];
    metadata?: Record<string, string>;
}
