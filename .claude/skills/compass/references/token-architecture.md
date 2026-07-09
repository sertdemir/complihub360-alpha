# Token Architecture for Compass

This is the canonical token architecture. All color, spacing, typography, radius, border, and effect decisions in Compass flow through this three-layer system.

The values below are anchored on the v1 specifications under `GoogleDrive_Docs/Design System-* v1.md` (Color, Typography, Spacing, Border, Elevation). When in doubt, those specs are the source of truth for raw values; this file is the source of truth for *architecture*.

## The three layers

```
PRIMITIVE  →  SEMANTIC  →  COMPONENT
   ↓            ↓             ↓
"raw value"  "purpose"     "specific use"
```

### Layer 1 — Primitives (the source palette)

Primitives describe **values**. They're the only layer that knows about hex codes, pixel numbers, font names. Everything above this layer is abstract.

**Naming**: `category.scale.step`
- `color.petrol.500`, `color.petrol.600`, `color.petrol.700`
- `color.gold.500`, `color.gold.600`, `color.gold.700`
- `color.neutral.50`, `color.neutral.100`, `color.neutral.200`, ... `color.neutral.900`
- `color.success.500`, `color.warning.500`, `color.error.500` (full scales when needed)
- `space.0`, `space.1`, ... (mapping below)
- `radius.xs`, `radius.sm`, `radius.md`, `radius.lg`, `radius.xl`, `radius.pill`
- `font.size.xs`, `font.size.sm`, ... `font.size.5xl`

**Rules:**
- Primitives are **never** referenced directly from components in mature systems
- Only semantic tokens reference primitives
- Build the full scale even if you only need a few values now — completeness avoids one-offs later

**CompliHub-specific primitives (v1 anchored):**
- **Petrol scale** anchored on Petrol-500 `#097070`: `petrol.500 #097070`, `petrol.600 #075C5C`, `petrol.700 #054848`. Extend with `petrol.50/100/300/400` as the system matures (Dark mode primary uses a lighter petrol `#3FA3A3` — encode it as `petrol.300` or similar).
- **Gold scale** anchored on Gold-500 `#D3B454`: `gold.500 #D3B454`, `gold.600 #B89B3E`, `gold.700 #9C8434`.
- **Neutral scale** (warm-leaning, harmonizes with Gold): `neutral.50 #FAF9F9`, `neutral.100 #EFE8E8`, `neutral.200 #E2DADA`, `neutral.300 #CFC7C7`, `neutral.900 #2B2B2B`. Fill `neutral.400/500/600/700/800` as needed.
- **Surface-Muted**: `surface.muted #BFD6D5` — desaturated petrol, used for Wizard shells and Filter sidebars.
- **Status scales** — typically green (success `#3C8C7A`), amber (warning `#C59E38`), red (error `#B55353`). Build each as a 50–900 scale; the v1 anchor is the `-500` step.
- **Dark Mode primitives**: `bg.dark #121616`, `surface.dark #1B2222`, `text.dark.primary #E7EFEF`, `petrol.dark #3FA3A3`. (See `references/theming.md` for how these are wired into modes.)

### Layer 2 — Semantic tokens (the purpose layer)

Semantic tokens describe **role**, not appearance. This is the layer most components actually consume. When the brand changes color or theme switches between light/dark, only this layer needs updating — primitives stay the same, components stay the same.

**Naming**: `category.role.modifier.state`

Examples:
- `color.surface.background.default`
- `color.surface.layer.01`, `.02`, `.03` (Carbon-style elevation in flat UI)
- `color.surface.muted` (Wizard / Filter shells, alias to `surface.muted`)
- `color.text.primary`, `color.text.secondary`, `color.text.tertiary`, `color.text.disabled`
- `color.text.brand` (Petrol-bound headlines)
- `color.text.danger`, `color.text.success`, `color.text.warning`
- `color.border.default` → `neutral.200 #E2DADA` (per Border Spec)
- `color.border.muted` → `neutral.100 #EFE8E8`
- `color.border.strong` → `neutral.300 #CFC7C7`
- `color.border.focus` → `petrol.500 #097070` (Petrol focus ring per Border Spec)
- `color.action.primary.background.default` → Petrol-500 (the Engagement Request CTA)
- `color.action.primary.background.hover` → Petrol-600
- `color.action.primary.background.pressed` → Petrol-700
- `color.action.primary.foreground.default` → `neutral.50` (white-ish)
- `color.action.danger.background.default` → `error.500` — destructive actions
- `color.feedback.success.background`, `.foreground`, `.border` — for status messages
- `color.brand.partnerBadge` → Gold-500 (Verified-Partner exclusive — see doctrine)
- `color.brand.partnerBadge.hover` → Gold-600
- `color.focus.ring` → Petrol-500 with 3px outline + 0.2 opacity halo (per Elevation Spec `shadow-focus`)

