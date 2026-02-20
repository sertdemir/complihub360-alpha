import type { ComplianceCheckRequest, ComplianceCheckResponse } from "@complihub360/types";

export async function runComplianceCheck(req: ComplianceCheckRequest): Promise<ComplianceCheckResponse> {
    const res = await fetch("/api/compliance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req)
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
    }

    return await res.json() as ComplianceCheckResponse;
}
