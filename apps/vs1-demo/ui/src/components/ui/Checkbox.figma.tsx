import figma from "@figma/code-connect";
import { Checkbox } from "./Checkbox";

// Code Connect: Compass "Checkbox" set (600:137) → Checkbox.
// Axes: Size (SM·MD·LG) × Type (Without Label·With Label) × State
// (Unchecked·Checked·Indeterminate·Error·Disabled).
figma.connect(
  Checkbox,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=600-137",
  {
    props: {
      size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      label: figma.string("Label"),
      checked: figma.enum("State", {
        Checked: true,
        Unchecked: false,
        Indeterminate: false,
        Error: false,
        Disabled: false,
      }),
      indeterminate: figma.enum("State", {
        Indeterminate: true,
        Checked: false,
        Unchecked: false,
        Error: false,
        Disabled: false,
      }),
      error: figma.enum("State", {
        Error: true,
        Checked: false,
        Unchecked: false,
        Indeterminate: false,
        Disabled: false,
      }),
      disabled: figma.enum("State", {
        Disabled: true,
        Checked: false,
        Unchecked: false,
        Indeterminate: false,
        Error: false,
      }),
    },
    example: ({ size, label, checked, indeterminate, error, disabled }) => (
      <Checkbox
        size={size}
        label={label}
        defaultChecked={checked}
        indeterminate={indeterminate}
        error={error}
        disabled={disabled}
      />
    ),
  }
);
