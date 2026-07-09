import figma from "@figma/code-connect";
import { TableMobileCard } from "./TableMobileCard";

// Code Connect: Compass "Table Mobile Card" component set (804:504, Table page)
// → TableMobileCard. Single axis: State (Default·Selected) → selected (bool).
// Title and the label→value fields are instance content (the example hardcodes
// representative CompliHub audit-row content).
figma.connect(
  TableMobileCard,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=804-504",
  {
    props: {
      selected: figma.enum("State", { Default: false, Selected: true }),
    },
    example: ({ selected }) => (
      <TableMobileCard
        selected={selected}
        selectable
        title="Q3 VAT reconciliation"
        fields={[
          { label: "Owner", value: "A. Schmidt" },
          { label: "Risk", value: "High" },
          { label: "Due", value: "12 Jul 2026" },
        ]}
      />
    ),
  }
);
