import figma from "@figma/code-connect";
import { Button } from "./Button";

figma.connect(
  Button,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=27:2",
  {
    props: {
      variant: figma.enum("Style", {
        Primary: "primary",
        Secondary: "secondary",
        Ghost: "ghost",
        Outline: "outline",
        Danger: "danger",
      }),
      size: figma.enum("Size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      disabled: figma.enum("State", {
        Disabled: true,
        Default: undefined,
        Hover: undefined,
        Focus: undefined,
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
