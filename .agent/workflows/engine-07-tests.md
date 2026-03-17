---
description: Scaffolds deterministic tests for the engine.
---

# Engine 07: Engine Tests

This workflow sets up unit tests that assert the generated subdomains conform to deterministic rules.

## Requirements

**File to create:** `packages/compliance-engine/__tests__/generator.test.ts` (or a similar test file following the project's Vitest conventions).

**Test Scenarios to Implement (must be deterministic):**

1. Test that `DE + GENERIC_ECOMMERCE + MARKETPLACE_SELLER` correctly prioritizes VAT/EPR-like domains.
2. Test that `US + SAAS + SAAS_SUBSCRIPTION` correctly prioritizes DATA and TAX.
3. Test that aggregating `DE + FR` correctly surfaces EU-relevant domains based on sum-aggregation rules.
4. Test that providing a `HEALTH` industry context strictly increases the weighting of `MARKETING`.
5. Test that selecting multiple countries correctly asserts that the engine uses the maximum strictness score among them.

## QA Gate

- Run tests (`npm run test --workspaces --if-present`) to verify cases pass.
