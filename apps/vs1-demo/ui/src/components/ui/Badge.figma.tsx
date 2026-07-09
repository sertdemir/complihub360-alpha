import figma from "@figma/code-connect";
import { Badge } from "./Badge";

// Code Connect: Compass "Badge" component set (519:2) → the Badge code component.
// Color → tone, Style → appearance, Size → size, Label → children.
// Compass axes: Size (SM·MD·LG) × Style (Filled·Subtle·Outline) × Color
// (Brand·Neutral·Success·Warning·Error·Info) × State (Default·Disabled).
figma.connect(
  Badge,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=519-2",
  {
    props: {
      children: figma.string("Label"),
      size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      appearance: figma.enum("Style", { Filled: "solid", Subtle: "soft", Outline: "outline" }),
      tone: figma.enum("Color", {
        Brand: "brand",
        Neutral: "neutral",
        Success: "success",
        Warning: "warning",
        Error: "error",
        Info: "info",
      }),
    },
    example: ({ children, size, appearance, tone }) => (
      <Badge tone={tone} appearance={appearance} size={size}>
        {children}
      </Badge>
    ),
  }
);
