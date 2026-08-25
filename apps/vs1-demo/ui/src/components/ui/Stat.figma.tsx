import figma from "@figma/code-connect";
import { Stat } from "./Stat";

// Code Connect: Compass "Stat" component set (1112:2) → Stat.
// Variant Size → size, Variant Trend → trend.direction. Label / value / trend
// value / caption are editable text on the instance; the example uses
// representative CompliHub360 content.
figma.connect(
  Stat,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1112-2",
  {
    props: {
      size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      direction: figma.enum("Trend", { Up: "up", Down: "down", Neutral: "neutral" }),
    },
    example: ({ size, direction }) => (
      <Stat
        size={size}
        label="Match rate"
        value="94%"
        trend={{ value: "+12%", direction, label: "vs. last month" }}
      />
    ),
  }
);
