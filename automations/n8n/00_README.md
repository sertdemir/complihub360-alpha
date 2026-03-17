# n8n Automation Blueprints

These files represent standard n8n workflows for managing CompliHub360's Privacy-by-Design pipeline.

## Core Principles

- **Idempotency**: All executions rely on a composite key (`document_id` + `engagement_id`).
- **No PII in Alerts**: Error notifications pass minimal metadata (no raw text, no names).
- **Hard Gate on AI**: AI processing workflows verify the existence of `sanitized_storage_ref` and reject raw references.
- **Audit Logging**: Every major boundary transition calls the Audit Service API before proceeding.

## Retry Strategies

- HTTP Request nodes use standard exponentially backed-off retries (`maxTries`: 3).
- Failure paths emit metric alerts rather than looping indefinitely.
