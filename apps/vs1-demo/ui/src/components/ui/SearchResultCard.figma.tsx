import figma from "@figma/code-connect";
import { SearchResultCard } from "./SearchResultCard";

// Code Connect: Compass "Search Result Card" component set (673:188, Cards page)
// → SearchResultCard. Axes: Type (Audit·Document·Contact·Norm) × State
// (Default·Hover). Type → type (drives tag label + leading icon); Hover is a CSS
// :hover state, not a prop. Title / snippet / meta are instance content (the
// example hardcodes representative CompliHub360 content).
figma.connect(
  SearchResultCard,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=673-188",
  {
    props: {
      type: figma.enum("Type", {
        Audit: "audit",
        Document: "document",
        Contact: "contact",
        Norm: "norm",
      }),
    },
    example: ({ type }) => (
      <SearchResultCard
        type={type}
        title="Q3 VAT reconciliation audit"
        meta="Tax & VAT · DE · updated 3d ago"
        snippet="Reconcile input and output VAT against the filed return before the quarterly close."
      />
    ),
  }
);
