import figma from "@figma/code-connect";
import { Textarea } from "./Textarea";

// Code Connect: Compass "Textarea" (598:38) → Textarea.
figma.connect(
  Textarea,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=598-38",
  {
    props: {
      inputSize: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      error: figma.enum("State", { Error: true, Default: undefined, Hover: undefined, Focused: undefined, Filled: undefined, Disabled: undefined }),
      disabled: figma.enum("State", { Disabled: true, Default: undefined, Hover: undefined, Focused: undefined, Filled: undefined, Error: undefined }),
      value: figma.string("Value"),
    },
    example: ({ inputSize, error, disabled, value }) => (
      <Textarea inputSize={inputSize} error={error} disabled={disabled} defaultValue={value} placeholder="Enter details…" />
    ),
  }
);
