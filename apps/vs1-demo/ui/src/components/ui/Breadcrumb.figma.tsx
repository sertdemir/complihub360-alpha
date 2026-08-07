import figma from "@figma/code-connect";
import { Breadcrumb } from "./Breadcrumb";

// Code Connect: Compass "Breadcrumb" set (701:102) → Breadcrumb.
// Axes: Size (SM·MD) × Truncation (Full·Collapsed). Truncation/Collapsed is not
// yet a code prop (always renders full) — Size is the only mapped axis.
figma.connect(Breadcrumb, "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=701-102", {
  props: {
    size: figma.enum("Size", { SM: "sm", MD: "md" }),
  },
  example: ({ size }) => (
    <Breadcrumb size={size} items={[{ label: "Home", href: "#" }, { label: "Domains", href: "#" }, { label: "Tax & VAT" }]} />
  ),
});
