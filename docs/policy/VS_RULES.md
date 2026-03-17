# Vertical Slice (VS) Workflow Rules

**Enforced By**: Task-Orchestrator

CompliHub360 is built incrementally via "Vertical Slices" (VS). A vertical slice represents a complete, end-to-end functional path from UI to Backend to Core Logic, avoiding "horizontal" disconnected silos.

## 1. The Slice Scope

- **MUST** deliver a verifiable user-facing feature or a complete API workflow.
- **MUST NOT** build "dead code" horizontal layers (e.g., building 10 database models when the UI only needs 1).

## 2. Implementation Order (Recommended)

1. **Contracts (`packages/types`)**: Define the Request/Response interfaces first.
2. **Core/Agent (`packages/*`)**: Implement the pure logic or Agent capabilities.
3. **Service (`services/*`)**: Expose the Core Logic via an API Endpoint (`POST /api/feature`).
4. **UI Client (`ui/design-system/src/api/*`)**: Write the typed client fetcher.
5. **UI Component (`ui/design-system/src/components/*`)**: Build the view using the Neutral UI primitives.
6. **Integration**: Wire the UI component to the client fetcher and display the result.

## 3. Slice Acceptance

- A Vertical Slice is considered "Done" only when the full flow (UI -> API -> Core -> Policy/Database -> UI) is functioning and tested.
- **MUST** be tracked in `docs/STATUS_VS_{number}.md` to document architectural decisions made during the slice.
