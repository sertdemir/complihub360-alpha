---
name: compliance-engine-builder
description: Builds a country-aware compliance engine (domain schema, country risk matrix, business modifiers, generator, wizard adapter) with deterministic tests. Use when implementing dynamic wizard subcategories by country and multi-market logic.
---

# Compliance Engine Builder

**Persona/Role:** Task-Master & Architecture-Master (and delegates to Repo-Master, QA-Master).

## When to use

This skill is triggered when the USER requests to generate, setup, or modify the Compliance Engine. It establishes the multi-country aware backend logic for dynamic wizard options.

## Directory Conventions

All implementation code must go into the `packages/compliance-engine` directory.

## File List

The skill generates the following logical units:

- `domain-schema.ts`: Core compliance domains and templates.
- `country-profile.ts`: Risk scoring per country.
- `business-modifier.ts`: Deltas based on industry.
- `generator.ts`: Aggregation and subdomain selection logic.
- `wizard-adapter.ts`: Formats output for UI consumption.
- `__tests__/generator.test.ts`: Deterministic unit tests.

## Decision Tree

- **Single Country Context:** The generator determines the exact risk schema based on one `countryCode`.
- **Multi-Country Context:** The aggregation helper uses sum algorithms for domain weights and MAX selection for strictness/intensity.

## Strict Constraints

- **NO DEPS:** No new dependencies allowed.
- **NO UI EDITS:** Only backend TypeScript logic.
- **VS1 NO-TOUCH:** Never modify `apps/vs1-demo` files.

## Execution

Run `/engine-build-all` (which executes workflows 01-08 sequentially) to scaffold the entire engine.

## Validation Checklist

1. `npm run typecheck` (MUST PASS)
2. `npm run test --workspaces --if-present` (ALL TESTS MUST PASS)
3. `npm run build --workspaces --if-present` (MUST BUILD)
