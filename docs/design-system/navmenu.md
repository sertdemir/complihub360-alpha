# NavMenu — Compass component spec

**Status:** done. Built in code (`components/ui/NavMenu.tsx`), mirrored into Figma, all three call sites migrated.
**Compass page:** `⌄ Nav Menu` — three component sets, 20 variants, plus a documentation canvas.
The spec said 🧩 Navigation; the file's actual convention is one emoji-prefixed page per component
(🔘 Button, 🍞 Breadcrumb, ⚠️ Risk Badge), so it follows that instead.
**Trigger:** the eight compliance areas needed a header entry point (`Navigation Architecture.md` calls for
a Solutions dropdown with domain children). PR #72 shipped the area pages without it, deliberately.

## What was built, and where it differs from this spec

Three changes came out of building it:

- **A `panel` property was needed.** The spec assumed one floating panel. The areas menu is a full-width
  sheet under the header (the Mercury pattern), and four languages in a full-bleed sheet would be absurd —
  so `panel: 'sheet' | 'popover'` carries both, and all three call sites fit.
- **`Item` gained `description`.** The spec had label, icon and meta. A one-line description under each
  label is what makes the sheet worth opening; it renders `compliance.<slug>.headline`, the same line the
  area's own page opens with, so the menu cannot promise something the destination does not say.
- **Closing on focus-out.** Not in the spec and it should have been: tabbing past the last link left the
  panel open behind the focused element. Covered by the contract test now.

`GlobalNav` carried a mega-panel with icon, title and description already — but every `HEADER_MENU` entry
had `items: []`, so it never rendered. That dead markup is gone; its panel items were buttons rather than
links, the same defect this component exists to fix. (It outlived the PR that claimed to remove it by one
round: only the removal of the *type* landed. Its one live consequence was that the header links never lit
up, because `activeMenu` could not be set and the active check was permanently false. They light up from
the URL now.)

## What the Figma mirror could not do

Two honest gaps, both recorded rather than papered over:

- **The leading icon is not an `INSTANCE_SWAP` property.** `addComponentProperty(…, 'INSTANCE_SWAP', key)`
  rejects the key of a *variant* inside the Icon component set, which is the only form the Compass icons
  come in. The icon stays a plain nested instance, which Figma lets you swap directly — one click instead
  of a dropdown, and no variant explosion. The component description says so.
- **No separate dark-mode boards.** Every fill, stroke and radius is bound to a Color variable, and that
  collection carries Light and Dark modes, so the component follows the page mode. Drawing a second set of
  boards would duplicate what the variables already do, and duplicated boards drift.

---

## 1. The finding that justifies the component

The dropdown-panel pattern already exists **three times** in the codebase, each incomplete in a different way.
This is the real argument for systematising it — not the header dropdown alone.

| Implementation | Semantics | Arrows | Home/End | Escape | Focus return | Click-outside |
|---|---|---|---|---|---|---|
| `MarketingHeader` → `LanguageMenu` | `role="menu"` + `<a role="menuitem">` | — | — | — | — | ✓ |
| `compliance-areas/AreaSwitcher` | `role="menu"` + `<button role="menuitem">` | — | — | ✓ | ✓ | ✓ |
| `ui/SelectMenu` | `role="listbox"` + `role="option"` | ✓ | ✓ | ✓ | ✓ | ✓ |

Two of the three announce a keyboard interface they do not honour. A screen reader entering `LanguageMenu`
is told it is in a menu and then finds no menu navigation at all — worse than an unlabelled `<div>`, because
the promise is explicit.

`SelectMenu` is the one that is complete on these five columns — which is what made it the right target for
the `CountrySelector` migration. It was not flawless: moving that call site onto it surfaced three ARIA
defects the table above does not have a column for, all now fixed and held by a contract test. See section 3.

---

## 2. Why this is not just "use SelectMenu"

`SelectMenu` is a **value picker**: `role="listbox"`, options are `role="option"`, and choosing one sets a
value. That is the correct semantics for a form control and the wrong semantics for navigation.

A navigation dropdown does not select a value. It reveals a set of destinations, and activating one performs
a page navigation. The distinction is not academic — it decides whether the items are real links:

