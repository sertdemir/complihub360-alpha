import { generateCorrelationId } from "@complihub360/types/src/observability";
import type { ComplianceCheckRequest, ComplianceCheckResponse } from "@complihub360/types";

export async function runComplianceCheck(req: ComplianceCheckRequest): Promise<ComplianceCheckResponse> {
    const correlationId = generateCorrelationId();
    const res = await fetch("/api/compliance/check", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-correlation-id": correlationId
        },
        body: JSON.stringify(req)
    });

    const returnedCorrelationId = res.headers.get("x-correlation-id") || correlationId;
    const rawText = await res.text();

    console.log(`[API] /compliance/check completed. CorrelationId: ${returnedCorrelationId}`, { status: res.status });

    if (!res.ok) {
        if (res.status === 404) {
            throw new Error("Endpoint not found: /api/compliance/check. Check Vite proxy + compliance-api routes.");
        }

        let errorData: any = {};
        try {
            errorData = JSON.parse(rawText);
        } catch {
            throw new Error(`HTTP error ${res.status}: ${rawText}`);
        }
        throw new Error(errorData.error || `HTTP error ${res.status}`);
    }

    return JSON.parse(rawText) as ComplianceCheckResponse;
}
