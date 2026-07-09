import figma from "@figma/code-connect";
import { KPICard, AuditCard, EntityCard } from "./Cards";

// Code Connect: Compass "Cards" page (663:2) → KPICard · AuditCard · EntityCard.
// Node-ids confirmed against live Compass metadata 2026-06-06:
//   Card Base 664:50 · KPI Card 668:114 · Audit Card 669:234 · Entity Card 672:176
//   (also in Compass, not yet in code: KPI Circle Card 680:415 · Search Result Card 673:188)

figma.connect(
  KPICard,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=668-114",
  {
    props: {
      label: figma.string("Label"),
      value: figma.string("Value"),
      direction: figma.enum("Trend", { Up: "up", Down: "down", Neutral: "neutral" }),
    },
    example: ({ label, value, direction }) => (
      <KPICard
        label={label}
        value={value}
        trend={{ value: "+12%", direction, label: "vs. last month" }}
      />
    ),
  }
);

figma.connect(
  AuditCard,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=669-234",
  {
    props: {
      risk: figma.enum("Risk", { Low: "low", Medium: "medium", High: "high", Critical: "critical" }),
      status: figma.enum("Status", { Open: "Open", "In Progress": "In Progress", Closed: "Closed" }),
    },
    example: ({ risk, status }) => (
      <AuditCard
        risk={risk}
        status={status}
        statusTone="warning"
        title="VAT registration · Italy"
        description="Distance-selling threshold reached. Registration required before next shipment."
        date="Updated 2h ago"
      />
    ),
  }
);

figma.connect(
  EntityCard,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=672-176",
  {
    props: {
      name: figma.string("Title"),
      meta: figma.string("Subtitle"),
    },
    example: ({ name, meta }) => <EntityCard name={name} meta={meta} interactive />,
  }
);