- As `role="option"` or `role="menuitem"`, the item stops being announced as a link. The screen-reader
  "list all links" affordance loses it, and so does middle-click / cmd-click / "open in new tab" /
  right-click-copy-address.
- The eight area pages are indexable destinations with their own URLs. Stripping their link semantics in the
  one navigation control that points at them would be a self-inflicted wound.

**Decision: NavMenu is a disclosure, not a menu.** A trigger button with `aria-expanded` + `aria-controls`,
revealing a plain `<ul>` of real `<a>` elements. This follows the ARIA Authoring Practices recommendation
that site navigation use the disclosure pattern rather than `role="menu"`, which is intended for
application menus (File / Edit) where items are commands, not destinations.

Consequence: **both existing `role="menu"` usages are wrong** and get corrected by migrating to NavMenu.

---

## 3. Scope — three call sites, two components

| Call site | Today | Should become | Why |
|---|---|---|---|
| Header "Compliance areas" | ~~does not exist~~ | **NavMenu** sheet — done | eight destinations, real links |
| `MarketingHeader` → `LanguageMenu` | hand-rolled `role="menu"` | **NavMenu** popover — open | same shape, same defect, four destinations |
| `AreaSwitcher` (area pages) | hand-rolled `role="menu"` | **NavMenu** popover — open | same shape, eight destinations |
| `CountrySelector` (compliance areas) | ~~hand-rolled `role="listbox"`~~ | **`SelectMenu`** — done, PR #72 | it picks a value; it was a duplicate of an existing component |

### The `CountrySelector` finding — resolved in #72

This was a correction to my own work: the full listbox keyboard contract implemented by hand, when
`SelectMenu` already had all of it plus an `icon` slot the flag drops into. Migrated.

Worth recording, because the migration exposed three defects in `SelectMenu` itself that affect every
consumer, not just this one:

1. `aria-activedescendant` sat on the `<ul>`, which is `tabIndex={-1}` and never focused — so arrowing
   through the list announced nothing. It belongs on the trigger, which holds focus.
2. The trigger was a bare `<button>`. `aria-activedescendant` is defined for combobox/textbox/group/
   application, so with the attribute in its right place the trigger took `role="combobox"`.
3. Two instances without an explicit `id` both fell back to the literal `'sm'`, colliding option ids.
   `useId` namespaces them now. The area pages render exactly that case — the hero picker and the compact
   one in the switcher.

`SelectMenu.contract.test.tsx` holds all three. **This matters for NavMenu:** the plan below says to lift
the keyboard implementation from `SelectMenu.onKeyDown`. Lift the corrected one — the version before #72
would carry defect 1 straight into the new component.

---

## 4. Component API

Compositional, following the sub-component pattern — the panel's contents vary per call site (plain links
in the language menu, links with a risk dot in the area menu), so this is a structure, not a configuration.

```
Compass/NavMenu                 root — owns open state, keyboard, dismissal
Compass/NavMenu/Trigger         the button
Compass/NavMenu/Panel           the floating surface
Compass/NavMenu/Item            one destination
Compass/NavMenu/Footer          optional closing row ("All areas →")
```

### Root properties

| Property | Type | Values | Default | Notes |
|---|---|---|---|---|
| `align` | variant | `start` \| `end` | `start` | which trigger edge the panel aligns to; `end` for right-side header items like the language globe |
| `columns` | variant | `1` \| `2` | `1` | `2` for the eight areas; `1` for four languages |
| `size` | variant | `sm` \| `md` | `md` | `sm` = the compact area-page switcher |
| `panel` | variant | `sheet` \| `popover` | `popover` | `sheet` spans the header; `popover` floats beside the trigger |

Three properties on the root, orthogonal, well inside the six-property soft limit.

### Trigger properties

| Property | Type | Notes |
|---|---|---|
| `label` | text | e.g. "Compliance areas" |
| `icon` | instance swap | optional leading glyph (the globe, for language) |
| `isIconOnly` | boolean | icon-only trigger; requires `aria-label` in code |
| `isOpen` | boolean | Figma-only state mirror; in React it is internal state, not a prop |

### Item properties

| Property | Type | Notes |
|---|---|---|
| `label` | text | destination name |
| `icon` | instance swap | the area's lucide glyph |
| `meta` | instance swap | optional trailing slot — the risk `Badge` for areas, the `Check` for the current language |
| `isCurrent` | boolean | marks the destination you are already on; maps to `aria-current="page"` |

