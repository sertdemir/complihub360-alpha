import figma from "@figma/code-connect";
import { Divider } from "./Divider";

// Code Connect: Compass "Divider" set (531:2) → Divider.
// Axes: Direction (Horizontal·Vertical) × Variant (Solid·Dashed·Dotted) ×
// Color (Default·Subtle·Strong·Brand) × Label (None·Label).
figma.connect(Divider, "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=531-2", {
  props: {
    orientation: figma.enum("Direction", { Horizontal: "horizontal", Vertical: "vertical" }),
    variant: figma.enum("Variant", { Solid: "solid", Dashed: "dashed", Dotted: "dotted" }),
    color: figma.enum("Color", { Default: "default", Subtle: "subtle", Strong: "strong", Brand: "brand" }),
  },
  example: ({ orientation, variant, color }) => (
    <Divider orientation={orientation} variant={variant} color={color} />
  ),
});
