# Engine Safety Policy

**Activation Context:** Always On

**Mission:** Ensure that any agent executing compliance engine workflows strictly adheres to safety boundaries.

## Rules

1. **VS1 No-Touch:** Never edit, modify, or reference code within `apps/vs1-demo`. This is an immutable baseline for the engine task.
2. **No UI Edits:** These workflows represent backend and domain logic (`packages/compliance-engine`). absolutely NO React components, styles, or UI files are to be edited during the execution of these workflows.
3. **No External Dependencies:** No new `npm` packages are allowed. The engine must be pure TypeScript.
4. **Deterministic Engine Outputs:** All engine algorithms (scoring, aggregation, modifiers) must be pure functions that yield deterministic and predictable outputs. Data mutation should be avoided.
5. **Continuous Verification:** After executing significant logic steps, agents must run `npm run typecheck` and `npm run test` (or delegate to QA-Sentinel) to prevent breaking changes.
