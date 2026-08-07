import figma from "@figma/code-connect";
import { ProgressBar } from "./Progress";
import { Stepper } from "./Stepper";
import { Pagination } from "./Pagination";

// Code Connect for the Compass Progress family. Each Figma component set is a
// distinct node-id (the Progress page groups several sets).

// Progress Bar (538:2): Size (SM·MD·LG) × Color (Brand·Success·Warning·Error·Info)
// × State (Default·Indeterminate).
figma.connect(ProgressBar, "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=538-2", {
  props: {
    size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
    color: figma.enum("Color", {
      Brand: "brand",
      Success: "success",
      Warning: "warning",
      Error: "error",
      Info: "info",
    }),
    indeterminate: figma.enum("State", { Indeterminate: true, Default: false }),
  },
  example: ({ size, color, indeterminate }) => (
    <ProgressBar size={size} color={color} indeterminate={indeterminate} value={60} />
  ),
});

// Step Horizontal (541:130): Size (XS·SM·MD·LG) × StepState
// (Completed·Active·Upcoming·Error·Disabled). Code Stepper has no XS (omitted);
// step states are derived from `current` + step content.
figma.connect(Stepper, "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=541-130", {
  props: {
    size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
  },
  example: ({ size }) => (
    <Stepper size={size} current={1} steps={[{ label: "Markets" }, { label: "Operations" }, { label: "Review" }]} />
  ),
});

// Pagination (561:310): Size (SM·MD·LG) × Type (Numbers·Dots·Simple).
figma.connect(Pagination, "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=561-310", {
  props: {
    type: figma.enum("Type", { Numbers: "numbers", Dots: "dots", Simple: "simple" }),
  },
  example: ({ type }) => <Pagination type={type} page={3} totalPages={12} />,
});
