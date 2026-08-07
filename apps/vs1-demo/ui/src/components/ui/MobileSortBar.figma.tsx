import figma from "@figma/code-connect";
import { MobileSortBar } from "./MobileSortBar";

// Code Connect: Compass "Mobile Sort Bar" component set (805:508, Table page) →
// MobileSortBar. Single axis: Active (Name·Risk·Owner·Due) → active (the key of
// the currently sorted column). There is no direction variant in Figma, so
// direction defaults to "asc" in the example. The chip options are instance
// content (the example hardcodes the canonical audit-list sort columns).
figma.connect(
  MobileSortBar,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=805-508",
  {
    props: {
      active: figma.enum("Active", {
        Name: "name",
        Risk: "risk",
        Owner: "owner",
        Due: "due",
      }),
    },
    example: ({ active }) => (
      <MobileSortBar
        active={active}
        direction="asc"
        options={[
          { key: "name", label: "Name" },
          { key: "risk", label: "Risk" },
          { key: "owner", label: "Owner" },
          { key: "due", label: "Due" },
        ]}
      />
    ),
  }
);
