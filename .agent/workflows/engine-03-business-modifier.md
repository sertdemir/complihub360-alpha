---
description: Scaffolds the Business Modifiers calculation.
---

# Engine 03: Business Modifier

This workflow implements modifying factors based on industry type and business model.

## Requirements

**File to create:** `packages/compliance-engine/business-modifier.ts`

**Definitions to implement:**

1. `IndustryType` enum (must include: `GENERIC_ECOMMERCE`, `HEALTH`, `FINANCE`, `SAAS`, `LEGAL`).
2. `BusinessModel` enum (must include: `DTC`, `MARKETPLACE_SELLER`, `SAAS_SUBSCRIPTION`, `AGENCY`).
3. `calculateBusinessModifier(domain, industry, model)` function that returns score deltas per domain.

## QA Gate

- Run `npm run typecheck`.
