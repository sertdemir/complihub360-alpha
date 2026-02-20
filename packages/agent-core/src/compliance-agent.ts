import type { Agent, TaskInput, AgentContext, TaskResult } from "./types";
import type { ComplianceCheckRequest, ComplianceCheckFinding } from "@complihub360/types";

export const complianceCheckAgent: Agent = {
    id: "compliance-check-agent",
    displayName: "Compliance Check Agent",
    capabilities: [
        {
            name: "compliance_check",
            description: "Analyzes text for basic compliance rules (length, secrets, public context)."
        }
    ],
    run: async (input: TaskInput, ctx: AgentContext): Promise<TaskResult<{ findings: ComplianceCheckFinding[] }>> => {
        const req = input.payload as unknown as ComplianceCheckRequest;
        const findings: ComplianceCheckFinding[] = [];

        if (!req || !req.text) {
            return {
                status: "failed",
                error: { message: "Missing payload with 'text' field" }
            };
        }

        const text = req.text.toLowerCase();

        // Rule 1: Text length
        if (text.length < 20) {
            findings.push({
                id: `finding-len-${Date.now()}`,
                severity: "medium",
                title: "Input too short",
                description: "The provided text is very short and might lack necessary context.",
                suggestion: "Please provide more details."
            });
        }

        // Rule 2: Secrets
        if (text.includes("password") || text.includes("api key")) {
            findings.push({
                id: `finding-sec-${Date.now()}`,
                severity: "high",
                title: "Potential secret",
                description: "The text contains keywords that indicate sensitive information like passwords or API keys.",
                suggestion: "Remove secrets before conducting the check."
            });
        }

        // Rule 3: Public tag
        if (req.tags && req.tags.includes("public")) {
            findings.push({
                id: `finding-pub-${Date.now()}`,
                severity: "low",
                title: "Public context",
                description: "The tags indicate this is a public context. Standard rules apply.",
                suggestion: "Ensure no PII is included."
            });
        }

        return {
            status: "succeeded",
            data: { findings }
        };
    }
};
