# Component Standards for Compass

This is the canonical specification for how Compass components are designed, named, structured, and documented. Every component built in the C360 Design System file should pass these standards.

## The component definition

A Compass component is **production-grade** when it has:

1. A clear single responsibility (it does one thing well)
2. A well-designed property API (orthogonal, minimal, self-explanatory)
3. All meaningful interactive states (hover, focus, active, disabled, loading where relevant)
4. Light + dark + (when defined) high-contrast theme support via tokens
5. Accessibility built in (contrast, focus, hit targets, semantic structure)
6. A Figma description following the documentation standard
7. A clean Storybook mapping under `apps/vs1-demo/ui/src/components/ui/` (shadcn `"new-york"` style — see `components.json`)
8. A `*.figma.tsx` Code Connect mapping where applicable (per `figma.config.json`)

A component missing any of these is a **draft**, not a finished component.

## The property API

The component's property panel is its API. Design it like one.

### Property types in Figma — and what they mean for code

| Figma property type | React prop equivalent | When to use |
|---------------------|----------------------|-------------|
| Variant (string) | `variant: 'primary' \| 'secondary'` | Mutually exclusive visual modes |
| Boolean | `isLoading: boolean` | Independent on/off states |
| Instance Swap | `<Button leftIcon={<Plus />}>` | Slot for a child component |
| Text | `children: string` | Inline text content |

### Orthogonality is non-negotiable

A common anti-pattern: variants like `primary-large-disabled-icon-loading`. This is wrong because it conflates four separate concerns into one variant axis, leading to combinatorial explosion (5 sizes × 4 styles × 2 disabled × 2 loading = 80 variants).

Correct: each axis is its own property:
- `style: primary | secondary | tertiary | danger | ghost` (variant)
- `size: sm | md | lg` (variant)
- `isDisabled: boolean`
- `isLoading: boolean`
- `leftIcon: instance swap`
- `rightIcon: instance swap`

### Naming properties

- **Variants**: lowercase, kebab-or-single-word, semantic (`primary` not `petrol`)
- **Booleans**: prefix with state verb (`isDisabled`, `isLoading`, `hasIcon`) — these read naturally as React props
- **Instance swaps**: describe the slot (`leftIcon`, `rightIcon`, `avatar`, `badge`)
- **Text**: describe the content role (`label`, `placeholder`, `helperText`)

### Property limits

Soft limit: **6 properties per component**. If you exceed this, ask: should this be split into sub-components?

Example: instead of a `ProviderCard` with 14 props (badge, rating, jurisdiction, price, CTA-label, …), build:
```
ProviderCard
├── ProviderCard.Header   (logo, name, VerifiedPartnerBadge slot)
├── ProviderCard.Body     (jurisdictions, rating, summary)
└── ProviderCard.Footer   (price, EngagementRequest CTA)
```
Each sub-component has its own focused API.

## Sub-component pattern (compositional design)

Following shadcn-inspired thinking: many enterprise components are better as **structures** than as **configurations**.

When a component has:
- Optional regions that may or may not be present
- Variable internal arrangements
- Repeating sub-elements (e.g. table rows, list items, wizard steps)

…it should be built compositionally with named sub-components in Figma:

```
Compass/Card
Compass/Card/Header
Compass/Card/Title
Compass/Card/Description
Compass/Card/Content
Compass/Card/Footer
```

In Figma: build each as its own component, place them as instances inside `Card` with auto-layout. The user can then detach/swap them per use case.

In Storybook: maps to `<Card>{<Card.Header>...</Card.Header><Card.Content>...</Card.Content></Card>}` — exactly the shadcn pattern in `apps/vs1-demo/ui/src/components/ui/card.tsx`.

## Interactive states

Every interactive component must define these states explicitly (as variants or as a separate "states" doc page):

- **Default** — resting state
- **Hover** — pointer over (cursor: pointer-eligible)
- **Focus-visible** — keyboard navigation focus (NOT the same as hover; many devs forget this)
- **Active / Pressed** — being clicked
- **Disabled** — non-interactive
- **Loading** — busy (where applicable)
- **Error / Invalid** — for inputs
- **Selected** — for items in selection patterns (radio, checkbox, tabs, wizard steps)

