# Design Policy (Neutral Foundation Mode)

**Enforced By**: Design-Policy-Governor / UI-Builder

This document defines the strict UI and UX requirements for the CompliHub360 Alpha phase. We operate in an explicitly "Neutral UI Mode" to establish structural robust primitives before applying brand overlays.

## 1. Color Palette (Neutral Default)

- **MUST** use Grayscale / Black & White / `slate-950` as the structural foundation.
- **MUST NOT** introduce arbitrary "Brand Colors" (no custom blues, purples, brand gradients).
- **SHOULD** use opacity shifts (`bg-white/5`, `border-white/10`) for depth and elevation on dark backgrounds.

*Anti-Pattern*: `bg-blue-600` for a standard primary button.
*Pattern*: `bg-white text-black` or `border border-white/20 bg-transparent` for actions.

## 2. Semantic Status Colors

Color is reserved strictly for semantic feedback and status indicators.

- **MUST** be muted or used sparingly as indicators, not as large background fills.
- **Success**: Green (e.g., `text-emerald-500`, `bg-emerald-500/10`)
- **Warning**: Yellow/Orange (e.g., `text-amber-500`, `bg-amber-500/10`)
- **Error**: Red (e.g., `text-rose-500`, `bg-rose-500/10`)
- **Info**: Blue (e.g., `text-blue-400`, `bg-blue-400/10`)

## 3. Typography & Spacing

- **MUST** use clean, non-decorative fonts (e.g., Inter, system-ui).
- **MUST** follow a strict 4px/8px spacing rhythm (Tailwind scale: `p-1`, `p-2`, `p-4`, `p-8`).
- **MUST NOT** use arbitrary padding values outside the token system (e.g., `p-[13px]`).

## 4. Accessibility (A11y) & Focus

- **MUST** maintain WCAG AA contrast for text elements.
- **MUST** include visible focus states for all interactive elements: `focus:ring-2 focus:ring-white/50 focus:outline-none`.
- **SHOULD** include `aria-label` or `aria-describedby` where visual context is insufficient.

## 5. Design System Architecture

- **MUST** build UI using generic layout primitives (`Flex`, `Grid`, `Container`) and structural atomic components (`Button`, `Badge`, `Card`).
- **MUST NOT** build "one-off" complex elements without identifying reusable base tokens.
