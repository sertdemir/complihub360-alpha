import figma from "@figma/code-connect";
import { Select } from "./Select";

// Code Connect: Compass "Select" (599:182) → Select.
figma.connect(
  Select,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=599-182",
  {
    props: {
      inputSize: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      variant: figma.enum("Style", { Outlined: "outlined", "Filled-BG": "filled" }),
      error: figma.enum("State", { Error: true, Default: undefined, Hover: undefined, Focused: undefined, Filled: undefined, Disabled: undefined }),
      disabled: figma.enum("State", { Disabled: true, Default: undefined, Hover: undefined, Focused: undefined, Filled: undefined, Error: undefined }),
    },
    example: ({ inputSize, variant, error, disabled }) => (
      <Select inputSize={inputSize} variant={variant} error={error} disabled={disabled} defaultValue="de">
        <option value="de">Germany</option>
        <option value="fr">France</option>
      </Select>
    ),
  }
);
