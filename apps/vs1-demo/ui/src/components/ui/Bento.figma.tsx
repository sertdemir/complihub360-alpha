import figma from "@figma/code-connect";
import { BentoTile } from "./Bento";

// Code Connect: Compass "Bento Tile" set (690:2) → BentoTile.
// Axes: Span (1x1·2x1·1x2·2x2) × Type (KPI·Stat·Visual·CTA) × State (Default·Hover).
// Span → colSpan/rowSpan; Type=CTA → tone "cta" (others use default surface);
// State=Hover → interactive (hover affordance).
figma.connect(
  BentoTile,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=690-2",
  {
    props: {
      colSpan: figma.enum("Span", { "1x1": 1, "2x1": 2, "1x2": 1, "2x2": 2 }),
      rowSpan: figma.enum("Span", { "1x1": 1, "2x1": 1, "1x2": 2, "2x2": 2 }),
      tone: figma.enum("Type", { KPI: "default", Stat: "default", Visual: "default", CTA: "cta" }),
      interactive: figma.enum("State", { Hover: true, Default: false }),
    },
    example: ({ colSpan, rowSpan, tone, interactive }) => (
      <BentoTile colSpan={colSpan} rowSpan={rowSpan} tone={tone} interactive={interactive}>
        Tile content
      </BentoTile>
    ),
  }
);
