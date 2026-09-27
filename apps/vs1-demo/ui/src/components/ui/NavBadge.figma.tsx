import figma from "@figma/code-connect";
import { NavBadge } from "./NavBadge";

// Code Connect: Compass "Nav Badge" (2187:13629) -> NavBadge.
figma.connect(
  NavBadge,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=2187-13629",
  {
    variant: { Type: "Count" },
    props: { count: figma.string("Count") },
    example: ({ count }) => <NavBadge type="count">{count}</NavBadge>,
  }
);
figma.connect(
  NavBadge,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=2187-13629",
  {
    variant: { Type: "Soon" },
    props: { label: figma.string("Soon Label") },
    example: ({ label }) => <NavBadge type="soon">{label}</NavBadge>,
  }
);