**Focus-visible matters.** A button that has hover but no focus state fails keyboard users. This is non-negotiable.

## State styling rules

- **Hover**: subtle background shift, no movement of content (e.g. ProviderCard transitions `shadow.sm` → `shadow.md`)
- **Focus-visible**: clear outline (`border.medium` + `color.border.focus` per Border Spec), uses `color.focus.ring` semantic token, never replaced with hover only
- **Pressed**: slightly darker than hover (e.g. `petrol.700` for primary buttons), no translation (CompliHub brand is restrained — no bouncy press animations)
- **Disabled**: reduced opacity (typically 50%) OR muted color tokens, plus `cursor: not-allowed`. Cannot be the only signal — still readable.
- **Loading**: spinner replaces icon position, button text dims slightly, button stays same size (no layout shift)
- **Error/Invalid (inputs)**: border switches to `color.feedback.error.border`, icon + helper-text-as-error message persist below the field

## Figma-specific component hygiene

When building in Figma:

- **Auto-layout always** — no fixed positioning unless absolutely necessary
- **Clip content where appropriate** — prevent overflow surprises
- **Constraint instances correctly** — left/right/center constraints determine resize behavior
- **Use component properties on all editable text** — never leave hardcoded text in master
- **Default values should be realistic** — CompliHub-context realistic content, not "Lorem ipsum" or "Button text". Examples:
  - Button label: `"Engagement Request senden"`, `"Verified Partner anzeigen"`, `"VAT-Schwelle prüfen"`
  - Input placeholder: `"Jurisdiktion auswählen"`, `"Rechnungs-ID"`, `"E-Mail des Compliance-Officers"`
  - Card title: `"GDPR Audit – DACH"`, `"VAT Cross-Border Bundle"`
- **Don't use detached groups** — everything is either an instance or a frame
- **Clean layer names** — no "Frame 4218", use semantic names (`Container`, `Content`, `Trailing`, `BadgeSlot`)

## Component naming

Component names follow `Compass/Category/Subcategory/Name`:

```
Compass/Action/Button                       ← top-level
Compass/Action/Button/Group                 ← related variant
Compass/Form/Input
Compass/Form/Input/Field
Compass/Form/Input/HelperText
Compass/Navigation/Sidebar
Compass/Navigation/Sidebar/Item
Compass/Navigation/Wizard
Compass/Navigation/Wizard/Step
Compass/DataDisplay/Table
Compass/DataDisplay/Table/Row
Compass/DataDisplay/ProviderCard
Compass/DataDisplay/Badge
Compass/DataDisplay/Badge/VerifiedPartner   ← Gold-bound variant
Compass/Feedback/Alert
Compass/Overlay/EngagementModal
Compass/Overlay/Tooltip
```

Suggested top-level categories:
- `Foundation/` — primitives, utilities (Spacer, Divider, Icon)
- `Form/` — Input, Select, Checkbox, Radio, Textarea, FormField
- `Action/` — Button, ButtonGroup, IconButton, Link
- `Navigation/` — Tabs, Sidebar, Breadcrumb, Pagination, Wizard
- `DataDisplay/` — Table, List, Card, ProviderCard, Tag, Badge, Avatar
- `Feedback/` — Alert, Toast, Banner, ProgressBar, Spinner, EmptyState
- `Overlay/` — Modal, EngagementModal, Drawer, Popover, Tooltip, Menu
- `Layout/` — Container, Stack, Grid, Section

## Code Connect mappings

Compass components must ship with Figma Code Connect mappings to the React implementation:

- File pattern: `apps/vs1-demo/ui/src/**/*.figma.tsx` (per `figma.config.json`)
- Each Compass component → corresponding `*.figma.tsx` next to its `*.tsx` implementation in `apps/vs1-demo/ui/src/components/ui/`
- Use the React parser already configured in `figma.config.json`
- The mapping is part of the component's *Definition of Done* — a Figma component without a Code Connect file is not "shipped"

The `figma-code-connect` skill handles the actual file generation. Compass enforces that it happens.

## The component review checklist

Before considering a component "done":

