---
description: Executes full CI verification pass for the Engine.
---

# Engine 08: CI Verification

This operational workflow executes a complete quality assurance gate over the Compliance Engine.

## Requirements

Execute the following verification commands from the project root:

1. `npm run typecheck`
2. `npm run test --workspaces --if-present`
3. `npm run build --workspaces --if-present`

## Reporting

- Stop the process if any gate fails and list exactly which commands failed.
- Report a final `PASS` or `FAIL` status reflecting the overall build pipeline health.
