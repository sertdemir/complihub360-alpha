---
description: Automatically resolves failures from QA or Policy.
---

# fix-loop

1. Identify failure source and include a root cause summary.
2. Delegate fix to repo-engineer.
3. Re-run qa-sentinel.
4. Re-run policy-guard if needed.
5. Auto-run up to 2 retries if the fix fails to pass the gates.
6. Return to parent workflow with the root cause summary and resolution status.
