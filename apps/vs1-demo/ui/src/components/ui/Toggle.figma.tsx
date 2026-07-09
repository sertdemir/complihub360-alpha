import figma from "@figma/code-connect";
import { Toggle } from "./Toggle";

// Code Connect: Compass "Toggle" (603:155) → Toggle.
figma.connect(
  Toggle,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=603-155",
  {
    props: {
      size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      label: figma.string("Label"),
      checked: figma.enum("State", { On: true, Off: false, Hover: undefined, Error: undefined, Disabled: undefined }),
      error: figma.enum("State", { Error: true, On: undefined, Off: undefined, Hover: undefined, Disabled: undefined }),
      disabled: figma.enum("State", { Disabled: true, On: undefined, Off: undefined, Hover: undefined, Error: undefined }),
    },
    example: ({ size, label, checked, error, disabled }) => (
      <Toggle size={size} label={label} defaultChecked={checked} error={error} disabled={disabled} />
    ),
  }
);
