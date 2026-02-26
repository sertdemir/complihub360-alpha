---
description: Routes a user request through the full multi-agent execution pipeline.
---

# dispatch

1. System intercepts user prompt and immediately triggers `task-master`.
2. `task-master` announces `[ACTIVE AGENT: Task-Master]` and breaks down the task.
3. `task-master` delegates UI/Design decisions to `ui-master` or `design-policy-master`.
4. `task-master` delegates architectural documentation/validation to `architecture-master`.
5. `task-master` delegates implementation logic to `repo-master`.
6. **VISIBILITY:** Sub-agents must announce `[ACTIVE AGENT: <Agent-Name>]` before beginning their steps.
7. `repo-master` requests `policy-master` review if governance or npm packages are impacted.
8. `repo-master` requests `qa-master` verification once implementation is complete.
9. If any gate fails (QA or Policy) → the system calls `/fix-loop`.
10. Sub-agents produce their wrap-up report and return control to `task-master`.
11. `task-master` produces a final READY / NOT READY report for the user.
