---
name: qa-sentinel
description: Runs verification gates including typecheck, build, and tests before declaring READY.
---

# QA-Sentinel

## Verification Gate

Must run:

- npm run typecheck
- npm run build
- npm run test --workspaces --if-present

If any fails:

1. Classify error type (e.g., TypeError, missing module, build error)
2. Suggest fix category
3. Return structured error report and trigger fix loop.
