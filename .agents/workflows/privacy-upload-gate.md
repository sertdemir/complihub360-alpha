---
description: Test and verify the Privacy Upload Gate pipeline.
---

1. Verify that `document_uploaded` triggers the redaction service.
2. Confirm that the Raw Vault interface `saveRawDocument` is called.
3. Check the audit log to ensure `STORE_RAW` action was recorded.
4. Pass if the process completes and `document_sanitize_requested` is queued.
5. Verify that `redaction-service.json` activates, invokes local Ollama API, and returns `[REDACTED_...]` tags correctly.
6. Verify payload format strictly adheres to `llm-structured-output` requirements.
7. Confirm that the `document_sanitized_ready` event is emitted back to the queue.
