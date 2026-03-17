import type { ExecutionObserver } from "./types.js";
import type { ExecutionEvent } from "@complihub/agent-core";

export class DefaultObserver implements ExecutionObserver {
    public onExecution(event: ExecutionEvent): void {
        const timestamp = new Date(event.finishedAt).toISOString();
        const status = event.success ? "SUCCESS" : "FAILURE";

        let metaString = "";
        if (event.tenantId) metaString += ` [Tenant: ${event.tenantId}]`;
        if (event.intent) metaString += ` [Intent: ${event.intent}]`;
        if (event.capability) metaString += ` [Capability: ${event.capability}]`;

        console.log(`[${timestamp}] [Orchestrator] Agent ${event.agentId} completed execution with status: ${status}${metaString} in ${event.durationMs}ms`);

        if (!event.success && event.error) {
            console.error(`  > Error: [${event.error.name}] ${event.error.message}`);
        }

        // Structured JSON output for downstream log aggregators
        console.log(JSON.stringify({ type: "AuditLog", ...event }));
    }
}
