---
description: Orchestrates the creation of the complete Compliance Engine
---

# Engine Build All

This master workflow executes the individual sub-workflows to scaffold the complete Compliance Engine deterministically.

## Steps

// turbo-all

1. Execute `/engine-01-domain-schema` to create the domain baseline.
2. Execute `/engine-02-country-profiles` to create risk profiles.
3. Execute `/engine-03-business-modifier` to define industry weighting.
4. Execute `/engine-04-generator` to scaffold core selection logic.
5. Execute `/engine-05-multicountry-aggregation` to add multi-market capabilities.
6. Execute `/engine-06-wizard-adapter` to map data for the UI layer.
7. Execute `/engine-07-tests` to set up deterministic unit tests.
8. Execute `/engine-08-ci-verify` to run full QA gates.
