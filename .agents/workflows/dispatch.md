---
description: Routes a user request through the full multi-agent execution pipeline.
---

# dispatch

1. System intercepts user prompt and immediately triggers `task-master`.
2. `task-master` announces `[ACTIVE AGENT: Task-Master]` and breaks down the task.
3. **[MANDATORY – TICKET GATE]** `task-master` MUST create a ticket file in `.tickets/doing/` for EVERY task before any implementation starts. No agent may write code before the ticket exists. Ticket format: see `.tickets/TEMPLATE.md`. Naming: `TKT-<AREA>-<NN>.md` (e.g. `TKT-UI-19.md`).
4. `task-master` delegates UI/Design decisions to `ui-master` or `design-policy-master`.
5. `task-master` delegates architectural documentation/validation to `architecture-master`.
6. `task-master` delegates implementation logic to `repo-master`.
7. **VISIBILITY:** Sub-agents must announce `[ACTIVE AGENT: <Agent-Name>]` before beginning their steps.
8. `repo-master` requests `policy-master` review if governance or npm packages are impacted.
9. `repo-master` requests `qa-master` verification once implementation is complete.
10. If any gate fails (QA or Policy) → the system calls `/fix-loop`.
11. Sub-agents produce their wrap-up report and return control to `task-master`.
12. **[MANDATORY – TICKET CLOSE]** `task-master` MUST move the ticket from `.tickets/doing/` → `.tickets/done/`, update `status: done`, and append the `## Agent Audit Log` entry before declaring READY.
13. `task-master` produces a final READY / NOT READY report for the user.
