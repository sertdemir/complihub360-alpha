---
description: Runs the full verification test suite for the privacy gates and redaction rules.
---

// turbo

1. npm run typecheck
// turbo
2. cd services/redaction && npm run test
3. Ensure that the "Raw data sent to AI" logic error properly throws in the gate test.
