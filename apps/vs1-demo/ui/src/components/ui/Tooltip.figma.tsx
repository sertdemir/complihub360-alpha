import figma from "@figma/code-connect";
import { Tooltip } from "./Tooltip";

// Code Connect: Compass "Tooltip" set (685:2) → Tooltip.
// Axes: Direction (Top·Right·Bottom·Left) × Size (SM·MD·LG) × Type
// (Default·With Title·Rich). Title is set only for With Title / Rich.
figma.connect(Tooltip, "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=685-2", {
  props: {
    side: figma.enum("Direction", { Top: "top", Bottom: "bottom", Left: "left", Right: "right" }),
    size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
    title: figma.enum("Type", { Default: undefined, "With Title": "Tooltip title", Rich: "Tooltip title" }),
  },
  example: ({ side, size, title }) => (
    <Tooltip content="Tooltip text" side={side} size={size} title={title}>
      <button>Trigger</button>
    </Tooltip>
  ),
});
