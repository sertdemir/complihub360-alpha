# Neutral Foundation System - Design Architecture

## 1. PURPOSE

To establish a scalable, neutral design infrastructure for CompliHub360 Alpha that prioritizes structure, hierarchy, and spacing over aesthetic decoration. This foundation enables rapid iteration of layout and flow without accumulating "design debt" from premature branding decisions. It serves as the authoritative source for all UI implementation until the "Brand Phase" is activated.

## 2. SYSTEM PROPOSAL

**Name:** CompliHub Neutral
**Mode:** Neutral Foundation Mode (Phase 0)
**Core Philosophy:** "Structure First, decoration Later."
**Visual Dialect:** Strict Wireframe / Architectural Schematic.

### Key Constraints

- **Color:** Monochrome only (Slate/Neutral palette). No primary/accent colors.
- **Typography:** Inter (System Sans). Single font family. Hierarchy via weight/size only.
- **Dimensions:** 4px baseline grid.
- **Borders:** 1px solid structural borders. No shadows (unless critical for z-index depth).

## 3. STRUCTURE DEFINITION

### 3.1 App Shell

The application follows a "Dashboard" structural archetype:

- **Sidebar (Navigation):** Fixed width (`280px`), fixed position (left). Border-right separator.
- **Header (Global Actions):** Fixed height (`64px`), sticky top. Border-bottom separator. Glassmorphism allowed only for functional context (overlay prevention), otherwise solid.
- **Main Content:** Fluid width, reachable via distinct URL routes.

### 3.2 Grid System

- **Base Unit:** `4px` (0.25rem).
- **Columns:** 12-column fluid grid for dashboard widgets.
- **Gutters:** Responsive scale:
  - `mobile`: 16px
  - `tablet`: 24px
  - `desktop`: 32px

### 3.3 Layout Primitives

The implementation must use these specific layout components (to be built):

- `Box`: Generic container with padding/margin props.
- `Stack`: Flex container (vertical/horizontal) with strict gap enforcement.
- `Grid`: CSS Grid container.
- `Surface`: Background container with border/radius context.

## 4. TOKEN ARCHITECTURE

Tokens are semantically named to decouple intent from value.

### 4.1 Color Tokens (Semantic)

*Values mapped to Tailwind Slate/Neutral (gray implementation).*

| Token | Semantic Role | Value Reference |
| :--- | :--- | :--- |
| `bg.canvas` | App background | `neutral-950` (#09090b) |
| `bg.surface` | Component background | `neutral-900` (#18181b) |
| `bg.subtle` | Secondary/Hover | `neutral-800` |
| `fg.primary` | Main text | `neutral-50` (#fafafa) |
| `fg.secondary` | Meta text | `neutral-400` (#a1a1aa) |
| `border.structural`| Layout dividers | `neutral-800` |
| `border.subtle` | Inner dividers | `neutral-900` |

### 4.2 Spacing Scale (4px)

| Token | Value | Tailwind Class |
| :--- | :--- | :--- |
| `space.xs` | 4px | `1` |
| `space.sm` | 8px | `2` |
| `space.md` | 16px | `4` |
| `space.lg` | 24px | `6` |
| `space.xl` | 32px | `8` |

### 4.3 Typography (Hierarchy)

| Token | Role | Specs |
| :--- | :--- | :--- |
| `text.h1` | Page Title | 24px/32px, Bold |
| `text.h2` | Section Title | 20px/28px, Semibold |
| `text.body` | Default Content | 14px/20px, Regular |
| `text.small` | Meta/Caption | 12px/16px, Regular |
| `text.mono` | Code/Data | (Monospace) |

## 5. STITCH INTEGRATION PLAN

To ensure valid code generation via Stitch/MCP:

1. **Token Export:**
    - Generate `tokens.json` containing the semantic keys above.
    - Configure Stitch to reference semantic tokens (e.g., `bg-surface`) instead of raw values (`bg-neutral-900`).

2. **Component Mapping:**
    - Stitch must invoke specific React components from `@complihub/ui` (e.g., `<Button variant="neutral" />`, not `<div className="...">`).

3. **Isolation:**
    - Stitch generated code ("Screens") must be isolated in `features/` or `pages/` and verified against the token system.

4. **Mandatory Stitch Prompt Injection:**
    - Every time an agent calls `mcp_StitchMCP_generate_screen_from_text` or `mcp_StitchMCP_edit_screens`, the following constraint block MUST be appended to the prompt to force Stitch into compliance:

    ```text
    DESIGN CONSTRAINTS (MANDATORY):
    - Theme: STRICT MONOCHROME (Neutral/Slate palette only). 
    - Colors: Canvas background MUST be #09090b. Card/Surface backgrounds MUST be #18181b. Borders MUST be 1px solid #27272a.
    - Accents: NO primary brand colors. No red/green/yellow status colors. Use grayscale text/icons only.
    - Typography: Inter font family. Clean hierarchy.
    - Structure: 12-column grid. No top navigation bars unless explicitly requested (assume injection into an existing App Shell). No drop shadows, use 1px borders for depth.
    ```

## 6. RISK ANALYSIS

- **Risk:** Premature Branding.
  - *Mitigation:* Policy-Guard must reject PRs introducing non-neutral colors (Blue, Red, etc.) except for semantic status (Success/Error - strictly limited).
- **Risk:** Magic Numbers.
  - *Mitigation:* Global lint rule enforcing multiples of 4px.
- **Risk:** Component Drift.
  - *Mitigation:* All UI must be composed of `Primitives`.

## 7. REQUIRES POLICY-GUARD?

**YES.**
This document defines the "Law" for the UI layer. Policy-Guard must enforce:

1. No new color introduction.
2. Strict usage of `ui/design-system` components.
3. Rejection of "hardcoded" pixel values outside the spacing scale.

---
*Signed: Design-Architect*
