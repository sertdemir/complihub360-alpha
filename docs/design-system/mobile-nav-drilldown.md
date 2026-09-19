# Mobile Main Nav — Drill-Down (FINAL · canonical since 2026-09-19)

Supersedes `mobile-header-pill-nav.md` **in code**. That document still describes the Figma
component sets and the Compass Header page, which are unchanged; what it prescribes for runtime
behaviour — the horizontally scrolling anchor-pill row — is no longer what the app builds.

Implemented once, in `apps/vs1-demo/ui/src/components/layout/MobileNav.tsx`, and opened by **both**
headers (`MarketingHeader` on the landing page, `GlobalNav` on every other route) — the same promise
`navLinks.ts` makes for the entries themselves.

## Why the pill row went

The pill row came from the era when the header entries were in-page anchors with scroll-spy. After
the multipager move on 2026-08-18 it carried six real routes:

- At 390px it shows **two and a half of six** entries. `[scrollbar-width:none]` hides the scrollbar,
  so nothing on screen says the other four exist.
- The two mega-menu entries were flattened to plain links there, so the **nine compliance areas and
  the eight markets had no mobile representation at all** — the whole second level the desktop
  sheets exist for was missing.

User finding, 2026-09-19: *"die main navigation gibt es nicht in der mobile version."*

## The pattern

Three variants were drawn at 390×844 and reviewed in one canvas (inline accordion · drill-down ·
bottom sheet). **Drill-down won** because it is the only one of the three that carries what the
desktop sheets actually say — the area's own headline under its name, the duties an engine source
covers per market — without a forty-row scroll.

**Level 1** — exactly six rows, 56px each. Fits a 667px viewport without scrolling.
- Bar: logo · theme · language · close (all 44px targets).
- A destination is an `<a>`. A mega-menu entry is a `<button>`, because it reveals children — the
  same rule the desktop bar follows.
- A mega-menu entry carries a muted count (`9 Bereiche`, `8 Märkte`) before its chevron, so the
  depth is visible before the tap.
- Active entry: `bg-brand-light` + `text-fg-brand`, from the URL.

**Level 2** — `areas` and `markets`.
- Bar becomes: back · title · close. No second row is needed to say where you are.
- The desktop panel's aside copy sits at the top (`areasAsideBody` / `marketsAsideBody`).
- Rows: 36px token-tinted icon box · name · derived sub-line, clamped to two lines.
  Areas → `compliance.<slug>.headline`. Markets → `header.nav.marketFact`.
- `Alle Compliance-Bereiche →` / `Alle Märkte →` is **pinned** below the scroll area, not scrolled
  with the list.

**Actions** — pinned to the bottom edge on every level, 48px high. On an 844px viewport the top of
the panel is the worst place for the primary call to action; the thumb rests at the bottom. This is
the one deliberate break from what the pill panel did (actions first, under the bar).

## Rules that are not negotiable

- **One source.** Both sub-levels read what the desktop sheets read — `AREAS`, `MARKET_CODES` +
  `getMarketProfile`. Mobile and desktop cannot drift, and no copy is authored for the menu.
- **Portal.** The panel renders into `document.body` via `createPortal`. `MarketingHeader`'s bar
  carries `backdrop-blur-xl`, and a backdrop-filter makes an element the containing block for its
  fixed descendants — `inset-0` then resolved against a 64px bar, the panel came out zero pixels
  high, and the action row sat on top of the entries swallowing every tap. `GlobalNav`'s `<header>`
  is `pointer-events-none` on top of that. A portal is out of reach of both. **Do not move it back
  inside a header.**
- **Modal, properly.** `role="dialog"` + `aria-modal`, body scroll locked while open, Tab trapped
  inside, focus follows the level. Escape steps **back one level** before it closes, so the keyboard
  and the thumb agree.
- **Reset on close.** Reopening always starts at level 1.
- The burger is `aria-expanded` + `aria-controls` pointing at the panel.

## Breakpoint

Below `desktop-m` (1280px) — the same cut the desktop bar already used, because six entries with
German labels do not survive 1024px.

## Tokens

Rows `bg-surface` / `hover:bg-surface-secondary`, dividers `border-stroke-subtle`, active
`bg-brand-light` + `text-fg-brand`, icon boxes `bg-brand-light` + `text-fg-brand`, aside and the
pinned all-link on `bg-surface-secondary`. Type from the scale only — `text-body` for level-1
labels, `text-body-sm` / `text-body-xs` below (the design-system guard rejects free px sizes under
17px).

## i18n

New `header.nav` keys in all four locales: `openMenu`, `closeMenu`, `back`, `menuLabel`,
`areasCount`, `marketsCount`. Everything else reuses keys the desktop sheets already had.

## Known inconsistency (not introduced here)

The two headers label the same action differently — `MarketingHeader` uses `header.login`
("Anmelden"), `GlobalNav` uses `nav.login` ("Login"), and their outline buttons differ in border
colour. That predates this component and now shows up side by side in the same panel. Worth a
decision; it is product copy, so it is not changed here.
