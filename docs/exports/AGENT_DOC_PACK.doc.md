# Agent Governance & Documentation Pack

**Date:** 2026-02-19
**Project:** CompliHub360 Alpha

---

## 1. Executive Summary

This document outlines the governance model, agent roster, and operational contracts for the CompliHub360 project. It establishes the "Neutral Mode" policy and the strict Layered Agent Model used to maintain architectural integrity.

---

## 2. Agent Roster

There are 9 active agents in the system:

1. **Task-Orchestrator:** Planning & Delegation (Layer 0).
2. **Policy-Guard:** Rule Enforcement (Layer 1).
3. **Repo-Engineer:** Config & Build (Layer 2).
4. **UI-Builder:** Component Implementation (Layer 2).
5. **QA-Sentinel:** Verification (Layer 3).
6. **Knowledge-Librarian:** Documentation (Layer 4).
7. **Design-Architect:** Design Systems (Layer 4).
8. **Architecture-Auditor:** System Integrity (Layer 1).
9. **System-Initializer:** Bootstrapping (Layer 2).

---

## 3. Operational Layers

The system is organized into 5 operational layers:

* **Layer 0 (Orchestration):** Controls flow and delegates work.
* **Layer 1 (Governance):** Enforces rules (Policy-Guard). *Has veto power.*
* **Layer 2 (Implementation):** doing the work (UI/Repo).
* **Layer 3 (Verification):** Checking the work (QA).
* **Layer 4 (Knowledge):** Recording the work (Docs/Design).

**Key Rule:** Governance (L1) always overrides Implementation (L2).

---

## 4. Key Decisions (ADRs)

**ADR-0001:** Adopted Layer Model + Neutral Mode.

* **Constraint:** No brand colors until Phase 1.
* **Constraint:** No new npm dependencies without approval.

---

## 5. Connectivity & Flows (Textual)

**Standard Production Flow:**
Request -> Orchestrator -> Policy Check (Approve) -> Implementation -> QA Verify -> Done.

**Adversarial Flow (Policy Deny):**
Request (Violation) -> Orchestrator -> Policy Check (DENY) -> Orchestrator (Correction) -> Implementation (Neutral) -> Done.

---

## 6. Current State Snapshot

* **Stack:** React 18, Vite, Tailwind, TypeScript.
* **Status:** Execution Phase. Core UI primitives and Dashboard components implemented in Neutral Mode.
* **Blockers:** Local environment permission issues affecting test runners.
* **Code Quality:** High (Strict TS, Neutral adherence).

---

## Appendix: File Index

(See `docs/status/FILE_INDEX.md` for live links)

* `docs/agents/AGENT_ROSTER.md`
* `ui/design-system/src/components/*`
* `docs/design/NEUTRAL_MODE_POLICY.md`

[End of Report]
