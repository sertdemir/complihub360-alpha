---
status: todo
assignee: Policy-Master
dependencies: []
---

# TKT-SEC-01: Enforce Deterministic Privacy Architecture & AI Gate

## Description

The "Security & Privacy Architecture" requires strict deterministic data classification and AI gating across the whole system. The current implementation in `policy-engine` or `redaction` needs to be fully aligned.

## Requirements

1. **Redaction Pipeline Updates**:
   - Detect document types, indentify PII, apply masking and store a sanitized copy.
   - Must mark `sanitized_ready = true`. If redaction fails, block AI processing.
2. **AI Gate Enforcement**:
   - AI processing is only allowed when `sanitized_ready = true` AND `consent_flags.allowAI = true` AND `classification != restricted`.
3. **Country Policy Matrix**: Implement the matrix for `DE`, `EU`, `UK`, `US`, `CA`, `AU`, `ROW`.
   - Each policy defines retention period, AI eligibility, consent requirements, data residency requirement. (Default = conservative).

## Expected Outcome

The `policy-engine` fully enforces the matrix and AI Gating. Tests must deterministically prove that restricted documents or un-sanitized docs cannot reach the AI boundary.

## Agent Audit Log
