# Architecture Guardrails

**Enforced By**: Repo-Engineer / Policy-Guard

This document defines the structural boundaries and modular rules of the CompliHub360 monorepo.

## 1. Domain Borders & Package Dependencies

- **MUST NOT** introduce circular dependencies between workspace packages.
- **MUST** treat `packages/types` as the universal primitive layer. No package should redefine types that belong in the core taxonomy.
- **MUST** ensure `policy-engine` remains a "pure" module (functional, synchronous logic without side-effects like db queries).
- **MUST** ensure `task-orchestrator` handles all lifecycle routing. Agents do not orchestrate other agents directly.

## 2. UI <-> Service Contracts

- **MUST** handle all UI-to-Backend communication via dedicated API Client Layers (e.g., `src/api/*`).
- **MUST NOT** use direct inline `fetch()` calls inside React Components.
- **MUST** securely type API responses using shared contracts from `@complihub360/types`.

*Anti-Pattern*:

```tsx
const data = await fetch('/api/check').then(res => res.json()); // No type safety, inline fetch
```

*Pattern*:

```tsx
import { runComplianceCheck } from '@/api/compliance';
const response: ComplianceCheckResponse = await runComplianceCheck(requestPayload);
```

## 3. The `Agent` Specification

- **MUST** register via the `@complihub/agent-registry`.
- **MUST** expose strictly typed inputs and outputs.
- **MUST NOT** maintain hidden internal state between executions (Stateless Execution preferred).

## 4. Workspaces & Reproducibility

- **MUST** define clear `build`, `typecheck`, `test`, and `lint` scripts in every workspace package.
- **MUST** ensure root `package.json` can topographically execute scripts across all workspaces using `--workspaces --if-present`.
