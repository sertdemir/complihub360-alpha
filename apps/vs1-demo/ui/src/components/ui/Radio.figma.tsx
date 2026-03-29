import figma from "@figma/code-connect";
import { Radio } from "./Radio";

figma.connect(
  Radio,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=41:14",
  {
    props: {
      checked: figma.enum("Selected", {
        true: true,
        false: false,
      }),
      disabled: figma.enum("State", {
        Disabled: true,
        Default: undefined,
      }),
      label: figma.string("Label"),
    },
    example: ({ checked, disabled, label }) => (
      <Radio defaultChecked={checked} disabled={disabled} label={label} />
    ),
  }
);
