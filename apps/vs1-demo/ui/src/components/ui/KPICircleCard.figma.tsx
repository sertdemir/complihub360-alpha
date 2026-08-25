import figma from "@figma/code-connect";
import { KPICircleCard } from "./KPICircleCard";

// Code Connect: Compass "KPI Circle Card" component set (680:415, Cards page) →
// KPICircleCard. Axes: Layout (Horizontal·Centered) × Color (Brand·Success·
// Warning·Error·Info) × State (Default·Disabled). Layout → layout, Color → color,
// State → disabled. Label / value / trend are instance content (example hardcodes
// representative CompliHub360 content).
figma.connect(
  KPICircleCard,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=680-415",
  {
    props: {
      layout: figma.enum("Layout", {
        Horizontal: "horizontal",
        Centered: "centered",
      }),
      color: figma.enum("Color", {
        Brand: "brand",
        Success: "success",
        Warning: "warning",
        Error: "error",
        Info: "info",
      }),
      disabled: figma.enum("State", { Default: false, Disabled: true }),
    },
    example: ({ layout, color, disabled }) => (
      <KPICircleCard
        layout={layout}
        color={color}
        disabled={disabled}
        label="Audit readiness"
        value={92}
        trend={{ value: "+8%", direction: "up" }}
      />
    ),
  }
);
