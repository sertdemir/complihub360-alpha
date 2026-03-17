# Agent Contracts

**Status:** ACTIVE
**Enforcement:** Policy-Guard

---

## 1. Task-Orchestrator

* **Inputs:** User Prompts, Context.
* **Outputs:** `task.md`, Implementation Plans.
* **Allowed:** Decompose tasks, assign agents, update status.
* **Forbidden:** Write production code directly, bypass Policy-Guard.
* **Approval:** User approval on Plans.
* **DoD:** Plan is actionable and assigned.

## 2. Policy-Guard

* **Inputs:** Proposed Plans, PR Diffs, Policy Docs.
* **Outputs:** Verdict (APPROVE/DENY), Remediation Plan.
* **Allowed:** Block tasks, require changes, cite rules.
* **Forbidden:** Implement features (must delegate to UI-Builder).
* **Approval:** Self-sovereign on Policy.
* **DoD:** Compliance verdict rendered.

## 3. Repo-Engineer

* **Inputs:** Configuration requests, dependency issues.
* **Outputs:** `package.json`, `tsconfig.json`, `vite.config.ts`.
* **Allowed:** Edit config, run builds, manage local tooling.
* **Forbidden:** Add `npm` packages without Policy-Guard approval.
* **Approval:** Policy-Guard for new deps.
* **DoD:** Build passes, config is valid.

## 4. UI-Builder

* **Inputs:** Component specs, Figma/Wireframes.
* **Outputs:** `.tsx` files, CSS modules/Tailwind classes.
* **Allowed:** Create/Modify UI components, atomic designs.
* **Forbidden:** Use Brand Colors (Phase 0), Gradients, "Status" colors (Red/Green). **Structure > Style.**
* **Approval:** QA-Sentinel (tests pass).
* **DoD:** Component renders, tests exist, Neutral Mode compliant.

## 5. QA-Sentinel

* **Inputs:** New code, Test requirements.
* **Outputs:** Test files (`.test.tsx`), Audit Logs, PASS/FAIL status.
* **Allowed:** Write tests, run test runners, flag defects.
* **Forbidden:** Fix product code (must report to Builder).
* **Approval:** N/A (provides data).
* **DoD:** Test coverage targets met, Pass/Fail clear.

## 6. Knowledge-Librarian

* **Inputs:** Conversation context, decisions, architecture changes.
* **Outputs:** `docs/*.md`, `brain/*.md`.
* **Allowed:** Create/Edit documentation, organizing artifacts.
* **Forbidden:** Touch `src/` code.
* **Approval:** L0 check.
* **DoD:** Documentation reflects reality.

## 7. Design-Architect

* **Inputs:** UX Goals, Neutral Policy.
* **Outputs:** `tokens.json`, Design System Diffs.
* **Allowed:** Define tokens, spacing, hierarchy.
* **Forbidden:** Direct component implementation.
* **Approval:** Policy-Guard.
* **DoD:** Tokens are defined and available.

## 8. Architecture-Auditor

* **Inputs:** Entire Codebase.
* **Outputs:** Compliance Reports, Architecture Diagrams.
* **Allowed:** Read-only analysis, report generation.
* **Forbidden:** Mutate code.
* **Approval:** N/A.
* **DoD:** Audit report generated.

## 9. System-Initializer

* **Inputs:** Repository path.
* **Outputs:** Initialized environment.
* **Allowed:** Setup scripts, install (approved) deps.
* **Forbidden:** Feature work.
* **Approval:** Repo-Engineer reviews config.
* **DoD:** `npm start` works.

---

## Global Constraints

1. **No new npm packages** without explicit Policy-Guard approval.
2. **Neutral Mode (Phase 0):** Use `slate-950` / `white` / `white-alpha` only. No colors.
3. **Strict Typing:** No `any`.
4. **Atomic Design:** Components must be reusable.
