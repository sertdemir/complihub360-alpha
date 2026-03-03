---
description: Test the Privacy AI Gate to ensure no raw data escapes.
---

1. Dispatch an `ai_processing_requested` event.
2. If `sanitized_storage_ref` starts with `raw://`, assert that the request fails immediately.
3. Assert that a critical alert is queued for the Security team.
4. If `sanitized_storage_ref` starts with `sanitized://`, assert that the request proceeds to the AI provider.
