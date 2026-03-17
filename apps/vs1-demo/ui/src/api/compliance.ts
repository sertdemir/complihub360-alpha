import { generateCorrelationId } from "@complihub360/types/src/observability";
import type { ComplianceCheckRequest, ComplianceCheckResponse } from "@complihub360/types";

export async function runComplianceCheck(req: ComplianceCheckRequest): Promise<ComplianceCheckResponse> {
    const correlationId = generateCorrelationId();
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${baseUrl}/api/compliance/check`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-correlation-id": correlationId
        },
        body: JSON.stringify(req)
    });

    const returnedCorrelationId = res.headers.get("x-correlation-id") || correlationId;
    console.log(`[API] /compliance/check completed. CorrelationId: ${returnedCorrelationId}`, { status: res.status });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
    }

    return await res.json() as ComplianceCheckResponse;
}
