---
description: Routes a user request through the full multi-agent execution pipeline.
---

# dispatch

1. System intercepts user prompt and immediately triggers `task-master`.
2. `task-master` announces `[ACTIVE AGENT: Task-Master]` and breaks down the task.
3. **[MANDATORY – TICKET GATE]** `task-master` MUST create a ticket file in `.tickets/doing/` for EVERY task before any implementation starts. No agent may write code before the ticket exists. Ticket format: see `.tickets/TEMPLATE.md`. Naming: `TKT-<AREA>-<NN>.md` (e.g. `TKT-UI-19.md`).
4. **[DNA-GATE]** Berührt die Aufgabe das Nutzererleben (Copy, Wizard, Risk Map, Ranking/Matching, AI-Verhalten, Monetarisierung, Registrierung/Gating, Provider-Policies), MUSS `task-master` den Wissensknoten `KN-BRAND-001` laden und den Abschnitt `## DNA-Check` im Ticket anlegen, bevor delegiert wird. Auslöserkatalog und Nachweisformat: `.agents/rules/dna-decision-filter.md`. Im Zweifel gilt: prüfen. Ein erkannter DNA-Konflikt stoppt die Arbeit und eskaliert an den Menschen — kein Agent löst ihn selbst auf.
5. `task-master` delegates UI/Design decisions to `ui-master` or `design-policy-master`.
6. `task-master` delegates architectural documentation/validation to `architecture-master`.
7. `task-master` delegates implementation logic to `repo-master`.
8. **VISIBILITY:** Sub-agents must announce `[ACTIVE AGENT: <Agent-Name>]` before beginning their steps.
9. `repo-master` requests `policy-master` review if governance or npm packages are impacted.
10. `repo-master` requests `qa-master` verification once implementation is complete.
11. If the ticket carries a `## DNA-Check`, `design-policy-master` verifies Voice/Experience (§3–§4) and `policy-master` verifies Monetarisierung, Ranking-Fairness und AI-Verhalten (§5–§6). `policy-master` may block.
12. If any gate fails (QA, Policy or DNA) → the system calls `/fix-loop`.
13. Sub-agents produce their wrap-up report and return control to `task-master`.
14. **[MANDATORY – TICKET CLOSE]** `task-master` MUST move the ticket from `.tickets/doing/` → `.tickets/done/`, update `status: done`, and append the `## Agent Audit Log` entry before declaring READY.
15. `task-master` produces a final READY / NOT READY report for the user.
