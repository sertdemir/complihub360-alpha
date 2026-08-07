import figma from "@figma/code-connect";
import { Input } from "./Input";

// Code Connect: Compass "Text Input" (597:2) → Input.
// Size → inputSize, Style → variant, State → error/disabled flags, Value → value.
figma.connect(
  Input,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=597-2",
  {
    props: {
      inputSize: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      variant: figma.enum("Style", { Outlined: "outlined", "Filled-BG": "filled" }),
      error: figma.enum("State", { Error: true, Default: undefined, Hover: undefined, Focused: undefined, Filled: undefined, Disabled: undefined }),
      disabled: figma.enum("State", { Disabled: true, Default: undefined, Hover: undefined, Focused: undefined, Filled: undefined, Error: undefined }),
      value: figma.string("Value"),
    },
    example: ({ inputSize, variant, error, disabled, value }) => (
      <Input inputSize={inputSize} variant={variant} error={error} disabled={disabled} defaultValue={value} placeholder="Enter a value" />
    ),
  }
);
