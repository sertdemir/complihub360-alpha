import figma from "@figma/code-connect";
import { Button } from "./Button";

// Code Connect: Compass "Button" component set (311:434; Success/Warning/Error/Info
// symbols live under 421:x in the same set). Compass axes: Style × Size × State.
// Style: Error → code `danger`; Compass Warning has no 1:1 code variant (omitted).
figma.connect(
  Button,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=311-434",
  {
    props: {
      variant: figma.enum("Style", {
        Primary: "primary",
        Secondary: "secondary",
        Ghost: "ghost",
        Success: "success",
        Error: "danger",
        Info: "info",
        Accent: "accent",
      }),
      size: figma.enum("Size", {
        Small: "sm",
        Medium: "md",
        Large: "lg",
      }),
      disabled: figma.enum("State", {
        Disabled: true,
        Default: undefined,
        Hover: undefined,
        Pressed: undefined,
        Focus: undefined,
        Loading: undefined,
      }),
      children: figma.string("Label"),
    },
    example: ({ variant, size, disabled, children }) => (
      <Button variant={variant} size={size} disabled={disabled}>
        {children}
      </Button>
    ),
  }
);
