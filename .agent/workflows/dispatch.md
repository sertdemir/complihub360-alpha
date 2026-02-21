---
description: Routes a user request through the full multi-agent execution pipeline.
---

# dispatch

1. Activate task-orchestrator skill.
2. Classify request.
3. Delegate implementation to repo-engineer if required.
4. Call qa-sentinel for verification.
5. Call policy-guard if governance impacted.
6. Call architecture-guardian for structure validation.
7. If any gate fails → call /fix-loop.
8. Produce final READY / NOT READY report.
