# ADR-0001: Agent Governance & Neutral Mode

**Status:** ACCEPTED
**Date:** 2026-02-19
**Context:**
The CompliHub360 project involves multiple autonomous agents working on a codebase. Without strict governance, there is a risk of role overlap, architectural drift, and scope creep (especially visual). We need a clear structure to manage agent interactions and enforce design constraints during Phase 0.

**Decision:**

1. **Adopt a 5-Layer Agent Model:** Orchestration (L0), Governance (L1), Implementation (L2), Verification (L3), Knowledge (L4).
2. **Enforce STRICT "Neutral Mode":** Until Phase 1, UI must use strictly grayscale/white/opacity tokens. No brand colors. Structure over style.
3. **No New Dependencies:** Explicit blocking of `npm install` without Policy-Guard approval.
4. **Contract-Based Interaction:** Agents have defined inputs/outputs and "Forbidden Actions".

**Consequences:**

* **Positive:** Reduced architectural drift. Clear accountability. Visual consistency during prototyping.
* **Negative:** Slower velocity for "flashy" UI features (intentional). Requires strict discipline from Orchestrator.

**Alternatives Considered:**

* *Free-for-all Agents:* Rejected due to high risk of regressions and inconsistency.
* *Human-only Governance:* Rejected to maximize agent autonomy and speed within bounds.