**Rules:**
- Always describe what the token is **for**, never what it **looks like**
- Avoid `light` / `dark` in the token name — that's what theming handles via Figma variable modes
- Mirror token sets across light and dark themes; same name, different primitive reference
- **Accent-Gold semantic tokens** are scoped under `color.brand.*` (specifically `color.brand.partnerBadge`) — never under `color.feedback.*` or `color.action.*`. This separation is enforced doctrine.

### Layer 3 — Component tokens (the specific layer)

Component tokens are scoped to a single component. Use sparingly — only when a component has unique needs that shouldn't bleed into the global semantic layer.

**Naming**: `component.element.role.state`
- `button.primary.background.default`
- `button.primary.background.hover`
- `input.border.focus`
- `card.padding.default` → `space.6` (24px per Spacing Spec)
- `wizard.panel.padding.default` → `space.7` (32px)
- `partner.badge.background` → Gold-500
- `partner.card.border` → Gold-500 (Featured Partner cards, per Border Spec line 91)

**Rules:**
- Most components do **not** need their own component tokens — they consume semantic tokens directly
- Only introduce component tokens when the component genuinely needs a value that isn't shared with anything else
- Component tokens always reference semantic tokens (almost never primitives directly)

## Why three layers?

| Need to change... | Affects | Effort |
|-------------------|---------|--------|
| Petrol hex value | One primitive | Tiny |
| Light → dark theme | Semantic mappings only | Manageable |
| One component's spacing | One component token | Trivial |
| All "danger" usages globally | One semantic token | Surgical |

Without the layers, every change cascades unpredictably. With them, the system is repairable.

## Spacing scale — 8px base + 4px micro-unit

Compass uses an **8px base** spacing scale (with a 4px micro-unit for icon-level alignments), per the v1 Spacing Specification:

| Token | Value | Primary UI Usage |
|-------|-------|------------------|
| `space.0` | 0 | reset / no spacing |
| `space.1` | 4px | micro-adjustments — icon positioning, internal badge spacing |
| `space.2` | 8px | tight clusters, button vertical padding |
| `space.3` | 12px | compact component internal gaps |
| `space.4` | 16px | standard button horizontal padding, small gaps |
| `space.5` | 20px | list item spacing |
| `space.6` | 24px | **default Card padding**, Wizard step gaps |
| `space.7` | 32px | **default Panel padding**, sidebar gaps |
| `space.8` | 40px | large component spacing |
| `space.9` | 48px | subsection headers |
| `space.10` | 64px | section spacing (min) |
| `space.11` | 80px | transition areas |
| `space.12` | 96px | section spacing (max) |

Layout-application rules (from the v1 spec):
- **Button padding**: 8px vertical / 16px horizontal
- **Card padding**: 24px internal padding for all ResultCard variants
- **Panel padding**: 32px internal padding for Dashboard and Wizard shells
- **Wizard step gap**: 24px vertical between input steps
- **Section spacing**: 64–96px vertical margin between landing-page sections

Consider density modes: a "compact" mode could halve some semantic spacing tokens (`density.list.row.gap` → smaller value) while primitives stay constant. See `references/theming.md` for the density axis.

## Typography scale

Per the v1 Typography Strategy: **IBM Plex Serif** for brand/headlines, **IBM Plex Sans** for UI/copy. Modular scale **1.25**.

**Font families:**
- `font.family.brand` — IBM Plex Serif (Display, H1, H2, H3)
- `font.family.ui` — IBM Plex Sans (body, UI, captions, table content)

**Sizes** (token name → desktop value, mobile value, role):
- `font.size.caption` — 12px / 12px — captions, letter-spacing 0.04em
- `font.size.xs` — 13px — small UI on mobile
- `font.size.sm` — 14px — small UI desktop, table cell, numeric data
- `font.size.base` — 16px — body desktop/tablet (15px mobile)
- `font.size.lg` — 18px — H3 mobile
- `font.size.xl` — 20px — H3 desktop/tablet
- `font.size.2xl` — 22px — H2 mobile
- `font.size.3xl` — 28px — H2 desktop / H1 mobile
- `font.size.4xl` — 36px — H1 desktop / Display mobile
- `font.size.5xl` — 56px — Display desktop

**Line heights:**
- `line.height.tight` — 1.2 (headlines, UI)
- `line.height.normal` — 1.4 (UI elements)
- `line.height.relaxed` — 1.6 (body — German benefits from this)
- `line.height.display` — 1.15 (Display only)

**Font weights:** `font.weight.regular` (400), `medium` (500), `semibold` (600), `bold` (700).

**Numeric:** Tabular Numbers enabled for `font.feature.tabular` — applied wherever compliance data appears (VAT thresholds, fees, jurisdiction codes, table cells).

