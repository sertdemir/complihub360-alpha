import figma from "@figma/code-connect";
import { EmptyState } from "./EmptyState";

// Code Connect: Compass "Empty State" set (777:2) → EmptyState.
// Axes: Type (No Data·No Results·Error·Loading·Permission Denied·Onboarding) ×
// Size (Compact·Default). Type is composed via icon/title/description in code.
figma.connect(EmptyState, "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=777-2", {
  props: {
    size: figma.enum("Size", { Compact: "compact", Default: "default" }),
  },
  example: ({ size }) => (
    <EmptyState size={size} title="No requests yet" description="When a provider responds, it shows up here." />
  ),
});
