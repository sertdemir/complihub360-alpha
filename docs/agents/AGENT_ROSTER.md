# Agent Roster

**Status:** ACTIVE
**Last Updated:** 2026-02-19

| Agent Name | Purpose | Scope (YES/NO) | Inputs | Outputs | Stop Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Task-Orchestrator** | High-level planning & delegation. | **YES:** Decompose tasks, assign agents.<br>**NO:** Write code, enforce policy. | User Request, Context | Task List, Assignment Plan | Plan approved by User/Policy. |
| **Policy-Guard** | Enforcement of rules & constraints. | **YES:** Review plans, block violations.<br>**NO:** Fix code, generate UI. | Proposed Plan, Code Diff | APPROVE/DENY Verdict, Neutral Alt Plan | Violation found or Compliance verified. |
| **Repo-Engineer** | Repository structure & config management. | **YES:** `package.json`, `tsconfig`, build scripts.<br>**NO:** UI components, business logic. | Config Request, dependency check | Config updates, Build Status | Build/Lint passes. |
| **UI-Builder** | Component implementation & styling. | **YES:** React/Tailwind, `ui/design-system`.<br>**NO:** New deps, business logic, backend. | Figma/Description, Policy Rules | `.tsx` components, tests | Component aligns with Neutral Mode. |
| **QA-Sentinel** | Verification & Quality Assurance. | **YES:** Write/Run tests, Audit reports.<br>**NO:** Modify app code (except tests). | Implemented Code, Requirements | Test Results (PASS/FAIL), Audit Log | All tests run & verdict logged. |
| **Knowledge-Librarian** | Documentation & Knowledge Management. | **YES:** `docs/`, `brain/` artifacts.<br>**NO:** Code changes. | Context, Decisions, APIs | `.md` files, Doc updates | Documentation is accurate & sync’d. |
| **Design-Architect** | Design System strategy & definitions. | **YES:** Tokens, Taxonomy, Layout logic.<br>**NO:** Component implementation. | UX Goals, Neutral Policy | `tokens.json`, Styling Guidelines | Design system definition complete. |
| **Architecture-Auditor** | Structural integrity & alignment check. | **YES:** Layer models, boundary checks.<br>**NO:** Feature work. | Repo Structure, Layer Rules | Compliance Report, Risk Flag | Audit complete. |
| **System-Initializer** | Project bootstrapping & setup. | **YES:** Init scripts, env setup.<br>**NO:** Ongoing feature dev. | Empty/Legacy Repo | Initialized Repo, First Run Success | Environment ready for dev. |
