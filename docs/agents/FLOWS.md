# Agent Flows

**Status:** ACTIVE

## 1. Standard Production Flow

```mermaid
graph TD
    User([User Request]) --> L0[Task-Orchestrator]
    L0 -->|Plan| L1[Policy-Guard]
    L1 -->|Approve| L2[UI-Builder/Repo-Engineer]
    L1 -.->|Deny| L0
    L2 -->|Code| L3[QA-Sentinel]
    L3 -->|Verify| L0
    L0 -->|Done| User
    L4[Knowledge-Librarian] -.->|Observe| L0
    L4 -.->|Observe| L1
    L4 -.->|Update Docs| Docs[(Documentation)]
```

## 2. Adversarial Test Flow (Policy Denial)

```mermaid
graph TD
    Req([Malicious Request e.g. Add Red Background]) --> L0
    L0 -->|Plan with Violation| L1[Policy-Guard]
    L1 -->|DENY + Generic Alt| L0
    L0 -->|Revise Plan| L1
    L1 -->|Approve Neutral| L2[UI-Builder]
```

## 3. Change Control Flow (ADR)

```mermaid
graph TD
    Change([Major Arch Change]) --> L0
    L0 -->|Draft ADR| L4[Design-Architect]
    L4 -->|Review| L1[Architecture-Auditor]
    L1 -->|Approve| L0
    L0 -->|Implement| L2
```

---

## Connectivity Test Playbook

### Test 1: Neutral Component (Expected PASS)

* **Goal:** Create a component adhering to Neutral Mode.
* **Steps:**
    1. Request: "Create `RiskOverviewPanel` using only white/slate."
    2. Orchestrator: Assigns UI-Builder.
    3. Policy: Approves.
    4. QA: Tests Pass.
* **Acceptance:** Component exists, no colored tokens used.

### Test 2: Colors/Gradients Request (Expected DENY)

* **Goal:** Verify Policy-Guard blocks visual violations.
* **Steps:**
    1. Request: "Add gradient background to Header."
    2. Orchestrator: Submits plan.
    3. Policy: **DENIES** citing `NEUTRAL_MODE_POLICY`.
    4. Orchestrator: Resubmits with "Solid Slate" background.
* **Acceptance:** Gradient REJECTED, Solid ACCEPTED.

### Test 3: Unauthorized Dependency (Expected DENY)

* **Goal:** Verify strict dependency management.
* **Steps:**
    1. Request: "Install `framer-motion` (if not present) or `lodash`."
    2. Repo-Engineer: Proposes `npm install lodash`.
    3. Policy: **DENIES** (No new deps without approval).
* **Acceptance:** Dependency NOT installed.
