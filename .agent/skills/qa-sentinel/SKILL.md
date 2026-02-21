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
Return error and trigger fix loop.
