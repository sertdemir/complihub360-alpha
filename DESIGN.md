# DESIGN.md — CompliHub360 Design System
### Version 1.0 · The Digital Jurist

> **Creative North Star:** *The Digital Jurist* — Software as an authority, not a tool. The interface feels like a high-end, bespoke legal folio — clean, spacious, and intellectually rigorous. It rejects the "SaaS template" in favour of editorial precision and deliberate spatial confidence.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing Scale](#4-spacing-scale)
5. [Border Radius](#5-border-radius)
6. [Elevation & Shadows](#6-elevation--shadows)
7. [Border & Divider Rules](#7-border--divider-rules)
8. [Breakpoints](#8-breakpoints)
9. [Component Guidelines](#9-component-guidelines)
   - [Buttons](#91-buttons)
   - [Cards](#92-cards)
   - [Input Fields](#93-input-fields)
   - [Chips & Tags](#94-chips--tags)
   - [Alerts & Notices](#95-alerts--notices)
   - [Navigation (GlobalNav)](#96-navigation-globalnav)
   - [Sidebar](#97-sidebar)
   - [Wizard Shell](#98-wizard-shell)
   - [Progress Indicator](#99-progress-indicator)
10. [Layout Patterns](#10-layout-patterns)
11. [Icons](#11-icons)
12. [Animation & Motion](#12-animation--motion)
13. [Do's & Don'ts](#13-dos--donts)

---

## 1. Design Philosophy

### The "No-Line" Rule ⚠️ (Critical)
**Explicit prohibition: do not use 1px solid borders for layout sectioning or containment.**

Boundaries are defined exclusively through:
- **Background color shifts** (e.g. `surface-container-low` sidebar adjacent to `surface` main area)
- **Negative space** — whitespace is the primary structural element
- **Tonal layering** — stacking surface tokens to imply depth

The only permitted borders are:
- Ghost borders (`outline-variant` at 15–20% opacity) for interactive focus states
- Accent bars (4px left bar) on selected/active cards for emphasis

### Surface Architecture
Think of the UI as a stack of premium cardstock:

| Layer | Token | Color | Usage |
|---|---|---|---|
| Foundation / Desk | `surface` | `#f8faf7` | Page background, main canvas |
| Folder | `surface-container` | `#eceeeb` | Section separators, secondary areas |
| Container Low | `surface-container-low` | `#f2f4f1` | Sidebar, nav rail backgrounds |
| Container High | `surface-container-high` | `#e7e9e6` | Utility bars, secondary drawers |
| Container Highest | `surface-container-highest` | `#e1e3e0` | Input field backgrounds |
| Active Page / Card | `surface-container-lowest` | `#ffffff` | Cards, modals, active surfaces |
| Dim | `surface-dim` | `#d8dbd8` | Overlays, disabled states |

### Glassmorphism Rule
Floating elements (modals, dropdowns, hover cards, floating bars) **must** use glassmorphism:
- Background: `#ffffff` at **80% opacity**
- Backdrop blur: **16–24px**
- Border: `outline-variant` at **20% opacity**
- This allows the deep teal or gold accents to bleed through, softening the UI

---

## 2. Color System

### Primary — Teal / Forest

| Token | Hex | Usage |
|---|---|---|
| `primary-50` | `#E8F5E9` | Very light tint, info bg backgrounds |
| `primary-100` | `#C8E6C9` | Light hover states, selected chip bg |
| `primary-200` | `#A5D6A7` | — |
| `primary-300` | `#81C784` | — |
| `primary-400` | `#66BB6A` | — |
| **`primary-500`** | **`#004D40`** | **Primary actions, active nav links, selected states** |
| `primary-600` | `#003E33` | Button hover state |
| `primary-700` | `#002E26` | Button pressed state |
| `primary-800` | `#001F1A` | — |
| `primary-900` | `#000F0D` | — |

> **Note for Stitch / brand use:** The brand primary as expressed in Stitch is `#097171` (teal) as `primary_container` with `#005757` as `primary`. The Tailwind `primary-500` (`#004D40`), `primary_container` (#097171), and `primary` (#005757) coexist — use context to determine which. For UI components use the Tailwind tokens. For brand identity materials use `#097171`.

### Accent / Gold

| Token | Hex | Usage |
|---|---|---|
| `accent-500` | `#D4AF37` | ⚠️ RESERVED — risk indicators, "Precision" action highlights only |
| `accent-400` | `#E6A514` | Warning states |
| `accent-300` | `#F4C44A` | Warning bg tint |
| `accent-100` | `#FBEBBA` | Warning surface |
| `accent-50` | `#FDF8E6` | Warning bg lightest |

> **Gold Rule:** Gold is a functional color, not a decorative one. It signals one thing: **attention required**. Using it for aesthetics destroys its communicative power. If you are tempted to use gold for a hero gradient or illustration, resist.

### Neutral / Slate

| Token | Hex | Usage |
|---|---|---|
| `neutral-50` | `#FAFAFA` | — |
| `neutral-100` | `#F4F4F5` | Light hover on white |
| `neutral-200` | `#E5E7EB` | Ghost border fallback |
| `neutral-300` | `#D4D4D8` | Disabled input bg |
| `neutral-400` | `#A1A1AA` | Placeholder text |
| `neutral-500` | `#71717A` | Secondary/muted text |
| `neutral-600` | `#5F5A5A` | Caption labels |
| `neutral-700` | `#3F3F46` | Body text secondary |
| `neutral-800` | `#27272A` | — |
| `neutral-900` | `#0F172A` | — |
| `neutral-950` | `#18181B` | Near-black text (use `on_surface` = `#191c1b` instead) |

### Semantic Colors

| Token | Hex | bg Hex | Usage |
|---|---|---|---|
| `success-500` | `#10B981` | `#D1FAE5` | Confirmed states, completed steps |
| `warning-500` | `#F59E0B` | `#FEF3C7` | Advisory notices |
| `error-500` | `#EF4444` | `#FEE2E2` | Critical errors, blocking issues |

### Text Colors

| Role | Value | Notes |
|---|---|---|
| Primary text | `#191c1b` | Never use pure `#000000` |
| Secondary text | `neutral-500` `#71717A` | Subtitles, metadata |
| Muted / Caption | `neutral-600` `#5F5A5A` | Labels above sections |
| Disabled | `neutral-400` `#A1A1AA` | Input placeholders |
| On primary (button text) | `#ffffff` | — |
| Link | `primary-500` `#004D40` | Underline on hover |

### Special Surfaces

| Name | Hex | Usage |
|---|---|---|
| `brand-surface` | `#E8F5E9` | Hero/feature section wash |
| `warm-grey` | `#EFE8E8` | Warm neutral section bg |
| `soft-blue` | `#C3DDDC` | Subtle teal tint areas |

---

## 3. Typography

### Font Families

| Role | Family | Tailwind class | When to use |
|---|---|---|---|
| **Serif / Display** | IBM Plex Serif | `font-serif` | All page titles, wizard headlines, editorial section headers, data summaries, KPI numbers |
| **Sans / UI** | Inter | `font-sans` | All UI elements, labels, navigation, body copy, inputs, buttons, captions |

> **Rule: Never use IBM Plex Serif for interactive UI.** Serif = reading, Inter = doing.

### Type Scale

| Name | Size | Line height | Letter spacing | Class | Usage |
|---|---|---|---|---|---|
| `display` | `3.5rem / 56px` | 1.2 | — | `text-display font-serif` | Landing hero headline only |
| `h1` | `2.25rem / 36px` | 1.2 | — | `text-h1 font-serif` | Page title (one per page) |
| `h2` | `1.75rem / 28px` | 1.2 | — | `text-h2 font-serif` | Section headers, wizard step titles |
| `h3` | `1.25rem / 20px` | 1.2 | — | `text-h3 font-sans font-semibold` | Card titles, sidebar headers |
| `body` | `1rem / 16px` | 1.6 | — | `text-body font-sans` | All body copy, descriptions |
| `ui-small` | `0.875rem / 14px` | 1.4 | — | `text-ui-small font-sans` | UI labels, input text, chip labels |
| `caption` | `0.875rem / 14px` | 1.4 | `0.04em` | `text-caption font-sans uppercase tracking-wider` | Section super-labels (e.g. "WHERE IS YOUR DATA?"), metadata |

### Font Weights in Use

| Weight | Value | Usage |
|---|---|---|
| Regular | 400 | Body copy, descriptions |
| Medium | 500 | UI labels, navigation links |
| Semibold | 600 | Card titles (sans), emphasis |
| Bold | 700 | Buttons, active nav items |

### Typography Rules
- **All headings use IBM Plex Serif** (`font-serif`) unless they are inside a functional component (table header, input label, button) — then use Inter
- **Caption super-labels** are always `ALL CAPS` with `tracking-wider` (4% letter-spacing): they signal metadata, not content
- **Numbers in data visualizations** use IBM Plex Serif to give a "financial report" authority
- **Line length:** Body copy max `680px` wide. Use `max-w-2xl` or `max-w-prose`

---

## 4. Spacing Scale

The scale is based on a **4px base unit (Token 1 = 4px)**:

| Token | px | Tailwind | Usage |
|---|---|---|---|
| `1` | `4px` | `p-1`, `gap-1` | Micro gaps between chips, icon padding |
| `2` | `8px` | `p-2`, `gap-2` | Compact internal card padding, icon-to-text gaps |
| `3` | `12px` | `p-3`, `gap-3` | Notice/alert internal padding |
| `4` | `16px` | `p-4`, `gap-4` | Standard component padding, item separation in lists |
| `5` | `20px` | `p-5`, `gap-5` | Card internal padding (body) |
| `6` | `24px` | `p-6`, `gap-6` | Card internal padding (generous), section between elements |
| `7` | `32px` | `p-7`, `gap-7` | Section separation within a page |
| `8` | `40px` | `p-8`, `gap-8` | Major section padding, page horizontal padding |
| `10` | `64px` | `p-10` | Between major page sections |
| `12` | `96px` | `p-12` | Hero / landing page vertical padding |

> **Over-space rule:** If a section feels "full", add one more spacing token. White space = authority. Breathing room = trust.

### Standard Padding Patterns

| Context | Padding |
|---|---|
| Page content area (dashboard) | `pl-6 pr-8 py-8` |
| Card | `p-5` or `p-6` |
| Alert / Notice | `px-4 py-3` |
| Button (primary) | `px-6 py-2.5` |
| Button (small) | `px-4 py-1.5` |
| Input field | `px-4 py-3` |
| Nav header inner container | `pl-4 pr-8 py-4 lg:py-6` |

---

## 5. Border Radius

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `xs` | `2px` | `rounded-xs` | Status indicator dots, thin bars |
| `sm` | `4px` | `rounded-sm` | Small badges, secondary chips |
| `md` | `8px` | `rounded-md` | **Cards** (default card radius) |
| `lg` | CSS var `--radius` | `rounded-lg` | ~10px — step indicators, general purpose |
| `xl` | `16px` | `rounded-xl` | Large modal corners, major containers |
| `pill` | `9999px` | `rounded-pill` | Status badges, count chips |

### Radius Assignment by Component

| Component | Radius |
|---|---|
| Cards | `8px` (`rounded-md`) |
| Buttons (primary, secondary) | `12px` (use `rounded-xl` at 16px or set explicitly as `rounded-[12px]`) |
| Input fields | `8px` (`rounded-md`) |
| Chips / Multi-select | `8px` (`rounded-md`) |
| Modals | `16px` (`rounded-xl`) |
| Tooltips | `6px` |
| Status badges | `9999px` (`rounded-pill`) |
| Accent left bar | `2px` (`rounded-xs`) on left side only |

> ⚠️ **Do not use pill-shaped buttons.** Buttons are `12px` radius. Pills (`9999px`) are reserved for status badges only. Pill buttons diminish the "Jurist" authoritative tone.

---

## 6. Elevation & Shadows

Shadows are tinted, ultra-diffused, and used sparingly. Depth is achieved primarily through **tonal surface shifts**, not shadows.

| Token | CSS Value | Tailwind | When to use |
|---|---|---|---|
| `shadow-xs` | `0px 1px 2px rgba(0,0,0,0.04)` | `shadow-xs` | Hover state on flat elements |
| `shadow-sm` | `0px 2px 6px rgba(0,0,0,0.06)` | `shadow-sm` | Cards on white surface |
| `shadow-md` | `0px 6px 16px rgba(0,0,0,0.08)` | `shadow-md` | Dropdowns, selected state cards |
| `shadow-lg` | `0px 12px 32px rgba(0,0,0,0.10)` | `shadow-lg` | Modals, floating action panels |

### Ambient Shadow (Preferred for Cards)
For elevated elements (active state cards, featured tiles):
```css
box-shadow: 0px 8px 32px rgba(25, 28, 27, 0.04);
```
Use the `on_surface` color (`#191c1b`) tinted at 4% — never pure gray shadows.

### No Shadow Zones
- Navigation sidebar (define boundary by background shift only)
- Layout containers / page sections
- Divider replacements

---

## 7. Border & Divider Rules

### Permitted Uses of Borders

| Use case | Specification |
|---|---|
| **Focus ring** on inputs | `outline: 2px solid rgba(#097171, 0.4)` — Ghost border, never full opacity |
| **Selected card accent** | `4px solid #097171` left border only (`border-l-4 border-primary-500`) |
| **Ghost separator** (last resort) | `outline_variant` (`#bec9c8`) at **15% opacity max** |
| **Glassmorphism container** | `border: 1px solid rgba(255,255,255,0.5)` — white glass border only |

### Prohibited Uses

- ❌ `border border-gray-200` on cards to "contain" them — use surface level shift instead
- ❌ `border-b` to separate list items — use `gap-4` / `py-4` whitespace instead
- ❌ `<hr>` or `divider` components inside cards — use spacing `pt-8` for section separation
- ❌ Table row borders (`border-b border-gray-100`) — use alternating `surface-container-low` rows

---

## 8. Breakpoints

| Name | px | Tailwind prefix | Notes |
|---|---|---|---|
| `sm` | `320px` | `sm:` | Small mobile |
| `mobile-m` | `375px` | `mobile-m:` | Standard iPhone |
| `mobile-l` | `414px` | `mobile-l:` | Large iPhone |
| `tablet` | `768px` | `tablet:` | iPad |
| `desktop-s` | `1024px` | `desktop-s:` | Small laptop |
| `desktop-m` | `1280px` | `desktop-m:` | Standard desktop |
| `desktop-l` | `1440px` | `desktop-l:` | Layout max-width container |
| `desktop-xl` | `1920px` | `desktop-xl:` | UltraWide, no layout changes |

### Max-Width Container Strategy
- **Page layout container:** `max-w-[1440px] mx-auto` — dashboard and header always use this
- **Content width (inside dashboard):** natural flex-1, no max-width (fills available space after sidebar)
- **Reading content / landing text blocks:** `max-w-prose` or `max-w-2xl`
- Never use `max-w-7xl` (1280px) as a general container — use `max-w-[1440px]` consistently

---

## 9. Component Guidelines

### 9.1 Buttons

#### Primary Button
```
Background: linear-gradient(135°, #005757, #097171)
Text: #ffffff · Font: Inter Semibold · Size: 14px
Radius: 12px
Padding: px-6 py-2.5
Hover: darken 8% (background-color: #004f4f)
Active: darken 15%
Disabled: opacity-40, cursor-not-allowed
```

**Tailwind example:**
```tsx
<button className="bg-primary-500 hover:bg-primary-600 text-white font-semibold text-ui-small px-6 py-2.5 rounded-[12px] transition-colors">
  Weiter →
</button>
```

#### Secondary / Ghost Button
```
Background: transparent
Text: primary-500 (#004D40) · Font: Inter Medium · Size: 14px
Radius: 12px
Padding: px-6 py-2.5
Hover: bg-neutral-100/80
Border: none (no border — ghost style)
```

#### Tertiary / Text Button
```
Background: transparent
Text: primary-500 underline
Font: Inter Medium · Size: 14px
No padding, no background, no radius
Usage: "Überspringen", "Alle ansehen →"
```

#### Danger Button
```
Background: error-500 (#EF4444)
Text: #ffffff
Usage: destructive actions only (delete, revoke)
```

---

### 9.2 Cards

Cards are the primary unit of information display.

#### Standard Card
```
Background: #ffffff (surface-container-lowest)
Placed on: surface (#f8faf7) or surface-container (#eceeeb)
Radius: 8px (rounded-md)
Padding: p-5 or p-6
Shadow: none (use tonal lift instead), or shadow-xs on hover
Border: NONE — no border-* classes
```

#### Active / Selected Card
```
All standard card styles +
Left accent bar: border-l-4 border-primary-500 (4px left only)
Background: #ffffff
Shadow: 0px 8px 32px rgba(25,28,27,0.04) (ambient)
```

#### Tile / Feature Card
```
Background: surface-container-low (#f2f4f1)
Radius: 8px
Padding: p-6
Usage: sidebar items, secondary info tiles
```

#### No-Divider Rule in Cards
- ❌ No `<hr>` inside cards
- ❌ No `border-t` or `border-b` for internal sections
- ✅ Use `pt-8` for section separation within a card
- ✅ Use background shift (`bg-surface-container-low`) for nested sub-sections

---

### 9.3 Input Fields

```
Background: surface-container-highest (#e1e3e0)
Radius: 8px (rounded-md)
Padding: px-4 py-3
Border: none (default state)
Font: Inter Regular 16px
Color: #191c1b
Placeholder: neutral-400 (#A1A1AA)

Focus state:
  Background: #ffffff (surface-container-lowest)
  Outline: 2px solid rgba(#097171, 0.4) — Ghost border at 40% opacity
  No full-opacity borders

Disabled:
  Background: neutral-200 (#E5E7EB)
  Text: neutral-400
  Opacity: 0.6
```

#### Dropdown / Select
Same as text input. Use `rounded-md`. Dropdown panel: glassmorphism background (white 80%, backdrop-blur-xl, border rgba(255,255,255,0.5)).

#### Search Field
```
Background: surface-container-highest
Icon: leading icon (magnifying glass) in neutral-400
Placeholder: "Suchen..."
Same focus/radius rules as input
```

---

### 9.4 Chips & Tags

#### Multi-Select Chip (Wizard Questions)
```
Default:
  Background: surface-container-high (#e7e9e6)
  Radius: 8px
  Padding: px-3 py-1.5
  Font: Inter Medium 14px
  Color: neutral-700

Selected:
  Background: primary-500 (#004D40)
  Text: #ffffff
  Shadow: shadow-xs

Icon: 18px, leading the label, neutral-500 default / white selected
```

#### Status Badge / Tag
```
Radius: 9999px (pill)
Padding: px-2.5 py-0.5
Font: Inter Semibold 12px (caption weight)

Status variants:
  success:   bg-success-bg (#D1FAE5)   · text-success-700 (#047857)
  warning:   bg-warning-bg (#FEF3C7)   · text-warning-700 (#B45309)
  error:     bg-error-bg   (#FEE2E2)   · text-error-700   (#B91C1C)
  neutral:   bg-neutral-100            · text-neutral-700
  primary:   bg-primary-50             · text-primary-500
```

---

### 9.5 Alerts & Notices

Alerts are contextual information tiles. They use background color to communicate severity without 1px borders (Ghost border fallback only if necessary).

#### Info Notice (Teal)
```
Background: primary-50 (#E8F5E9) or surface-container-low
Left accent bar: 4px · primary-500
Radius: 8px
Padding: px-4 py-3
Icon: 18px · primary-500
Font: Inter Regular 12px · text-primary-900
```

#### Warning Notice (Gold)
```
Background: accent-50 (#FDF8E6) or accent-100
Left accent bar: 4px · accent-400 (#E6A514)
Icon: warning · accent-500
Font: Inter Regular 12px
```

#### Error / Critical Alert
```
Background: error-bg (#FEE2E2)
Left accent bar: 4px · error-500 (#EF4444)
Icon: error · error-500
Font: Inter Regular 12px · text-error-700
Label: "Sofortiger Handlungsbedarf" or "Kritisch" badge
```

#### Success Notice
```
Background: success-bg (#D1FAE5)
Left accent bar: 4px · success-500
Icon: check_circle · success-500
Font: Inter Regular 12px · text-success-700
```

---

### 9.6 Navigation (GlobalNav)

```
Position: fixed top-0 inset-x-0 z-50
Background: rgba(#ffffff, 0.4) · backdrop-blur-xl
Border-bottom: 1px solid rgba(#ffffff, 0.5) [glassmorphism border — PERMITTED]
Shadow: box-shadow: 0px 4px 32px rgba(0,0,0,0.08)

Inner container:
  max-w-[1440px] mx-auto
  padding: pl-4 pr-8 py-4 lg:py-6
  Height: always consistent (enforce h-10 on actions area)

Logo:
  Left: CompliHub360 with circular dot icon (primary-500)
  Font: Inter Bold 14px

Nav links (center):
  Inter Medium 14px · neutral-700
  Hover: primary-500
  Active page: primary-500 font-semibold

Actions (right):
  Logged out: "Log in" ghost button + "Sign up" primary button
  Logged in: Avatar circle (initials, primary-500 bg) + dropdown menu

Dropdown menu: glassmorphism (white 80%, backdrop-blur-xl)
```

**HIDDEN on:** `/login`, `/register`, `/verify-email`
**VISIBLE on:** All other routes, including dashboard routes

---

### 9.7 Sidebar

#### Dashboard Sidebar
```
Position: sticky top-16 (accounts for 64px nav height)
Height: h-[calc(100vh-4rem)]
Width: w-64 (256px)
Background: #ffffff
Right border: NONE — use layout positioning only
Z-index: z-10

Nav Links:
  Icon + label layout
  Default: neutral-600 text, neutral-100 hover bg
  Active: primary-500 text + bg-primary-50 background
  Radius: rounded-md (8px) on the link container
  Padding: px-3 py-2

Bottom section:
  Logout button: ghost style, text-error-500, flex items-center gap-2
```

#### Wizard Left Sidebar
```
Width: ~240px
Background: surface-container-low (#f2f4f1)
Padding: p-6
Content: category icon + title + step context summary
No border-right
```

---

### 9.8 Wizard Shell

The wizard is CompliHub360's primary onboarding/assessment experience.

```
Layout:
  - GlobalNav fixed at top
  - Below nav: flex row
    - Left sidebar (~240px): category context, mini-summary of selections
    - Main content (flex-1): step content
  - Footer: action buttons, always sticky to bottom of viewport

Progress indicator: top of main content area
Step content: scrollable

Padding (main content): pl-8 pr-8 py-8 desktop-s:pl-10
Max content width: max-w-2xl (for readability) or max-w-3xl (for card grids)
```

---

### 9.9 Progress Indicator

```
Layout: horizontal step list, top of wizard main area
Items: numbered circle (24px) + label

Default step:
  Circle: neutral-200 bg · neutral-500 text
  Label: neutral-500 · caption size

Active step:
  Circle: primary-500 bg · white text
  Label: primary-500 · font-semibold

Completed step:
  Circle: success-500 bg · white checkmark icon
  Label: neutral-700

Connector line between steps:
  PROHIBITED: do not use colored 1px lines
  Use: 2px height gap/dash in neutral-200, or negative space only
```

---

## 10. Layout Patterns

### Dashboard Layout
```
html/body: min-h-screen bg-surface (#f8faf7)

Structure:
  <GlobalNav /> (fixed, z-50)
  <div pt-16>        ← offset for nav height
    <div max-w-[1440px] mx-auto flex>
      <DashboardSidebar />   (sticky, w-64)
      <main flex-1 overflow-y-auto>
        <div pl-6 pr-8 py-8>
          {children}
        </div>
      </main>
    </div>
  </div>
```

### Public Pages (Landing, Solutions, etc.)
```
Structure:
  <GlobalNav />
  <main>
    <section max-w-[1440px] mx-auto px-6 lg:px-10>
      ...content...
    </section>
  </main>
```

### Two-Column Editorial Layout
```
Left column (editorial/context): ~40% width, IBM Plex Serif headlines
Right column (interactive/data): ~60% width, Inter UI
Gap: gap-8 lg:gap-12
```

---

## 11. Icons

**Library:** Google Material Symbols (Outlined weight)

```html
<span class="material-symbols-outlined">icon_name</span>
```

| Context | Size | Color |
|---|---|---|
| Navigation sidebar | 20px | current text color |
| Card icon (large) | 24px | category accent color |
| Alert icon | 18px | semantic color (success/warning/error) |
| Button icon | 18px | inherits button text color |
| Inline text icon | 16px | neutral-500 |

**Never:** use filled Material Icons variants — Outlined only. Never scale icons > 32px in UI (illustrations are separate).

---

## 12. Animation & Motion

### Principles
- Motion is purposeful — it conveys state change, not decoration
- Duration: fast interactions 150ms, standard 200ms, complex transitions 300ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` for standard, `ease-out` for entrances

### Standard Transitions

| Element | Animation | Duration |
|---|---|---|
| Button hover | `transition-colors` | 150ms |
| Card hover | `transition-shadow` + subtle `translate-y-[-1px]` | 200ms |
| Dropdown open | `fade + scale-y from 0.95` | 200ms ease-out |
| Wizard step change | `fade + translateX (±20px)` | 250ms ease-in-out |
| Page route change | `fade opacity 0→1` | 200ms |
| Alert entrance | `slide-in-from-top + fade` | 300ms |
| Chip select | `background transition-colors` | 150ms |

### Framer Motion Usage
Use `AnimatePresence` for wizard step transitions and conditional UI:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={step}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.25, ease: 'easeInOut' }}
  >
    {stepContent}
  </motion.div>
</AnimatePresence>
```

---

## 13. Do's & Don'ts

### ✅ Do

| Rule | Rationale |
|---|---|
| Use IBM Plex Serif for all page titles and wizard headlines | Conveys "Digital Jurist" authority and editorial trustworthiness |
| Define boundaries via background shifts (surface tokens) | Preserves the "no-line" premium look |
| Over-space everything: when in doubt, add more whitespace | White space IS the product — it signals confidence |
| Use tinted, ultra-diffuse shadows at 4–8% opacity | Avoids "dirty" gray shadows that cheapen the UI |
| Align headlines to the far left, body to a reading column | Creates "intentional asymmetry" — editorial authority |
| Use gold (#FACC15 / #eec200) only for risk and precision actions | Preserves its communicative power via scarcity |
| Use `max-w-[1440px] mx-auto` for all layout containers | Consistent alignment everywhere on all pages |
| Enforce `h-10` on the GlobalNav actions area | Prevents height shift between logged-in/out states |
| Use `sticky top-16` for the dashboard sidebar | Keeps sidebar in flow; avoids left-edge visual jump |

### ❌ Don't

| Anti-pattern | Why it fails |
|---|---|
| `border border-gray-200` on cards | Looks like a generic SaaS template, breaks "no-line" rule |
| `border-b` in lists / `<hr>` in cards | Adds visual noise, contradicts editorial spaciousness |
| Pure `#000000` for any text | Breaks the "ink on paper" softness; always use `#191c1b` |
| Pill-shaped buttons (`rounded-full`) | Too playful, diminishes authoritative "Jurist" tone |
| Gold as decoration (gradients, illustrations) | Destroys its warning/precision signal |
| `mx-auto` centering with asymmetric padding | Creates logo jump when switching pages — use consistent padding |
| `fixed` sidebar with `ml-64` on content | Caused logo alignment issues; use `sticky` in `flex` layout instead |
| IBM Plex Serif for buttons or input labels | Mixing reading-type into functional UI breaks hierarchy |
| Multiple border radii on one element (`rounded-t-md rounded-b-lg`) | Unnecessary complexity; use single radius token |
| `max-w-7xl` instead of `max-w-[1440px]` | Inconsistent container width creates visual misalignment |

---

## Appendix: Quick Token Reference

```css
/* Core color constants */
--brand-primary:       #004D40;  /* primary-500 */
--brand-primary-ctr:   #097171;  /* teal variant, Stitch brand */
--brand-gold:          #D4AF37;  /* accent-500, warnings only */
--surface-base:        #f8faf7;
--surface-card:        #ffffff;
--text-primary:        #191c1b;

/* Layout */
--nav-height:          64px;     /* pt-16 */
--sidebar-width:       256px;    /* w-64 */
--layout-max-width:    1440px;   /* max-w-[1440px] */
--content-padding-l:   24px;     /* pl-6 */
--content-padding-r:   32px;     /* pr-8 */

/* Radius */
--radius-card:         8px;      /* rounded-md */
--radius-button:       12px;     /* rounded-[12px] */
--radius-badge:        9999px;   /* rounded-pill */

/* Typography */
--font-heading:        'IBM Plex Serif', serif;
--font-ui:             'Inter', sans-serif;
```
