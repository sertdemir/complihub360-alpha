import figma from "@figma/code-connect";
import { Slider } from "./Slider";

// Code Connect: Compass "Slider" component set (539:110, Progress page) → Slider.
// Axes: Size (SM·MD·LG) × State (Default·Hover·Focused·Disabled) × Type
// (Single·Range). Size → size, Type → range (bool), State → disabled (bool).
figma.connect(
  Slider,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=539-110",
  {
    props: {
      size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      range: figma.enum("Type", { Single: false, Range: true }),
      disabled: figma.enum("State", {
        Default: false,
        Hover: false,
        Focused: false,
        Disabled: true,
      }),
    },
    example: ({ size, range, disabled }) => (
      <Slider size={size} range={range} disabled={disabled} defaultValue={60} showValue />
    ),
  }
);
