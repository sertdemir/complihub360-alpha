---
status: done
creator: frontend-specialist
---

# TKT-WEB-18: Wizard Pre-Gate & Step Counter Fix

## Problem
Country gate showed "Step 1 of 6", then wizard flows showed "Step 1 of 5". Counter reset and total changed mid-flow.

## Solution
Converted country gate + category picker to an **unnumbered pre-gate** with a context banner (`WizardPreGate.tsx`). Generic wizard steps renumbered to Steps 1–5 of 5.

## Files Modified
- **[NEW]** `components/wizard/WizardPreGate.tsx` — Pre-gate context bar with two-dot indicator
- `pages/WizardStep1.tsx` — Uses pre-gate instead of stepper
- `pages/wizard/WizardCategoryStep.tsx` — Uses pre-gate, shows country badge
- `pages/wizard/WizardContextStep.tsx` — Step 1/5 (was 3/6)
- `pages/wizard/WizardMarketsStep.tsx` — Step 2/5 (was 4/6)
- `pages/wizard/WizardRiskStep.tsx` — Step 3/5 (was 5/6)
- `pages/wizard/WizardComplexityStep.tsx` — Step 4/5 (was 6/6)
- `pages/wizard/WizardReviewStep.tsx` — Step 5/5 (was 6/6)

## Verification
- TypeScript build: ✅ No errors

## Agent Audit Log
- [2026-03-20T00:48:00+01:00] **[frontend-specialist]**: Created pre-gate, fixed step counters. (Status: done)
