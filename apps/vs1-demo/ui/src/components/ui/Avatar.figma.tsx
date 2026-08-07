import figma from "@figma/code-connect";
import { Avatar } from "./Avatar";

// Code Connect: Compass "Avatar" set (482:2) → Avatar.
// Size/Status map to props; Type (Image/Initials/Icon/Placeholder) is resolved in
// code by which content prop is passed (src → initials → icon → placeholder).
figma.connect(
  Avatar,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=482-2",
  {
    props: {
      size: figma.enum("Size", { XS: "xs", SM: "sm", MD: "md", LG: "lg", XL: "xl" }),
      status: figma.enum("Status", { None: "none", Online: "online", Away: "away", Offline: "offline" }),
      tone: figma.enum("Tone", { Solid: "solid", Soft: "soft" }),
    },
    example: ({ size, status, tone }) => <Avatar size={size} initials="GD" status={status} tone={tone} />,
  }
);
