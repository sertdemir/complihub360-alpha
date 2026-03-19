---
description: Scaffolds Multi-Country aggregation logic.
---

# Engine 05: Multi-Country Aggregation

This workflow adds helper functions to aggregate risk profiles when multiple countries are selected.

## Requirements

**File to update:** `packages/compliance-engine/generator.ts` (or add a helper in the same file/module).

**Implementation:**
Add `aggregateCountryRiskProfiles(countries: CountryCode[])` function.

**Rules for Aggregation:**

- **Domain weights:** Calculate the `SUM` across all selected countries.
- **StrictnessScore:** Take the `MAX` strictness score across selected countries.
- **EnforcementIntensity:** Take the `MAX` enforcement intensity.
- Ensure the resulting domain weights are sorted in a strictly deterministic order.

## QA Gate

- Run `npm run typecheck`.
