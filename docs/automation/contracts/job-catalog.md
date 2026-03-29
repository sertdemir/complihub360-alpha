# Job Catalog

Index of recurring jobs and asynchronous workflows within the n8n automation engine.

## 1. Upload Gate (`upload-gate.json`)

- **Trigger**: `document_uploaded`
- **Action**: Validates upload metadata, persists raw file reference, and triggers `document_sanitize_requested` in the queue.
- **SLA**: Immediate
- **Security Check**: Emits audit log for storage entry.

## 5. Redaction Service (`redaction-service.json`)

- **Trigger**: `document_sanitize_requested`
- **Action**: Extracts text from Raw Vault document and calls a self-hosted local LLM (e.g., Ollama) to identify and redact PII via strict structured JSON output. Fires `document_sanitized_ready`.
- **SLA**: Immediate
- **Security Check**: Enforces Zero Data Retention by processing strictly on the local self-hosted instance without external APIs.

## 2. AI Processing Gate (`ai-processing-gate.json`)

- **Trigger**: `ai_processing_requested`
- **Action**: Intercepts requests for AI. Validates that the payload contains a valid `sanitized_storage_ref` instead of raw data. Routes to AI provider.
- **SLA**: High priority
- **Security Check**: Reject if `storage_ref` appears to be from Raw Vault.

## 3. Retention Job (`retention-job.json`)

- **Trigger**: Scheduled Cron (Daily)
- **Action**: Queries Policy Map based on document metadata (country, engagement level) and triggers `deletion_requested` if `retentionDays` has expired.
- **SLA**: Batch process
- **Security Check**: Enforces hard-delete limits.

## 4. Provider SLA Watchdog (`provider-sla-watchdog.json`)

- **Trigger**: Scheduled Cron (Hourly)
- **Action**: Monitors third-party APIs (e.g., AI gateways, text extractors) for uptime and latency. Alerts if SLA violations occur.
- **SLA**: Monitoring only
