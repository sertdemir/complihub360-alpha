---
description: Test the document retention pipeline.
---

1. Call the retention query on the policy map for standard criteria.
2. Ensure that documents older than the `retentionDays` are flagged.
3. Emit `deletion_requested` events for flagged documents.
4. Verify that the system logs `RETENTION_DELETION` in the audit log.