### React shape

```tsx
<NavMenu align="start" columns={2}>
  <NavMenu.Trigger label={t('header.nav.complianceAreas')} />
  <NavMenu.Panel>
    {AREAS.map(a => (
      <NavMenu.Item key={a.slug} href={`${localePrefix}/compliance/${a.slug}`} icon={<a.icon />}
                    meta={<Badge tone={…}>{severity}</Badge>} isCurrent={a.slug === current}>
        {title(a.slug)}
      </NavMenu.Item>
    ))}
    <NavMenu.Footer href={`${localePrefix}/compliance`}>{t('compliance.area.allAreas')}</NavMenu.Footer>
  </NavMenu.Panel>
</NavMenu>
```

`Item` renders `<a>` by default and accepts `as` for the router `<Link>`, so the app keeps client-side
navigation without the component depending on react-router.

---

## 5. Keyboard contract

Non-negotiable — this is the whole reason the component exists. Lift the implementation from
`SelectMenu.onKeyDown`, which already does this correctly for the listbox case.

**On the trigger**
| Key | Behaviour |
|---|---|
| `Enter` / `Space` | toggle; on open, focus the first item |
| `ArrowDown` | open and focus the first item |
| `ArrowUp` | open and focus the last item |

**Inside the panel**
| Key | Behaviour |
|---|---|
| `ArrowDown` / `ArrowUp` | move focus, wrapping at both ends |
| `ArrowLeft` / `ArrowRight` | with `columns={2}`, move across columns; otherwise inert |
| `Home` / `End` | first / last item |
| `Escape` | close, **return focus to the trigger** |
| `Tab` | close and let focus leave naturally — never trap |
| `Enter` | follow the link (native, no handler needed) |

Roving tabindex, not `aria-activedescendant`: with real links, focus should actually be on the `<a>` so the
browser reports the destination in the status bar and the native link affordances work.

**Dismissal:** click/tap outside, `Escape`, route change. A route change must close the panel — today's
`AreaSwitcher` closes it only because it unmounts on navigation, which is luck, not design.

---

## 6. Tokens and states

No hardcodes. All of these already exist.

| Element | Token |
|---|---|
| Panel surface | `bg-surface` |
| Panel border | `border-stroke` |
| Panel elevation (light) | `shadow-lg` — the modal/floating level per the Elevation v1 spec |
| Panel elevation (dark) | shadow replaced by a 1px lighter stroke, per the same spec's dark-mode rule |
| Panel radius | `rounded-xl` |
| Item, resting | `text-fg-secondary` |
| Item, hover | `bg-surface-secondary` |
| Item, keyboard focus | `border.medium` 2px + `color.border.focus` + `shadow.focus` — the Compass focus standard |
| Item, current page | `bg-brand-light/60`, `text-fg-brand`, `font-bold` |
| Trigger, open | `bg-surface-secondary` |

**Hit target:** items are ≥44px tall per the Compass accessibility standard, which is above the WCAG 2.2 AA
minimum of 24px. At `size="sm"` the visible row may be shorter only if padding still carries the 44px —
document the exception if it cannot.

**Focus ≠ hover.** Two of the three current implementations style hover and leave focus to the browser
default. The focus ring is specified above and is not optional.

---

## 7. Open decisions

These are genuinely open and want a call before anything is built.

**a) Hover-to-open in the desktop header?**
- *Click-only* (recommended) — one interaction model across pointer, touch and keyboard; nothing opens by
  accident while the pointer crosses the header. Costs one click.
- *Hover with intent delay* (~150ms in, ~300ms out) — faster for mouse users, familiar from large marketing
  sites. Costs a second code path, needs a touch fallback, and misfires on a diagonal pointer path.

**b) Mobile behaviour**
- *Reuse the off-canvas* (recommended) — the areas become a section inside the existing mobile panel; no
  floating panel on a 390px viewport. Fits `mobile-header-pill-nav.md`, which is already the canonical
  mobile pattern.
- *Same floating panel* — one component everywhere, but a 2-column panel at 390px is not a real option and
  it would need a `columns` override anyway.

