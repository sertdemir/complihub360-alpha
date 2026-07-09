# Naming Conventions for Compass

Naming is the cheapest tool for clarity in a design system. These conventions apply across files, pages, layers, components, variables, and styles.

## File naming

- Master design system file: `C360 - Design System` (the file name in Figma stays this — that's where the system *lives*)
- Branch files: `C360 Design System — {feature/work}` (e.g. `C360 Design System — Form Components v2`)
- Application files consuming Compass: `{App} — {Feature}` (e.g. `VS1 Demo — Wizard Onboarding`, `CompliHub Landing — Pricing Page`)

## Page structure within the C360 Design System file

Use page emoji prefixes for fast scanning. Recommended structure:

```
🌟  Cover
📚  Getting Started
📐  Design Principles
🧭  Documentation
─── Foundations ───
🎨  Colors
🔤  Typography
📏  Spacing & Radius
🪟  Borders
✨  Effects & Elevation
🌗  Theming
─── Components ───
🧩  Action
🧩  Form
🧩  Navigation
🧩  Data Display
🧩  Feedback
🧩  Overlay
🧩  Layout
─── Patterns ───
🔄  Patterns
🎯  Templates
─── Working Pages ───
🛠  Work in Progress
🗄  Archive
```

This separation makes the system browseable without prior knowledge.

## Layer naming

**Bad** (Figma defaults): `Frame 4218`, `Rectangle 12`, `Group 5`
**Good** (semantic): `Container`, `Content`, `Trailing`, `Icon Wrapper`, `BadgeSlot`

Rules:
- Every layer that matters has a name describing its **role**, not its **shape**
- Decorative layers can stay as `Background`, `Highlight`, `Indicator`
- Auto-layout containers: `{Direction}-Stack` is acceptable (`Horizontal-Stack`) or `Cluster` / `Stack`

## Component naming

Format: `Compass/{Category}/{Component}` for top-level, `Compass/{Category}/{Component}/{Sub}` for sub-components.

```
✅  Compass/Action/Button
✅  Compass/Form/Input
✅  Compass/Form/Input/Field
✅  Compass/DataDisplay/Table/Row
✅  Compass/DataDisplay/ProviderCard
✅  Compass/DataDisplay/Badge/VerifiedPartner
✅  Compass/Navigation/Wizard/Step
✅  Compass/Overlay/EngagementModal/Footer

❌  Button (no namespace)
❌  Compass/Buttons (plural)
❌  Compass/PrimaryButton (use property, not name)
❌  Compass/Action/PetrolButton (appearance-based, not role-based)
```

## Variant naming

Variants describe **role**, not **appearance**:

```
✅  style: primary | secondary | tertiary | danger | ghost
✅  size: sm | md | lg
✅  state: default | active | error | success

❌  style: petrol | gray | red | white         (appearance-based)
❌  size: small | medium | large              (verbose; sm/md/lg is ecosystem-standard)
❌  state: normal | working | broken | done   (vague)
```

Common variant axis names — use these consistently across components:
- `style` — visual emphasis (primary, secondary, etc.)
- `size` — physical scale (sm, md, lg, xl)
- `density` — comfortable, compact (where applicable)
- `orientation` — horizontal, vertical
- `state` — for components with explicit state variants (selected, error, etc. — but prefer booleans where possible)

## Boolean property naming

Booleans are independent toggles. Name them with a state-prefix verb:

```
✅  isDisabled
✅  isLoading
✅  isSelected
✅  isVerified
✅  isFeatured
✅  hasIcon
✅  hasLabel

❌  disabled                  (ambiguous — variant or boolean?)
❌  loading
❌  active                    (ambiguous)
```

The `is` / `has` prefix makes them read naturally as React props later — and matches the shadcn/ui conventions used in `apps/vs1-demo/ui/src/components/ui/`.

## Variable naming

Variables follow **dot notation** with strict hierarchy:

```
{layer}.{category}.{role}.{modifier}.{state}
```

### Primitives (Layer 01)
```
color.petrol.500
color.petrol.600
color.gold.500
color.gold.600
color.neutral.50
color.neutral.100
color.neutral.200
color.neutral.900
color.success.500
color.warning.500
color.error.500
color.surface.muted        (= #BFD6D5, the Wizard/Filter teal-tinted neutral)
space.1                    (= 4px, micro)
space.2                    (= 8px)
space.6                    (= 24px, default Card padding)
space.7                    (= 32px, default Panel padding)
radius.md                  (= 8px, inputs/buttons)
radius.lg                  (= 12px, cards/modals/wizard panels)
radius.pill                (= 999px, badges)
font.size.base             (= 16px)
font.weight.semibold       (= 600)
```

### Semantic (Layer 02)
```
color.surface.background.default
color.surface.layer.01
color.surface.layer.02
color.surface.layer.03
color.surface.muted                                   (Wizard / Filter shells)
color.text.primary
color.text.secondary
color.text.tertiary
color.text.brand
color.text.disabled
color.border.default
color.border.muted
color.border.strong
color.border.focus
color.action.primary.background.default               (→ Petrol-500)
color.action.primary.background.hover                 (→ Petrol-600)
color.action.primary.background.pressed               (→ Petrol-700)
color.action.primary.foreground.default
color.action.danger.background.default                (→ Error-500)
color.feedback.success.background
color.feedback.success.foreground
color.feedback.warning.foreground
color.feedback.error.foreground
color.brand.partnerBadge.background                   (→ Gold-500, Verified-Partner only)
color.brand.partnerBadge.foreground
color.brand.partnerBadge.hover
color.focus.ring                                      (→ Petrol-500 + 0.2 alpha halo)
effect.elevation.01                                   (resolves to shadow.sm in light, border.thin in dark)
effect.elevation.02
effect.elevation.03
```

### Component (Layer 03 — sparingly)
```
button.primary.padding.x.md
button.primary.padding.y.md
input.border.focus
modal.elevation
card.padding.default
wizard.panel.padding.default
partner.badge.background                              (Gold-500)
partner.card.border                                   (Gold-500, Featured Partner cards)
```

### Style/effect tokens
```
shadow.sm
shadow.md
shadow.lg
shadow.inner
shadow.focus
blur.sm
blur.md
```

## Text style naming

Text styles are named by **purpose**:

```
✅  Display/XL
✅  Display/L
✅  Display/M
✅  Heading/H1
✅  Heading/H2
✅  Heading/H3
✅  Body/Default
✅  Body/Default/Emphasis     (semibold variant)
✅  Body/Small
✅  Caption
✅  Data/Cell                (14px Plex Sans, tabular nums)
✅  Data/Header              (13px Plex Sans 600, tabular nums)
✅  Code/Default

❌  Plex Bold 24
❌  H1 Title Large
```

## Effect style naming

```
✅  Elevation/01            (= shadow.sm in light; border.thin in dark per Elevation Spec)
✅  Elevation/02            (= shadow.md in light; border.medium in dark)
✅  Elevation/03            (= shadow.lg in light; border.thin + subtle inner glow in dark)
✅  Focus Ring/Default      (= border.medium + color.border.focus + shadow.focus)
✅  Inner/Subtle            (= shadow.inner)

❌  Drop Shadow 4px
❌  Shadow Big
```

## Frame & section naming on pages

Within a page (e.g. on the Button components page), use clear sections:

```
Button — Overview
Button — Sizes
Button — Styles
Button — States
Button — With Icons
Button — In Light Mode / In Dark Mode
```

This makes the file scannable from the layers panel and helps anyone landing on the page orient quickly.

## Icon naming

Compass uses **lucide-react** as the icon library (declared in `apps/vs1-demo/ui/components.json`). When importing icons into the C360 Design System file:

- Set: `Compass/Icon/{name}` (e.g. `Compass/Icon/Plus`, `Compass/Icon/ChevronRight`, `Compass/Icon/ShieldCheck` for Verified-Partner)
- Naming: lowercase-kebab in code (lucide convention), PascalCase in Figma (`ChevronRight`, `ShieldCheck`)
- Sizes as variants: `size: 16 | 20 | 24` (pixels)
- Style as variant if relevant: `style: outline | filled` (lucide is outline-default — most icons stay outline)

## Anti-patterns to flag immediately

- Components without the `Compass/` namespace
- Variants like `primary-large-disabled-icon` (combinatorial)
- Variables with hex codes in names (`color.097070`)
- Layer names like `Frame 12`, `Rectangle 4`, `Group 7`
- Variants named after appearance (`petrol`, `gold`, `tall`)
- Text styles named after their typeface settings (`Plex Bold 16`)
- Gold under `color.feedback.*` or `color.action.*` namespaces (Gold belongs only in `color.brand.partnerBadge.*` and `partner.*` component tokens)
- Effect styles using raw shadow values instead of `Elevation/0X` semantic styles

When you see these in the C360 Design System file, suggest a rename — but only act after user confirms (renames can break instances of legacy work).

## When to deviate

Rules exist for clarity. If a particular convention obscures rather than clarifies in a specific case, propose the deviation explicitly with reasoning. Then capture the deviation in `references/naming-conventions.md` so the team learns from it.
