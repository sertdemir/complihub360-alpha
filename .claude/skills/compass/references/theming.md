# Theming for Compass

Compass is a multi-theme system. This document defines how theming is structured, what themes are supported, and how to handle multi-brand scenarios (e.g. provider co-branded surfaces) for CompliHub360.

## Theming philosophy

**Themes change values, not structure.** A button in light mode and a button in dark mode have the same properties, the same layout, the same behavior — only the resolved color values differ. This is achieved through Figma's variable modes on the **semantic** layer.

Component designers should never have to think about themes. They reference semantic tokens; tokens resolve to the right value per theme automatically.

## Required themes

### Light (default)
The primary mode. Most CompliHub users default to light — Compliance Officers reviewing regulatory text on monitors, sales/finance teams in well-lit offices, audit-prep work in bright environments. The v1 Color Spec is light-mode anchored: `neutral.100 #EFE8E8` canvas, `neutral.900 #2B2B2B` text.

### Dark
Increasingly expected. Especially valuable for power users in long sessions (Compliance Officers reviewing late, provider-side specialists working across time zones). Per the v1 Dark Mode Architecture:

- Background: `#121616`
- Surface: `#1B2222`
- Text (primary): `#E7EFEF`
- Primary accent: `#3FA3A3` (a lighter petrol — adequate contrast on dark surfaces)

Must not be a naive inversion — backgrounds are warm-dark (not pure black) to harmonize with the Accent-Gold and reduce eye strain.

### High Contrast (recommended for Compass)
For accessibility — users with low vision, EU public-sector buyers required to meet AAA standards in their procurement, Compliance Officers in regulated industries (Life Sciences, finance) with mandated contrast settings. Increases contrast ratios beyond WCAG AA, simplifies surfaces, strengthens borders.

## Theme implementation in Figma

### Variable modes on the semantic collection

The `02 — Semantic` collection has modes:
- `Light`
- `Dark`
- `High Contrast` (optional, can be added later)

Each semantic token has a value defined per mode. Each value is an alias to a primitive.

Example for `color.text.primary`:
- Light mode → `color.neutral.900` (`#2B2B2B`)
- Dark mode → `color.neutral.50` or `#E7EFEF` (per v1 Dark Mode Spec)
- High Contrast → pure white/black for max contrast

Example for `color.action.primary.background.default`:
- Light mode → `color.petrol.500` (`#097070`)
- Dark mode → `color.petrol.300` aliased to `#3FA3A3` (per v1 Dark Mode Spec)
- High Contrast → a token that meets ≥7:1 against its expected foreground

**Primitives have no modes.** They are constants. Modes only live on semantic tokens.

### Theme application in screens

Frames at the top of a Figma file (or per-page) carry a mode assignment. Components inside resolve their tokens through that mode automatically.

For multi-theme reviews: place duplicate frames side-by-side, set each to a different mode, see the system render in all themes simultaneously.

### Shadows in Dark Mode — the Elevation rule

Per the v1 Elevation Spec: **In Dark Mode, shadows are replaced by Elevation Borders (1px lighter strokes)**. Light-source shadow logic does not work in dark environments. So:

- Light mode `shadow.sm` → Dark mode `border.thin` + `color.border.default` (lighter alias)
- Light mode `shadow.md` → Dark mode `border.medium` + lighter border
- Light mode `shadow.lg` (Wizard shell, modals) → Dark mode `border.thin` + a slightly stronger border + a subtle inner glow if needed

This is encoded in the semantic effect tokens — components consume `effect.elevation.01/02/03` rather than `shadow.*` directly, and those semantic tokens resolve correctly per mode.

## Multi-brand thinking

