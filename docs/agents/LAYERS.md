# Agent Layer Model

**Status:** ACTIVE
**Model Version:** 1.0

## Layer Definitions

| Layer | Name | Primary Agents | Responsibility |
| :--- | :--- | :--- | :--- |
| **L0** | **Orchestration** | `Task-Orchestrator` | Task intake, decomposition, delegation, and flow control. |
| **L1** | **Governance** | `Policy-Guard`, `Architecture-Auditor` | Rule enforcement, structural integrity, and approval gates. |
| **L2** | **Implementation** | `Repo-Engineer`, `UI-Builder`, `System-Initializer` | Code generation, configuration, and build execution. |
| **L3** | **Verification** | `QA-Sentinel` | Testing, validation, and quality auditing. |
| **L4** | **Knowledge** | `Knowledge-Librarian`, `Design-Architect` | Documentation, design definitions, and context preservation. |

## Cross-Layer Rules

1. **Orchestration Command:** L0 may command any agent in L2-L4. L0 *requests* review from L1.
2. **Governance Block:** L1 has absolute veto power over L2 and L0 plans. L1 cannot be bypassed.
3. **Implementation Constraint:** L2 agents typically require L1 approval (implicit or explicit) before merging.
4. **Verification Gate:** L3 validates outputs from L2. L0 checks L3 results before marking tasks complete.
5. **Knowledge Sync:** L4 observes all layers to update documentation. All layers may query L4.

## Layer flow

Request -> **L0** (Plan) -> **L1** (Approve) -> **L2** (Build) -> **L3** (Verify) -> **L0** (Done)
               ^------------------- **L4** (Document) -------------------^
