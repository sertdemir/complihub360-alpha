# Rule: No Raw Data to AI

## Constraint

Under no circumstances may a raw document reference (`raw://`) or raw string buffer be passed to any AI processing endpoint.

## Enforcement

- Event `ai_processing_requested` MUST only accept `sanitized_storage_ref`.
- Sub-agents must inspect any AI generation feature for strict adherence to `@docs/automation/contracts/events.md`.
- Failure to adhere must trigger Policy-Guard rejection.