CompliHub360 is a marketplace. Some Verified Partners may eventually request co-branded surfaces (e.g. a Featured Partner's profile page styled to match their corporate identity within the CompliHub frame). Compass should be **multi-brand-capable** without being forced into multi-brand right now.

### The brand layer

Add a separate variable collection or a separate dimension to the semantic mode for brand:

Option A — Brand as additional modes:
```
Light / CompliHub
Light / Provider-CoBranded
Dark / CompliHub
Dark / Provider-CoBranded
```

Option B — Brand as a separate collection layered above semantic:
```
01 Primitives
02 Semantic (modes: Light, Dark, HC)
03 Brand (modes: CompliHub, Provider-CoBranded-{name}, Regional-EU, Regional-DACH, ...)
04 Component
```

Option B is cleaner for true multi-brand. Option A is simpler if "brand" is mostly accent color swaps.

**Recommendation for Compass:** Start with Option A (brand baked into modes) for simplicity. Migrate to Option B only when actual co-branded provider surfaces become a real requirement. Premature abstraction is more painful than late refactoring here.

Important guardrail: even in co-branded mode, the **CompliHub Petrol primary CTA** and the **Verified-Partner Gold badge** should remain recognizable. A co-branded surface that hides the platform's identity undermines the marketplace's accountability promise.

### Petrol & Accent-Gold across themes

`#097070` (Petrol) and `#D3B454` (Accent-Gold) are CompliHub's brand identity colors. They need special handling:

- **Light mode**:
  - Petrol — use as-is for primary CTAs (Engagement Request) and brand accents
  - Accent-Gold — use as-is on light surfaces for Verified-Partner badges
- **Dark mode**:
  - Petrol — shift to `#3FA3A3` (the lighter petrol from v1 Dark Mode Spec) for adequate contrast on dark surfaces
  - Accent-Gold — shift to a slightly lighter gold (e.g. `gold.400` if the scale supports it) so badges remain legible without "glowing"
- **High Contrast**:
  - Petrol — keep saturated, ensure ≥7:1 against text foregrounds
  - Accent-Gold — may need to be replaced by a high-contrast amber token if AAA contrast is required

Define semantic tokens (`color.action.primary.*`, `color.brand.partnerBadge.*`) that alias the right value per mode. Components reference these, never the primitives.

## Tokens that vary per theme — and tokens that don't

### Vary per theme:
- All `color.*` semantic tokens
- All `effect.elevation.*` semantic tokens (the Light → Dark Mode "shadow → border" swap is a per-mode resolution)

### Do NOT vary per theme:
- `space.*` — spacing is constant (8px base + 4px micro stays the same in light and dark)
- `radius.*` — corner radii are constant
- `font.size.*`, `font.weight.*` — typography is constant
- `font.family.*` — typography is constant (Plex Serif / Sans across all themes)

If you find yourself wanting to vary spacing or radius per theme, you're probably doing density (separate concern), not theming.

## Density as a separate axis

Density (`comfortable` / `compact`) is theming-adjacent but distinct. It varies **spacing tokens**, not color tokens. CompliHub has a clear density split:

- **Comfortable** (default): Compliance Wizard, landing page, marketing surfaces, Engagement Modal — high-intent input deserves breathing room
- **Compact**: Results Page provider lists, Provider Dashboard tables, jurisdiction comparison views — power-user surfaces where vertical density matters

Implement as a separate variable collection with its own modes:

```
04 Density
├── Comfortable (default)
└── Compact
```

Components consume density tokens (e.g. `density.list.row.gap`, `density.table.row.padding`) where density matters. Most components don't need density variants — Buttons, Modals, Wizard step panels are density-neutral.

## Theming pitfalls to avoid

1. **Don't put theme names in component variables.** A button doesn't have a "dark mode variant" — it has the same variants and resolves tokens differently.

2. **Don't half-theme.** Either every semantic token has a value in every mode, or you'll get unstyled fallbacks in production.

3. **Don't make light and dark perfect inversions.** The v1 Dark Mode Spec is explicit: warm darks, lighter petrol, no naive inversion.

4. **Don't theme primitives.** Primitives are values. Themes select among primitives via semantics.

5. **Don't add high-contrast as an afterthought.** It's a real theme with real users (especially in regulated CompliHub customer industries). If you commit to it, build it from day one of the relevant semantic.

6. **Don't keep using shadows in Dark Mode.** The Elevation Spec mandates the shadow → border swap. Components should consume `effect.elevation.*` semantic tokens that resolve correctly per mode.

## Verifying a theme

A theme is healthy when:

- Every semantic token has a value defined in this mode
- Every component renders correctly in this mode (no broken contrast, no missing colors, no shadows leaking into Dark Mode)
- Contrast ratios meet WCAG 2.2 AA (4.5:1 for body text, 3:1 for UI elements and large text)
- Brand identity remains recognizable — CompliHub feels like CompliHub in dark mode too (Petrol still reads as Petrol, Verified-Partner Gold still reads as Gold)

A simple verification page in the C360 Design System file — one frame per theme, showing the same set of components — makes regression visible quickly.
