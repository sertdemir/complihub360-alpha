---
description: Scaffolds the core Selection Generator.
---

# Engine 04: Generator

This workflow builds the engine's primary execution algorithm for selecting relevant subdomains.

## Requirements

**File to create:** `packages/compliance-engine/generator.ts`

**Implementation:**
Create `generateRelevantSubdomains({ countries, industry, businessModel })` using the following deterministic algorithm:

1. Load/aggregate country profiles (use a stub aggregation that defaults to the first country for now).
2. Calculate weighted domain scores based on the country profile.
3. Apply business modifier deltas from `calculateBusinessModifier`.
4. Sort domains by score (descending).
5. Take top 4–5 domains.
6. Select subdomains from `DomainTemplateLibrary` based on the selected domains + riskWeight thresholds + triggerTags.

**Return Type:**
Array of subdomain objects ready for UI consumption (`id`, `label`, `description`).

## QA Gate

- Run `npm run typecheck`.
