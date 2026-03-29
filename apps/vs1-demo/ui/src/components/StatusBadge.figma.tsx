import figma from "@figma/code-connect";
import { StatusBadge } from "./StatusBadge";

// Maps Figma "Badge" component (Variant=Success/Warning/Error/Default/Accent/Brand)
// to the StatusBadge code component.
// Note: StatusBadge currently uses a single visual style.
// When the Badge component is refactored to support variants, update the example below.
figma.connect(
  StatusBadge,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=42:14",
  {
    props: {
      label: figma.string("Label"),
      status: figma.enum("Variant", {
        Default: "active",
        Success: "active",
        Warning: "warning",
        Error: "warning",
        Accent: "pending",
        Brand: "active",
      }),
    },
    example: ({ label, status }) => (
      <StatusBadge label={label} status={status} />
    ),
  }
);
