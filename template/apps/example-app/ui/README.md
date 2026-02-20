# CompliHub360 UI Design System

**Status:** Neutral Foundation Mode (Phase 0)  
**Philosophy:** Structure First. Decoration Later.

## 1. Overview

This package contains the foundational UI components and tokens for CompliHub360.
All development must adhere to the **Neutral Foundation Mode** rules:

- **No Brand Colors:** Use only monochrome/neutral tokens.
- **Strict Spacing:** Multiples of 4px.
- **System Fonts:** Inter (sans-serif) only.

## 2. Token Architecture

Design tokens are exported in `tokens.json` for consumption by tooling (Stitch, Tailwind).

### Colors (Semantic)

Do not use raw hex values or Tailwind colors directly. Use semantic tokens:

- `bg.canvas` -> App background
- `bg.surface` -> Card/Panel background
- `fg.primary` -> Main text
- `border.structural` -> Layout borders

### Spacing

- `space.xs` (4px)
- `space.sm` (8px)
- `space.md` (16px)
- `space.lg` (24px)

## 3. Developing Components

1. **Atomic First:** Build primitives in `components/primitives`.
2. **Composition:** Combine primitives into `components/layout` or `components/feedback`.
3. **Testing:** All components must have unit tests (`.test.tsx`).
4. **Linting:** Ensure 0 warnings before commit.

## 4. Stitch Integration

When generating code with Stitch:

- Reference `tokens.json`.
- Map components to library exports (e.g., `<BaseButton variant="neutral">`).

---
*Maintained by: Design-Architect*