**Text styles in Figma** (combine the above into named roles — components reference text styles, not raw font tokens):
- `Display/XL` — 56/44/36 (desktop/tablet/mobile), Plex Serif, line-height 1.15
- `Heading/H1`, `Heading/H2`, `Heading/H3` — Plex Serif, line-height 1.2
- `Body/Default` — 16px Plex Sans, line-height 1.6
- `Body/Default/Emphasis` — 16px Plex Sans 600, line-height 1.6
- `Body/Small` — 14px Plex Sans, line-height 1.4
- `Caption` — 12px Plex Sans, line-height 1.2, letter-spacing 0.04em
- `Data/Cell` — 14px Plex Sans, tabular nums, line-height 1.2
- `Data/Header` — 13px Plex Sans 600, tabular nums, line-height 1.2

## Radius scale (per v1 Border Spec)

| Token | Value | Use |
|-------|-------|-----|
| `radius.xs` | 2px | micro-elements / indicators |
| `radius.sm` | 4px | tooltips / small tags |
| `radius.md` | 8px | **inputs, buttons** (core action elements) |
| `radius.lg` | 12px | **cards, modals, wizard panels** |
| `radius.xl` | 16px | large dashboard modules |
| `radius.pill` | 999px | **badges** (Verified Partner, Status, VAT-Verified) |

CompliHub's brand is restrained — `radius.md` is the default for actions, `radius.lg` for containers. `radius.xl` is reserved for prominent dashboard modules. Avoid `radius.xl` as a general-purpose default.

## Border tokens (per v1 Border Spec)

**Widths:**
- `border.thin` — 1px (cards, tables, inputs — default)
- `border.medium` — 2px (focus states, hover effects on interactive cards)
- `border.thick` — 3px (heavy structural dividers, rare)

**Semantic border colors:**
- `color.border.default` → `neutral.200 #E2DADA`
- `color.border.muted` → `neutral.100 #EFE8E8`
- `color.border.strong` → `neutral.300 #CFC7C7`
- `color.border.focus` → `petrol.500 #097070`

## Effect / Elevation tokens (per v1 Elevation Spec)

CompliHub uses a **"Flat-Plus"** approach — most surfaces stay flat with layer-token hierarchy, shadows are reserved for true overlays.

| Token | Value | Use |
|-------|-------|-----|
| `shadow.sm` | `0 1px 2px 0 rgba(43,43,43,0.05)` | standard Result Cards, inputs |
| `shadow.md` | `0 4px 6px -1px rgba(43,43,43,0.1)` | hovered cards, sidebar panels |
| `shadow.lg` | `0 10px 15px -3px rgba(43,43,43,0.1)` | **Compliance Wizard shell**, modals |
| `shadow.xl` | `0 20px 25px -5px rgba(43,43,43,0.1)` | rare — high-overlay use |
| `shadow.inner` | `inset 0 2px 4px 0 rgba(43,43,43,0.06)` | search fields, active progress bars |
| `shadow.focus` | `0 0 0 3px rgba(9,112,112,0.2)` | Petrol focus halo (paired with `border.medium` + `color.border.focus`) |

**Dark Mode rule:** shadows are replaced by **Elevation Borders** (1px lighter strokes) — the Elevation Spec is explicit that light-source-shadows do not work in dark environments. See `references/theming.md`.

## How to actually build this in Figma

When implementing in the C360 Design System file (`a4BeKbsBGoHkcudhKXUJTl`):

1. **Variable collections**: Create separate collections for each layer (`01 — Primitives`, `02 — Semantic`, `03 — Component`)
2. **Modes within Semantic**: Use Figma variable modes for theming (`Light`, `Dark`, `High Contrast`) — only the Semantic collection has modes; primitives stay single-mode
3. **Aliasing**: Semantic variables alias primitive variables (`color.text.primary` → `neutral.900` in light mode, `neutral.50` in dark)
4. **Hide primitives** from team members in production — only semantic tokens are surfaced for component building
5. **Number-prefix the collections** (`01`, `02`, `03`) so they sort logically in Figma's UI

The `figma-generate-library` skill knows how to execute these via the Plugin API. This skill provides the *what* and *why*; that one provides the *how*.

## Tailwind / CSS-variable bridge

`apps/vs1-demo/ui/components.json` declares `cssVariables: true`. This means semantic tokens land in `apps/vs1-demo/ui/src/index.css` as CSS variables, then map into `tailwind.config.js`. Compass should ensure Figma semantic tokens and CSS-variable names are 1:1 — that is the bridge that lets `figma-code-connect` map components without translation drift.

Concretely:
- Figma semantic token `color.action.primary.background.default` ↔ CSS variable `--color-action-primary-background-default` ↔ Tailwind utility `bg-action-primary` (or similar — defined in `tailwind.config.js`)

## Token health checks

Periodically (or when asked) verify:

- No component references primitives directly (only semantic tokens)
- Every semantic token is used somewhere (unused tokens get pruned)
- Every theme mode covers every semantic token (no missing dark-mode mappings)
- No hex codes anywhere in components (audit catches drift)
- The Accent-Gold appears only in `color.brand.partnerBadge*` and component-level `partner.*` tokens — never in `color.feedback.*` or `color.action.*`
