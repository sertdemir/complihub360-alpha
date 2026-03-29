import figma from "@figma/code-connect";
import { Checkbox } from "./Checkbox";

figma.connect(
  Checkbox,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=40:20",
  {
    props: {
      checked: figma.enum("Checked", {
        true: true,
        false: false,
        indeterminate: "indeterminate",
      }),
      disabled: figma.enum("State", {
        Disabled: true,
        Default: undefined,
      }),
      label: figma.string("Label"),
    },
    example: ({ checked, disabled, label }) => (
      <Checkbox
        defaultChecked={!!checked}
        disabled={disabled}
        label={label}
      />
    ),
  }
);
