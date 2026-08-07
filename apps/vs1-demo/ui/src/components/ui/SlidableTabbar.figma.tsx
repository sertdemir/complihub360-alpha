import figma from "@figma/code-connect";
import { SlidableTabbar } from "./SlidableTabbar";

// Code Connect: Compass "Mobile Slidable Tabbar" (614:261, Tabbar page) →
// SlidableTabbar. The tab-item set (613:212) carries the only variant axis —
// Type (Label Only · Icon + Label) — which is per-tab content (icon optional),
// not a container prop. Tabs are instance content, so the example provides a
// representative tabs array + active key.
figma.connect(
  SlidableTabbar,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=614-261",
  {
    props: {},
    example: () => (
      <SlidableTabbar
        active="all"
        tabs={[
          { key: "all", label: "All", count: 24 },
          { key: "open", label: "Open", count: 8 },
          { key: "overdue", label: "Overdue", count: 3 },
          { key: "done", label: "Done" },
        ]}
      />
    ),
  }
);
