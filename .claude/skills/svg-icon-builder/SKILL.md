---
name: svg-icon-builder
description: >
  Generate SVG icons in the CompliHub360 duotone house style — soft Bézier
  curves, generous roundings, brass-gold + navy-ink. Two modes: mono (single
  color, stroked) and duotone (gold fill mass + ink detail). Use this skill
  WHENEVER the user wants an icon, glyph, pictogram, or symbol for CompliHub /
  Compass — phrases like "bau ein Icon für X", "ein Icon im CompliHub-Stil",
  "duotone icon", "svg icon", "neues Symbol für den Nav", even if they don't
  say the word "skill". Do NOT default to angular Lucide-style stroke icons —
  this house style is curve-first and often duotone.
---

# SVG Icon Builder — CompliHub Duotone

The CompliHub icon language is **not** the angular Lucide/Feather stroke style.
It is **curve-first and warm**: organic Bézier shapes, soft shoulders, fully
rounded line ends, and a two-tone brass-gold + navy-ink palette. Every icon
should feel hand-drawn and friendly, never technical or spiky.

Read `reference/style-spec.md` for the full token table, stroke scale, and the
mode decision tree. Open `reference/examples.svg` to see six canonical icons —
treat them as the gold standard for proportion, curve tension, and tone
balance. When in doubt, match their feel.

## The three styles

**Mono** — one color, drawn with strokes (default 2px). Use `currentColor` so
it inherits the surrounding text color (nav items, inline labels, anywhere the
icon must follow theme). Good for small UI sizes and dense lists.

**Duotone-fill** — a filled **mass** in gold carries the silhouette, a
**detail** in navy ink sits on top (a check, a face, text lines, a needle).
Optionally a third lighter `soft-gold` fill for a back-layer or tint. Use for
feature tiles, empty states, marketing, anywhere the icon is a focal point —
like the people / training reference. The boldest, most graphic option.

**Duotone-outline** — the same two-color logic but **everything is a stroke** at
one uniform width (default 2px), no fills at all: a gold outline for the main
shape, navy ink strokes for the detail. Lighter and more line-based than
duotone-fill; sits naturally next to mono icons in the same toolbar. Reach for
this when the user wants a stroked / bordered / "outline" look, or a consistent
2px line set.

Both duotone styles use the literal brand hex (these are brand colors; they must
not invert with the theme), and both still sit on a cream chip on dark surfaces.

If the user doesn't specify, pick by context: small/inline → mono; focal/large
and graphic → duotone-fill; focal but line-based → duotone-outline. State which
you chose, and offer to flip between fill and outline — it's the same drawing.

## Hard rules — these create the house look

These are few on purpose. Follow them and the style holds; everything else is
craft.

1. **Round everything.** Every stroke carries `stroke-linecap="round"` and
   `stroke-linejoin="round"`. This single rule is most of the warmth.
2. **Curves over corners.** Reach for `C`, `Q`, and `A` before straight
   segments. A right angle is a deliberate choice (a document edge, a frame),
   never a default. Soften shoulders and joints with short curves.
3. **Match fill vs. stroke to the chosen style.** In *duotone-fill* the
   silhouette is a closed `fill` shape and the marks on top are `stroke` paths.
   In *mono* and *duotone-outline* everything is a `stroke` path at one uniform
   width (default 2px) and every one of them carries `fill="none"`. Never leave
   a line/curve/arc path fillable — SVG fills it black. When unsure which a
   shape is, ask: does it read as a solid body, or as a drawn line?
4. **One focal metaphor.** Aim for ≤3 visual elements. An icon reads at 20px;
   clutter kills it. Cut before you add.
5. **Brand palette only** (see token table). Mono → `currentColor`. Duotone →
   the brand hex. No off-palette colors, no gradients, no shadows, no filters.

## Canvas & geometry

- Base canvas is `viewBox="0 0 24 24"`. Keep the live area inside ~2..22 (a 2px
  margin) so the icon never kisses the edge.
- **No `width`/`height` on the root `<svg>`** — let it scale to its container.
- Snap anchor points to whole or half units where you can; it keeps strokes
  crisp without making curves stiff.
- Detail stroke width sits in the **1.2–2.2** range at the 24-grid (thinner for
  fine marks like text lines, heavier for a primary check or arc). See the
  stroke scale in `reference/style-spec.md`.

## Workflow

1. **Clarify the metaphor.** What single idea must the icon carry? Name it
   before drawing. If the user gave a reference image, mirror its construction.
2. **Pick the mode** (mono vs duotone) per the rules above.
3. **Draw the mass first, detail second.** Block the silhouette as a filled
   curve, then lay the ink marks on top.
4. **Render it to verify.** Show the result with the `show_widget` visualize
   tool, placed on a cream chip (`#EFEBE1`) so navy ink stays readable in both
   light and dark mode. Show it at icon size (~24–48px) AND zoomed, so curve
   quality is visible. Iterate on curve tension here — this is where the look
   is won or lost.
5. **Self-check.** Run `node scripts/validate.mjs <file.svg>` to catch missing
   round caps, off-palette colors, unfilled connectors, or a root width/height.
   Fix anything it flags.

## Output format

Deliver the raw `<svg>` element, indented and readable. For a set of icons,
prefer `<symbol id="ic-name" viewBox="0 0 24 24">` definitions so they're
reusable via `<use href="#ic-name">`. Name icons in kebab-case by meaning
(`shield-check`, not `icon1`).

## Example construction

**Duotone, soft shoulders (a shield):**
Input: "compliance / verified shield icon, duotone"
Output approach: gold shield mass with a `Q` curve across the top for a soft
crown and `C` curves down the flanks to a rounded point; a navy `stroke` check
mark on top, `fill="none"`, `stroke-linecap="round"`. Three elements total.

**Mono, curve-first (a leaf):**
Input: "small leaf icon for the sustainability filter"
Output approach: one `currentColor` stroke path, pure `C` curves for the blade,
a second short `C` curve for the vein. No straight lines anywhere.
