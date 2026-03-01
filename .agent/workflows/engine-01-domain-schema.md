---
description: Scaffolds the core Domain Schema.
---

# Engine 01: Domain Schema

This workflow creates the baseline data structures for the compliance engine.

## Requirements

**File to create:** `packages/compliance-engine/domain-schema.ts`

**Definitions to implement:**

1. `ComplianceDomain` enum with values: `TAX`, `PRODUCT`, `MARKETING`, `DATA`, `CORPORATE`, `ONGOING_MONITORING`.
2. `ComplianceSubdomainTemplate` interface with properties: `id` (string), `label` (string), `description` (string), `triggerTags` (string[]), `applicableBusinessModels` (string[]), `riskWeight` (number).
3. `DomainTemplateLibrary` object containing initial subdomain templates (ensure they are country-agnostic).

## QA Gate

- Run `npm run typecheck` to ensure the new definitions are strictly typed and error-free.
