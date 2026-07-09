# Mobile Header — Pill Nav (FINAL · canonical)

User-confirmed **final** mobile header pattern (chosen over the full-screen off-canvas, which is **kept**
as an alternative, not deleted). Merged into proper Compass components on the Header page (`704:2`),
mirroring the two desktop header components — each a COMPONENT_SET with **State=Closed / State=Open**:
- **`Header Marketing Mobile`** (`1057:1314`) = **Entrepreneur**
- **`Header Marketing Provider Mobile`** (`893:1161`) = **Provider**

**Closed** = 64px bar (Logo · Globe · Hamburger). **Open** = the pill panel below. Reproduce THIS in Storybook + Code.

## Layout (390 wide · VERTICAL · bg `color/bg/primary` white)

Order top→bottom: **Header Bar → Button Row → Anchor Pills**

1. **Header Bar** — 390×64, HORIZONTAL, `space-between`, pad `12 20`.
   - Left: **Logo** (360° + CompliHub + "Compliance. Simplified.")
   - Right: **Globe** (language toggle) + **Close (X)** — grouped, gap 8. *(globe added by user)*
   - Bottom border: `color/border/subtle` 1px.

2. **Button Row** — HORIZONTAL, gap 16, pad `16 16 20 16`.
   - **Login** (outline, **HUG** = compact ~73px) + **Primary CTA** (gold, **FILL** = takes the rest) — so long labels fit.
   - CTA label per audience: Provider = "Apply for beta" · Entrepreneur = "Start your assessment".

3. **Anchor Pills** — 390×60, pad left 16 / bottom 20, **clips content** (overflow → runtime horizontal scroll).
   - **Pills** row, HORIZONTAL, **gap 12**, hug width (~731px → overflows 390, clipped).
   - Pills (provider set): **How matching works** *(active)* · Dashboard · Performance · Pricing · FAQ · **For Entrepreneurs** (cross-link, last).
   - **Active pill** = scroll-spy current section: fill `color/bg/brand` (petrol), text `color/text/on-brand` (white), radius `full`.
   - **Inactive pills** = fill `color/bg/secondary`, text `color/text/primary`, radius `full`, pad `8 14`.
   - **No fade overlay** in final — scroll affordance is the hard-clipped edge + native horizontal scroll. *(user removed the gradient fade)*

## Behavior (runtime / code)
- Closed state = header bar only (logo + globe + hamburger). Tap menu → panel (Button Row + Pills) expands below; page stays visible.
- Pills horizontally scrollable (native, no visible controls). **Scroll-spy**: active section's pill gets the petrol active state; tapping a pill smooth-scrolls to its section.
- Two audiences: **Provider** (this) and **Entrepreneur** (to build, same pattern; anchors How it works · What we know · Voices · Pricing + cross-link "For Providers", CTA "Start your assessment").

## Tokens
Pills: `bg/brand`·`bg/secondary` (fill), `text/on-brand`·`text/primary`, `radius/full`. Bar: `bg/primary`, `border/subtle`. Buttons = Compass Button instances (Login outline + Primary CTA gold). All colors variable-bound.

## Status of the alternatives (KEEP — do not delete)
- `Off-Canvas Marketing` (894:1155, Entrepreneur) + `Off-Canvas Marketing Provider` (1045:1306) — full-screen variant, retained as option.
- Desktop headers: `Header Marketing Desktop` (Entrepreneur, +For Providers) · `Header Marketing Provider` (1036:1165, +For Entrepreneurs).
