# CompliHub Icon — Style Spec

The reference for every token, measurement, and decision the
`svg-icon-builder` skill relies on. Keep it open while drawing.

## Color tokens

Derived from the CompliHub duotone house style. These are **brand colors** — in
duotone mode they are hardcoded literally and must not shift with light/dark
theme.

| Token        | Hex       | Role                                                        |
|--------------|-----------|-------------------------------------------------------------|
| `gold`       | `#B49A5C` | Primary brass. The filled mass in duotone; the line in mono-gold. |
| `soft-gold`  | `#C9B583` | Lighter tint. Back-layer fills, arc tracks, secondary mass. |
| `ink`        | `#1C2433` | Navy. The detail marks on top (check, face, text, needle).  |
| `cream`      | `#EFEBE1` | Chip / background **only**. Never part of the icon artwork. |

Mono mode uses **`currentColor`** instead of these — the icon then inherits the
surrounding text color and follows the theme. (A mono icon that should always
be gold or ink regardless of context may use the literal hex instead.)

Forbidden: any other color, gradients, drop shadows, glows, blur, filters.

## Geometry

- **Canvas:** `viewBox="0 0 24 24"`. No `width`/`height` on the root `<svg>`.
- **Live area:** keep artwork within x,y ∈ [2, 22]. The 2px margin stops the
  glyph touching the edge at small sizes.
- **Snapping:** place anchors on whole or half units where it doesn't fight the
  curve. Crisp strokes, soft shapes.

## Stroke scale (at the 24-grid)

| Use                                   | Width |
|---------------------------------------|-------|
| Fine marks (text lines, hatching)     | 1.2–1.4 |
| Standard detail (face, vein, fold)    | 1.6–1.8 |
| Primary detail (a hero check, a needle)| 1.8–2.0 |
| Arc tracks / gauges                   | 2.0–2.2 |
| **Mono / outline main strokes**       | **2.0 (default)** |

In **mono** and **duotone-outline** the main shape and primary detail share one
uniform width — **2px by default** — so the icon reads as a coherent line set.
Secondary marks (a small check tucked in a lens) may drop to ~1.8 for legibility
when 2px would clog. In **duotone-fill** the main shape has no stroke at all;
only the ink detail is stroked, per the table above.

Always `stroke-linecap="round"` and `stroke-linejoin="round"`. Always
`fill="none"` on any path used as a line/curve/arc.

## Mode decision tree

```
Is the icon inline / small / following text color (nav, list, label)?
├─ yes → MONO · currentColor, stroked 2px, curve-first
└─ no (focal: feature tile, empty state, hero, marketing)
   └─ does the user want a stroked / bordered / "outline" look,
      or a line set matching mono icons?
      ├─ yes → DUOTONE-OUTLINE · gold outline + ink detail, uniform 2px, no fills
      └─ no  → DUOTONE-FILL · gold mass + ink detail, optional soft-gold layer
```

Both duotone styles hardcode the brand hex and sit on a cream chip on dark
surfaces. When unspecified, default by size: ≤24px inline → mono; ≥40px focal →
duotone-fill (the boldest read) — but always offer the outline flip, since it's
the same geometry with fills swapped for strokes.

## Curve craft (what makes it look right)

- **Soft shoulders:** open a shape with a `Q` across the top rather than two
  straight edges meeting at a corner. See the shield and chat bubble in
  `examples.svg`.
- **Organic blades:** for leaf/flow/swoosh forms use chained `C` curves with no
  straight segment at all.
- **Tension:** control points roughly 1/3–1/2 of the way along the span give a
  natural, relaxed curve. Pull them closer to the anchor for a tighter, firmer
  shape; push them out for a softer bulge. Tune this live in the render step.
- **Rounded rectangles:** when a corner is genuinely needed (document, frame),
  round it with a short `C` (radius ~1.5–2.5 units), not a hard `L…L`.
- **Arcs:** use `A r r 0 0 1 …` for gauges and rings; round caps make the ends
  read as soft.

## Composition checklist

- ≤3 visual elements.
- Mass reads as a clear silhouette at 20px before any detail is added.
- Detail sits *inside* the mass's optical weight, not floating loose.
- In duotone, ink detail has enough contrast against gold (it does — navy on
  brass is strong); soft-gold back layers stay subordinate to the gold mass.
