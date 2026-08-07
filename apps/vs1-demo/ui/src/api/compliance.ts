import { generateCorrelationId } from "@complihub360/types/src/observability";
import type { ComplianceCheckRequest, ComplianceCheckResponse } from "@complihub360/types";
import { getAccessToken } from "../lib/supabase";

export async function runComplianceCheck(req: ComplianceCheckRequest): Promise<ComplianceCheckResponse> {
    const correlationId = generateCorrelationId();
    const baseUrl = import.meta.env.VITE_API_URL || '';

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-correlation-id": correlationId
    };

    // Authenticate the request with the logged-in user's Supabase access token.
    // The backend binds the tenant to this verified identity (no client-supplied
    // tenant is trusted), so a user can only ever run checks for their own org.
    const token = await getAccessToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    // Dev-only escape hatch for running the API without real auth configured.
    const devKey = import.meta.env.VITE_DEV_API_KEY as string | undefined;
    if (devKey) {
        headers["x-api-key"] = devKey;
    }

    const res = await fetch(`${baseUrl}/api/compliance/check`, {
        method: "POST",
        headers,
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
