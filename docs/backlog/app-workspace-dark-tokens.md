# App Workspace · Dark Mode Token Lock

**Status:** LOCKED — sampled from Login frames after manual optimization (2026-05-17)
**Source:** User Login Desktop (`1839:2`) + Provider Login Desktop (`1842:2288`)
**Scope:** All post-login App surfaces (Dashboards, Drawers, Forgot-Password, Magic-Link-Sent, Error states, Onboarding-Wizard, etc.)

---

## Why this exists

The App workspace uses a different dark-mode palette than the Compass Brand Promo example (which is pure-petrol-deep). Aktamir manually adjusted the Login frames to use **slate-blue panels with petrol-green card surfaces inside** — a sophisticated layering that's better suited to long-session operational UIs (Linear / Vercel dashboard pattern) than the saturated petrol-deep brand-showcase pattern.

This doc locks in those values so all future App surfaces are consistent.

---

## Token Map

### Surfaces (background layers, lowest → highest elevation)

| Token | Hex | Where used |
|---|---|---|
| `color/dark/page-outer` | `#000403` | Page outermost frame (visible only at edges) |
| `color/dark/page-deep` | `#000A08` | Optional deeper surfaces (inputs in some states) |
| `color/dark/panel-brand` | `#0F162A` | Brand panel (left side of split-screen, slate-blue) |
| `color/dark/panel-form` | `#1F2937` | Form panel (right side, slightly elevated slate) |
| `color/dark/surface-card` | `#001C16` | Cards/elevated surfaces (Login card, Stat cards, Continuity-Box, Form-Card) — **petrol-green back** |

**Layering pattern**: The two outer panels are **slate-blue** (cool, neutral). Cards on top of those panels return to **petrol-green** (#001C16) for warmer elevation moments. This mix lets the broad background feel professional/neutral while card surfaces stay brand-anchored.

### Borders

| Token | Hex | Where used |
|---|---|---|
| `color/dark/border-subtle` | `#003B31` | Card borders, input borders (petrol-tinted dark border) |

### Text on dark

| Token | Hex | Where used |
|---|---|---|
| `color/dark/text-primary` | `#F5F6F8` | Headlines, primary content (cool off-white, slightly bluish) |
| `color/dark/text-secondary` | `#9CB8AF` | Body text, supporting copy (cool petrol-slate mid) |
| `color/dark/text-tertiary` | `#6B8079` | Labels, status text, footer links (most muted, petrol-greenish) |

### Brand accents (universal across light + dark)

| Token | Hex | Where used |
|---|---|---|
| `color/brand/petrol-deep` | `#004D40` | Petrol CTA fill (Sign in button on Provider Login) · Brand-Anchor stop primary/500 |
| `color/brand/petrol-bright` | `#258D78` | Eyebrow chips text · Status dots · CTA border-stroke · Accent text |
| `color/brand/gold` | `#D4AF37` | Logo mark · Word-highlight in headlines · Gold CTA fill (Send magic-link) · Founding-cohort stats · Apply-for-Beta link · Update-pulse-dot · Apply Marketing-Hook |

> Note: Both `#D3AE37` and `#D4AF37` appear in the sample (one-byte difference). **#D4AF37 is the canonical Compass brand-gold** — `#D3AE37` is a stray value from my earlier scripts. Refactor any `#D3AE37` to `#D4AF37` on next pass.

---

## Visual hierarchy rules

1. **Gold = Identity moments** — Logo mark, single-word headline highlights, Identity-related CTAs (Send magic-link is Gold because it's the User's Conversion-Climax; Apply-for-Beta is Gold for the same reason).
2. **Petrol = Operational moments** — Sign-in CTA is Petrol because it's daily utility, not conversion. Status dots, eyebrow chips, accent text.
3. **Slate panels + Petrol cards** — broad backgrounds are slate (low-saturation, eye-friendly for long sessions); elevated cards return to petrol-green (warmer, brand-grounded).
4. **Never use pure-petrol-deep as wide surface** — That treatment is reserved for Brand Promo / Marketing-Hero surfaces (per Compass example file). App surfaces use the slate-panel pattern.

---

## JS Constants (drop-in for `use_figma` scripts)

```js
const APP_DARK = {
  // Surfaces (deep → elevated)
  pageOuter:    {r: 0.000, g: 0.016, b: 0.012}, // #000403
  pageDeep:     {r: 0.000, g: 0.039, b: 0.031}, // #000A08
  panelBrand:   {r: 0.059, g: 0.086, b: 0.165}, // #0F162A
  panelForm:    {r: 0.122, g: 0.161, b: 0.216}, // #1F2937
  surfaceCard:  {r: 0.000, g: 0.110, b: 0.086}, // #001C16
  // Borders
  borderSubtle: {r: 0.000, g: 0.231, b: 0.192}, // #003B31
  // Text on dark
  textPrimary:  {r: 0.961, g: 0.965, b: 0.973}, // #F5F6F8
  textSecondary:{r: 0.612, g: 0.722, b: 0.686}, // #9CB8AF
  textTertiary: {r: 0.420, g: 0.502, b: 0.475}, // #6B8079
  // Brand accents
  petrolDeep:   {r: 0.000, g: 0.302, b: 0.251}, // #004D40
  petrolBright: {r: 0.145, g: 0.553, b: 0.471}, // #258D78
  gold:         {r: 0.831, g: 0.686, b: 0.216}, // #D4AF37
};
```

---

## Compass-uptake item (when DS bandwidth allows)

Promote this token set to Compass as a new **mode** of the existing color collection: `Compass Dark / App Workspace`. Pairs with the existing Light mode (which is the marketing-website surface).

Three theoretical modes for the future:
- **Light · Marketing** — current default, used on Customer + Provider Landing Pages
- **Dark · App Workspace** — this token set, used on Login + Dashboard + all post-login surfaces
- **Dark · Brand Promo** — pure-petrol-deep (Compass example 202:2), reserved for marketing-hero / brand-moment surfaces

Cross-reference: [`compass-uptake-from-wizard.md`](./compass-uptake-from-wizard.md) — add this as a new high-priority item (likely #25).

---

## Reference frames

| Surface | Frame ID | Status |
|---|---|---|
| Login · User (Desktop) | `1839:2` | ✓ Manually optimized — token authority |
| Login · Provider (Desktop) | `1842:2288` | ✓ Manually optimized |
| Login · User (Mobile) | `1845:2288` | ✓ Same palette, mobile layout |
| Login · Provider (Mobile) | `1845:2334` | ✓ Same palette, mobile layout |

---

## Locked in 2026-05-17. Future App surfaces use this set verbatim.
