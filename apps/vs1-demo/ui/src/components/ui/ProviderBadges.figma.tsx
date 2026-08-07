import figma from "@figma/code-connect";
import { PartnerStatusBadge, AvailabilityPill } from "./ProviderBadges";

// Code Connect: Compass Provider AppShell extras.
// Partner Status Badge = 1014:285 (Status: Verified·Pending — code's `suspended`
// has no Figma variant). Availability Pill = 1014:294 (variant prop is `State`:
// Available·Off — Off maps to code `offline`; code's `busy` has no Figma variant).

figma.connect(
  PartnerStatusBadge,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1014-285",
  {
    props: {
      status: figma.enum("Status", {
        Verified: "verified",
        Pending: "pending",
      }),
      styleVariant: figma.enum("Style", {
        Soft: "soft",
        Solid: "solid",
      }),
    },
    example: ({ status, styleVariant }) => <PartnerStatusBadge status={status} styleVariant={styleVariant} />,
  }
);

figma.connect(
  AvailabilityPill,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1014-294",
  {
    props: {
      status: figma.enum("State", {
        Available: "available",
        Off: "offline",
      }),
    },
    example: ({ status }) => <AvailabilityPill status={status} />,
  }
);
