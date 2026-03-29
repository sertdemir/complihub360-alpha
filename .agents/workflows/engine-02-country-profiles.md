---
description: Scaffolds the Country Profiles and Risk Matrices.
---

# Engine 02: Country Profiles

This workflow establishes the risk weights associated with specific countries.

## Requirements

**File to create:** `packages/compliance-engine/country-profile.ts`

**Definitions to implement:**

1. `CountryCode` type (must start with at least: `DE`, `FR`, `US`, `UK`).
2. `CountryRiskProfile` interface with properties: domain weights mapping (1–10), `enforcementIntensity` (number), `strictnessScore` (number).
3. `CountryRiskMatrix` object with initial populated values for `DE`, `FR`, `US`, and `UK`.
4. `getCountryRiskProfile(code: CountryCode)` function that returns the expected risk profile.

## QA Gate

- Run `npm run typecheck` to ensure there are no TypeScript errors.
