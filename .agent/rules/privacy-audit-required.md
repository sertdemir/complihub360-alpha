# Rule: Audit Trail Required for Boundary Crossing

## Constraint

Any action that crosses a boundary in the privacy policy model MUST be recorded in the immutable audit log.

## Enforcement

- The following actions require audit events (`@docs/automation/contracts/events.md`):
  - Storing a Raw Document
  - Storing a Sanitized Document
  - Passing Sanitized data to AI
  - Executing Retention deletions
- QA-Sentinel tests MUST verify the `IAuditLog.logEvent` method is called.
