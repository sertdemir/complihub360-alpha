import figma from "@figma/code-connect";
import { FormField } from "./FormField";
import { Input } from "./Input";

// Code Connect: Compass "Form Field" (605:419) → FormField (label + control + helper).
figma.connect(
  FormField,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=605-419",
  {
    props: {
      size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      helper: figma.string("Helper Text"),
      error: figma.enum("State", { Error: "Please check this field.", Default: undefined, Focused: undefined, Filled: undefined, Disabled: undefined }),
      disabled: figma.enum("State", { Disabled: true, Default: undefined, Focused: undefined, Filled: undefined, Error: undefined }),
    },
    example: ({ size, helper, error, disabled }) => (
      <FormField label="Label" htmlFor="field" size={size} helper={helper} error={error} disabled={disabled}>
        <Input id="field" inputSize={size} error={Boolean(error)} disabled={disabled} placeholder="Enter a value" />
      </FormField>
    ),
  }
);
