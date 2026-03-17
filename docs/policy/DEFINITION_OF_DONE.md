# Definition of Done (DoD)

**Enforced By**: Task-Orchestrator / Product-Owner

Before any Vertical Slice (VS) or core feature is considered "Done", it must satisfy these baseline requirements.

## 1. Functional Demo

- **MUST** be verifiable via the UI or a specific API request.
- **MUST** perform the end-to-end "Happy Path" successfully.

## 2. Testing Constraints

- **MUST** include accompanying unit tests for any new business logic inside `packages/*`.
- **MUST** pass all CI/CD Quality Gates (`typecheck`, `build`, `lint`, `test`) without bypasses.

## 3. Architecture Alignment

- **MUST** utilize established contracts from `packages/types` rather than local redundant types.
- **MUST** respect the Neutral UI Design Policy (no ad-hoc styling overrides).

## 4. Documentation

- **SHOULD** update the `docs/STATUS_VSX.md` file corresponding to the working Vertical Slice.
- **MUST** update `README.md` if the setup, execution, or environment variables of the project have changed.
