# PLAN: Landing Page

## Overview
Rebuilding the CompliHub360 Landing Page to act as the global "Compliance Orchestration" entry point. The page is designed for high conversion, utilizing storytelling, urgency (Risk Snapshot), and a precise, structured visual language.

## Project Type
**WEB** (Primary Agent: `frontend-specialist`)

## Success Criteria
- [ ] The `ui/design-system` specs are updated from Neutral Foundation (Phase 0) to the new Brand Color Scheme (Forest Green, Pastel Green, Gold).
- [ ] The Hero section features a sticky right-hand conversion widget and a left-hand automatic text slider demonstrating 3 global compliance scenarios.
- [ ] The "UK Compliance Risk Snapshot" (or a global equivalent) is teased high up on the page to build urgency and curiosity.
- [ ] The "Raw context to structured dossier" section features a clean, guided stepper animation.
- [ ] The page adheres strictly to the "Operating System for Compliance" aesthetic.

## Tech Stack
- Frontend: Next.js / React (per existing UI)
- Styling: Tailwind CSS (with updated `tokens.json` for new brand colors)
- Animation: Framer Motion / CSS Transitions (for text slider and stepper)
- Agents: `frontend-specialist` (Implementation), `Design-Policy-Master` (Tokens), `Task-Master` / `Repo-Master` (Coordination).

## File Structure
Changes will touch:
- `ui/design-system/README.md` and `tokens.json` (Specs update)
- `app/page.tsx` (or equivalent Next.js routing entry)
- `components/layout/HeroSection.tsx`
- `components/feedback/RiskSnapshotTeaser.tsx`
- `components/feedback/ComplianceStepper.tsx`

## Task Breakdown

### 1. TKT-WEB-01: Update Design System Specs & Tokens
- **Agent**: `Design-Policy-Master` / `UI-Builder`
- **Skills**: `frontend-design`, `tailwind-patterns`
- **Priority**: P0 (Blocker)
- **INPUT**: Current `ui/design-system/README.md` (Neutral Mode) and provided visual draft.
- **OUTPUT**: Updated `README.md` and `tokens.json` to include Forest Green, Pastel Green, and Gold as primary semantic tokens, officially replacing Phase 0.
- **VERIFY**: `tokens.json` successfully exports new colors; no neutral constraint remains in `README.md`.

### 2. TKT-WEB-02: Implement Global Hero Section
- **Agent**: `frontend-specialist`
- **Skills**: `nextjs-react-expert`, `tailwind-patterns`
- **Priority**: P1
- **Dependencies**: TKT-WEB-01
- **INPUT**: New design tokens, requirement for left text-slider (3 global cases) and right sticky widget.
- **OUTPUT**: Responsive `HeroSection.tsx` component.
- **VERIFY**: Text slides automatically every X seconds. Right widget remains sticky on desktop scroll.

### 3. TKT-WEB-03: Implement Risk Snapshot Teaser
- **Agent**: `frontend-specialist`
- **Skills**: `nextjs-react-expert`, `tailwind-patterns`
- **Priority**: P1
- **Dependencies**: TKT-WEB-01
- **INPUT**: Concept of the deep-green Risk Snapshot footer widget.
- **OUTPUT**: `RiskSnapshotTeaser.tsx` placed high on the page (below Hero) with interactive elements to build urgency.
- **VERIFY**: Renders correctly with new dark green token. Hover states reveal risk data.

### 4. TKT-WEB-04: Implement Stepper Animation
- **Agent**: `frontend-specialist`
- **Skills**: `nextjs-react-expert`, `frontend-design`
- **Priority**: P2
- **Dependencies**: TKT-WEB-01
- **INPUT**: "From raw context to structured dossier" section requirements.
- **OUTPUT**: `ComplianceStepper.tsx` with staggered fade-in and connecting line animation natively triggering on scroll.
- **VERIFY**: Scroll triggers step 1, step 2, step 3 smoothly without jank.

### 5. TKT-WEB-05: Page Assembly, Testimonials & Footer
- **Agent**: `frontend-specialist`
- **Skills**: `nextjs-react-expert`
- **Priority**: P2
- **Dependencies**: TKT-WEB-02, TKT-WEB-03, TKT-WEB-04
- **INPUT**: All created components and remaining sections (Trust / Footer).
- **OUTPUT**: Final `app/page.tsx` structure tying everything together.
- **VERIFY**: Page renders at `localhost:3000` without errors.

## Phase X: Verification
- [ ] Run `python .agent/scripts/verify_all.py .` or individual scripts.
- [ ] Manual Check: No standard template layouts used.
- [ ] Manual Check: "Operating System for Compliance" aesthetic maintained.
- [ ] Build Check: `npm run build` succeeds.
- [ ] Animation Check: Slider and stepper run at 60fps smoothly.