**c) How much per item?**
- *Label + icon + risk badge* (recommended for areas) — the badge is the one piece of information that helps
  someone choose, and it is derived, so it cannot go stale.
- *Label only* — quieter, faster to scan, but the panel then says no more than the footer link does.

---

## 8. Why not a one-off in the screen file

PR #72 stopped at this boundary on purpose. A `NavMenu` built inside `MarketingHeader.tsx` would have
shipped the eight areas a day earlier and left a fourth incomplete implementation of the same pattern —
the exact way the three in section 1 came about. The hub grid, the footer column and the lateral switcher
carry the navigation until this exists, which is a real cost, and a smaller one than the alternative.

---

## 9. Figma description (paste into the component)

```
NavMenu

A disclosure dropdown for site navigation: a trigger button reveals a panel of destinations.

When to use
- Header navigation with more destinations than the bar can hold (the eight compliance areas)
- A lateral switcher between sibling pages (area pages, market pages)
- Any control where choosing an item navigates rather than sets a value

When not to use
- Picking a value in a form → use SelectMenu (role=listbox)
- Typeahead over a long list → use Combobox
- Application commands (File / Edit) → a true role=menu widget, which this is not
- Two or three destinations that fit in the bar → put them in the bar

Properties
- align: start | end — which trigger edge the panel aligns to
- columns: 1 | 2 — panel layout; 2 for eight or more items
- size: sm | md — md is the header default, sm the compact in-page switcher

Composition
- NavMenu/Trigger: the button; label, optional icon, icon-only mode
- NavMenu/Panel: the floating surface
- NavMenu/Item: one destination; label, icon, optional meta slot, isCurrent
- NavMenu/Footer: optional closing row, e.g. "All areas →"

Accessibility
- Disclosure pattern, not role=menu: the trigger carries aria-expanded and aria-controls, items stay real
  links so link semantics and open-in-new-tab survive
- Arrows move focus and wrap; Home/End jump; Escape closes and returns focus to the trigger; Tab closes and
  lets focus leave — focus is never trapped
- Roving tabindex, so focus sits on the anchor and the browser reports the destination
- The current destination carries aria-current="page"
- Items meet the 44px hit target; focus ring is border.medium + color.border.focus + shadow.focus

Storybook mapping
- React component: NavMenu
- Path: apps/vs1-demo/ui/src/components/ui/NavMenu.tsx
- Code Connect: apps/vs1-demo/ui/src/components/ui/NavMenu.figma.tsx
- Notable prop differences: isOpen is a Figma state mirror only; in React the open state is internal
```

---

## 10. Definition of done

A component, not a draft, when all of these hold:

- [x] Figma component sets on `⌄ Nav Menu`: Item (4 State × 2 Layout), Trigger (4 State × 2 Mode),
      Panel (2 Panel × 2 Columns) — 20 variants, every value bound to a Color variable so both modes follow
- [x] Every colour, radius, spacing and shadow bound to a variable — no raw values
- [x] Focus state visible and distinct from hover, meeting 3:1
- [x] `NavMenu.tsx` in `components/ui/`, composing sub-components, no react-router dependency
- [x] `NavMenu.stories.tsx` covering: 1-column, 2-column, icon-only trigger, current-item, dark
- [x] `NavMenu.figma.tsx` Code Connect mapping — three `figma.connect` calls, one per set. Figma-only axes
      (`Trigger State=Open`, `Item Layout`) stay unmapped rather than pointing at props that do not exist
- [x] A keyboard contract test in the spirit of `Button.contract.test.tsx` — arrows wrap, Escape returns
      focus, Tab does not trap (9 assertions, `NavMenu.contract.test.tsx`)
- [x] Figma descriptions filled on all three sets, extended from section 9 with what building them taught
- [x] The remaining call sites migrated and every `role="menu"` usage gone. It was three, not two: `GlobalNav`
      used `common/LanguageSwitcher`, a fourth copy that rendered `<button>`s (so the locales were not links
      at all) in raw `neutral-*`/`white` classes that never followed the theme into dark mode. The two
      language copies are now one `layout/LanguageMenu` shared by both headers — the same argument
      `AreasMenuPanel` makes. Held by `NavMenu.guard.test.ts`
- [x] `CountrySelector` moved onto `SelectMenu` (landed in #72)
