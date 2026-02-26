---
description: Automatically resolves failures from QA or Policy.
---

# fix-loop

1. `task-master` announces `[ACTIVE AGENT: Task-Master]` and identifies the failure source with a root cause summary.
2. `task-master` delegates the fix back to `repo-master` (or `ui-master`).
3. The acting sub-agent announces `[ACTIVE AGENT: <Agent-Name>]`, creates an execution step list, and applies the fix.
4. `task-master` re-runs `qa-master` verification.
5. `task-master` re-runs `policy-master` if the fix touched dependencies or architecture.
6. System auto-runs up to 2 retries if the fix continues to fail the gates.
7. Return to parent workflow (e.g., `/dispatch`) with the root cause wrap-up report and final resolution status.
