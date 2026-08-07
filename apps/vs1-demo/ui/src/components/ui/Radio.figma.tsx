import figma from "@figma/code-connect";
import { Radio } from "./Radio";

// Code Connect: Compass "Radio Button" set (602:137) → Radio.
// Axes: Size (SM·MD·LG) × Type (Without Label·With Label) × State
// (Unselected·Selected·Hover·Error·Disabled). Hover is CSS-driven.
figma.connect(
  Radio,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=602-137",
  {
    props: {
      size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      label: figma.string("Label"),
      checked: figma.enum("State", {
        Selected: true,
        Unselected: false,
        Hover: false,
        Error: false,
        Disabled: false,
      }),
      error: figma.enum("State", {
        Error: true,
        Selected: false,
        Unselected: false,
        Hover: false,
        Disabled: false,
      }),
      disabled: figma.enum("State", {
        Disabled: true,
        Selected: false,
        Unselected: false,
        Hover: false,
        Error: false,
      }),
    },
    example: ({ size, label, checked, error, disabled }) => (
      <Radio size={size} defaultChecked={checked} error={error} disabled={disabled} label={label} />
    ),
  }
);
