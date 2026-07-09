import figma from "@figma/code-connect";
import { Tag } from "./Tag";

// Code Connect: Compass "Tag" set (523:614) → Tag.
// Axes: Size (SM·MD·LG) × State (Default·Hover·Focus·Disabled) × Color
// (Brand·Neutral·Success·Warning·Error·Info). Color → tone.
figma.connect(
  Tag,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=523-614",
  {
    props: {
      children: figma.string("Label"),
      tone: figma.enum("Color", {
        Neutral: "neutral",
        Brand: "brand",
        Success: "success",
        Warning: "warning",
        Error: "error",
        Info: "info",
      }),
    },
    example: ({ children, tone }) => <Tag tone={tone}>{children}</Tag>,
  }
);
