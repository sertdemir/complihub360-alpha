import figma from "@figma/code-connect";
import { Input } from "./Input";

figma.connect(
  Input,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=37:10",
  {
    props: {
      error: figma.enum("State", {
        Error: true,
        Default: undefined,
        Focus: undefined,
        Disabled: undefined,
      }),
      disabled: figma.enum("State", {
        Disabled: true,
        Default: undefined,
        Focus: undefined,
        Error: undefined,
      }),
      placeholder: figma.string("Placeholder"),
    },
    example: ({ error, disabled, placeholder }) => (
      <Input error={error} disabled={disabled} placeholder={placeholder} />
    ),
  }
);
