---
description: Scaffolds the adapter mapping for the Wizard UI.
---

# Engine 06: Wizard Adapter

This workflow creates the facade layer that the frontend Wizard UI will consume.

## Requirements

**File to create:** `packages/compliance-engine/wizard-adapter.ts`

**Implementation:**
Implement `getWizardSubcategories(context: { countries: CountryCode[]; industry?: IndustryType; businessModel?: BusinessModel })`

**Behavior:**

- Internally calls `generateRelevantSubdomains`.
- Returns a structured array `[{ id, label, description }]` formatted exactly for Wizard UI dropdowns and checkboxes consumption.
- Keep mapping strictly within the backend packages; absolutely NO UI edits are allowed in `ui/` or `apps/` packages.

## QA Gate

- Run `npm run typecheck`.
