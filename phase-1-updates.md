# Plan: Phase 1 Updates
**Project Type**: WEB

## Overview
This plan implements Phase 1 updates for the CompliHub360 platform, covering UI enhancements to the Start Page, refactoring Wizard categories/channels to multi-select, context logic for thresholds, and a new Switching Provider flow. 

## Success Criteria
- User vs Partner segmentation is clear above the fold.
- Wizard perfectly supports multiple categories and multiple sales channels.
- Language choice remains persistent across the Wizard.
- UK specific threshold correctly overrides EU OSS threshold for UK sellers.

## Tech Stack
- React / Vite / TypeScript
- Tailwind CSS / Framer Motion
- i18next for Localization

## File Structure (Changes)
- `apps/vs1-demo/ui/src/pages/LandingPage.tsx`
- `apps/vs1-demo/ui/src/pages/wizard/WizardPreGateFlow.tsx`
- `apps/vs1-demo/ui/src/pages/wizard/flows/TaxVatWizard.tsx`
- `apps/vs1-demo/ui/src/components/wizard/WizardContext.tsx`
- `apps/vs1-demo/ui/src/components/wizard/questions/MultiSelectCardGroup.tsx` (New component)

## Task Breakdown

### Task 1: Wizard Context Refactoring
- **Agent**: frontend-specialist
- **Skill**: react-best-practices
- **INPUT**: `WizardContext.tsx`
- **OUTPUT**: `WizardContext` supports `categories: WizardCategory[]` and `existingProvider: boolean`.
- **VERIFY**: TypeScript types compile without errors across the whole app.

### Task 2: Landing Page Enhancements
- **Agent**: frontend-specialist
- **Skill**: frontend-design
- **INPUT**: `LandingPage.tsx`
- **OUTPUT**: Moved Partner section up, added Video Placeholder.
- **VERIFY**: Elements are visible above the fold on Desktop preview.

### Task 3: Wizard Multi-Select (Categories & Sales Channels)
- **Agent**: frontend-specialist
- **Skill**: react-best-practices
- **INPUT**: `WizardPreGateFlow.tsx`, `TaxVatWizard.tsx`
- **OUTPUT**: Both inputs transformed to multi-select with updated continue logic.
- **VERIFY**: User can select Tax + EPR simultaneously and proceed.

### Task 4: Advanced Wizard Logic (Thresholds & Switching Path)
- **Agent**: frontend-specialist
- **Skill**: react-best-practices
- **INPUT**: `TaxVatWizard.tsx`, `WizardRiskStep.tsx`
- **OUTPUT**: UK specific logic replaces EU OSS warning. "Existing Provider" path integrated.
- **VERIFY**: UK choice triggers £90k warning instead of €10k warning.

### Task 5: Localization Persistence
- **Agent**: frontend-specialist
- **Skill**: react-best-practices
- **INPUT**: `i18n.ts` or Layout file
- **OUTPUT**: Consistent language state across route changes.
- **VERIFY**: Change to German, refresh page, stays German.

## ✅ PHASE X Verification (Pending)
- [ ] Code Lint
- [ ] App Builds
- [ ] UX Audit
- [ ] Language stays persistent
