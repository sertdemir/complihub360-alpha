# Automation Events Catalog

This document defines the core domain events used by the CompliHub360 Automation Engine. These events trigger state transitions across the platform. All events must adhere to the Payload Schemas.

## Core Events

- `document_uploaded`: Emitted when a document is uploaded. Raw file is stored in Raw Vault.
- `document_sanitize_requested`: Instructs the Redaction Service to process the raw document securely via local LLM masking.
- `document_sanitized_ready`: Emitted by Redaction Service when a sanitized document (PII redacted via AI) is available in the Sanitized Vault.
- `ai_processing_requested`: Indicates an AI task is initiated. MUST ONLY run after `document_sanitized_ready` and MUST ONLY consume sanitized artifacts.
- `ai_artifact_created`: Emitted when AI processing completes and a new artifact (e.g., summary, extraction) is generated.
- `retention_job_ran`: Periodic event indicating a retention sweep execution.
- `deletion_requested`: Emitted when a document or artifact is slated for deletion due to retention policy or user request.
- `deletion_completed`: Acknowledges successful removal of data from all storage locations.

## Idempotency

All workflows consuming these events MUST be idempotent, relying on unique combinations of `document_hash` and `engagement_id`.
