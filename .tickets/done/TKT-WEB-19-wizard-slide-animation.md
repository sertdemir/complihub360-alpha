---
status: done
creator: frontend-specialist
---

# TKT-WEB-19: Wizard Slide Animation & Shell Consolidation

## Problem
Wizard steps loaded as separate full-page routes, causing visible page reloads and layout shifts between steps. No visual continuity.

## Solution
Implemented **Option A — Single-Shell Wizard**: fixed container where header/stepper/footer stay in place, only the content area slides horizontally using `AnimatePresence`.

- **Next** → content slides left out, new content slides in from right
- **Back** → reverse direction
- **Height** → dynamically adapts with smooth transition (no internal scrollbar)

## Files Modified/Created

### Core Shell
- **[MODIFY]** `components/wizard/WizardFlowShell.tsx` — Added `AnimatePresence` slide animation with directional awareness. Covers all 6 category flows (TaxVat, EPR, DataPrivacy, MarketingSeo, Corporate, FullSupport)

### Generic Path Consolidation
- **[NEW]** `pages/wizard/GenericWizardFlow.tsx` — Consolidated 5 separate pages (Context, Markets, Risk, Complexity, Review) into one single-shell component with internal step state and slide animation
- **[MODIFY]** `App.tsx` — Replaced individual step routes with GenericWizardFlow

### Navigation Fix
- **[MODIFY]** `pages/wizard/WizardCategoryStep.tsx` — Routes to category-specific flow (`/wizard/{category}`) instead of generic `/wizard/context`

### UI Cleanup
- **[MODIFY]** `components/ui/OptionCard.tsx` — Removed Radio/Checkbox indicators, replaced with check_circle icon on selection

## Verification
- TypeScript build: ✅ No errors

## Agent Audit Log
- [2026-03-20T01:06:00+01:00] **[frontend-specialist]**: Slide animation + shell consolidation. (Status: done)
