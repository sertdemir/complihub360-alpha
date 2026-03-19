# CompliHub360 UI Design System

**Status:** Active Brand Mode (Phase 1)
**Philosophy:** Structured Compliance with Premium Branding.

## 1. Overview

This package contains the foundational UI components and tokens for CompliHub360.
All development and Stitch UI generation must adhere to the **Active Brand Mode** rules:

- **Primary Colors:** Forest Green (`#004D40`) for deep brand trust and structural elements.
- **Accent Colors:** Gold (`#D4AF37`) for primary call-to-actions (e.g., "Book an appointment").
- **Surface Colors:** Pastel Green (`#E8F5E9`) for card backgrounds and highlight sections.
- **Strict Spacing:** Multiples of 4px.
- **System Fonts:** Inter (sans-serif) only.

## 2. Token Architecture

Design tokens are exported in `tokens.json` for consumption by tooling (Stitch, Tailwind).

### Colors (Semantic)

Do not use raw hex values or Tailwind colors directly. Use semantic tokens:

- `bg.canvas` -> App background (White or very light gray)
- `bg.surface` -> Card/Panel background (Pastel Green `#E8F5E9`)
- `bg.brand` -> Deep Forest Green (`#004D40`)
- `fg.primary` -> Main text (slate-900 / black)
- `fg.inverse` -> Text on brand background (White)
- `action.primary` -> Gold CTA buttons (`#D4AF37`)
- `border.structural` -> Layout borders (`#E5E7EB` or `white/10`)

### Spacing

- `space.xs` (4px)
- `space.sm` (8px)
- `space.md` (16px)
- `space.lg` (24px)
- `space.xl` (32px)
- `space.2xl` (48px)

## 3. Developing Components

1. **Atomic First:** Build primitives in `components/primitives`.
2. **Composition:** Combine primitives into `components/layout` or `components/feedback`.
3. **Testing:** All components must have unit tests (`.test.tsx`).
4. **Linting:** Ensure 0 warnings before commit.

## 4. Stitch Integration

When generating code with Stitch:

- Reference the semantic colors from `tokens.json` or explicitly mention: "Use Deep Forest Green for headers, Pastel Green for cards, and Gold for main CTAs."
- Adopt the "Operating System for Compliance" aesthetic: clean lines, structured grids, high contrast, and premium typography (Inter).

---
*Maintained by: Design-Architect*