- [ ] Has all required properties, none redundant
- [ ] Properties are orthogonal (no combined-axis variants)
- [ ] All interactive states defined including focus-visible
- [ ] Uses only semantic tokens (no primitives, no hex codes)
- [ ] Light + dark theme verified (Dark Mode replaces `shadow.*` with `border.thin` per Elevation Spec)
- [ ] Contrast meets WCAG 2.2 AA in all states
- [ ] Hit targets ≥44px for primary interactive areas
- [ ] Auto-layout configured for all expected resize behavior
- [ ] Realistic CompliHub-context default content
- [ ] Figma description filled in following documentation standard
- [ ] Naming follows convention (`Compass/Category/...`)
- [ ] Sub-components used where appropriate (no monolithic prop-heavy components)
- [ ] Storybook mapping considered (props translate cleanly to React under `apps/vs1-demo/ui/src/components/ui/`)
- [ ] Code Connect file present at `apps/vs1-demo/ui/src/**/*.figma.tsx` (where applicable)

## Examples of well-formed Compass components

### Button (canonical reference)

**Properties:**
- `style: primary | secondary | tertiary | danger | ghost` (variant)
- `size: sm | md | lg` (variant)
- `isDisabled: boolean`
- `isLoading: boolean`
- `leftIcon: instance swap` (optional, lucide-react)
- `rightIcon: instance swap` (optional, lucide-react)
- `label: text` (string)

**States in Figma:** Default, Hover, Focus-visible, Pressed, Disabled, Loading

**Tokens consumed:**
- `color.action.{style}.background.{state}` — primary maps to Petrol scale
- `color.action.{style}.foreground.{state}`
- `color.action.{style}.border.{state}`
- `space.button.padding.x.{size}` (md = `space.4` 16px), `space.button.padding.y.{size}` (md = `space.2` 8px)
- `radius.md` (8px per Border Spec)
- Text style: `Body/Default/Emphasis` (16px Plex Sans 600 — meets the v1 Typography rule "Button Text 16px recommended for tap targets")

**Storybook mapping:**
- Path: `apps/vs1-demo/ui/src/components/ui/button.tsx`
- Code Connect: `apps/vs1-demo/ui/src/components/ui/button.figma.tsx`

### VerifiedPartnerBadge (Gold-bound, doctrine-critical)

**Properties:**
- `size: sm | md | lg` (variant)
- `withIcon: boolean` (default true)

**States in Figma:** Default, Hover (interactive variant only)

**Tokens consumed:**
- `color.brand.partnerBadge.background` → Gold-500
- `color.brand.partnerBadge.foreground` → `neutral.900` for AA contrast
- `radius.pill` (999px per Border Spec — badges are pills)
- Text style: `Caption` (12px Plex Sans, letter-spacing 0.04em)

**Doctrine note:** This component is the **only** place outside `partner.*` component tokens where Gold appears. Any other Gold usage is flagged.

### ProviderCard (composition example)

**Structure:**
```
Compass/DataDisplay/ProviderCard
├── Compass/DataDisplay/ProviderCard/Header     (logo, name, VerifiedPartnerBadge slot)
├── Compass/DataDisplay/ProviderCard/Body       (jurisdictions, rating, summary)
└── Compass/DataDisplay/ProviderCard/Footer     (price, EngagementRequest CTA)
```

**Why this composition:** A ProviderCard wraps logo, identity badges, jurisdictional metadata, rating, summary, and the primary monetized action. Forcing all of that into one prop API would explode. Composition keeps each region focused and lets the Featured Partner variant (Gold border per Border Spec) ride on the parent without leaking into sub-components.

**Tokens consumed (parent):**
- `color.surface.layer.01` (default), `color.surface.layer.02` (hover)
- `border.thin` + `color.border.default` (default), Featured variant: `border.thin` + `color.brand.partnerBadge` (Gold)
- `radius.lg` (12px — cards per Border Spec)
- `shadow.sm` → `shadow.md` on hover (per Elevation Spec)
- `space.6` (24px) padding

### FormField (composition example)

**Structure:**
```
Compass/Form/Field
├── Compass/Form/Field/Label
├── Compass/Form/Input        ← swappable: Input, Select, Textarea, JurisdictionPicker
└── Compass/Form/Field/HelperText  ← also handles error message
```

**Why this composition:** A FormField wraps any input type and adds label + helper/error consistently. The input itself stays simple. Critical for Compliance Wizard accessibility — every field has a visible label, not a placeholder-as-label.
