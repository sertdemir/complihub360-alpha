import figma from "@figma/code-connect";
import { SelectMenu } from "./SelectMenu";

// Code Connect: Compass "Select Dropdown Open" set (638:524) → SelectMenu.
// (Option rows correspond to Compass "Select Option Item" 637:401.)
// Axes: Size (SM·MD·LG) × Style (Outlined·Filled-BG). Options are instance
// children; the example uses representative content.
figma.connect(
  SelectMenu,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=638-524",
  {
    props: {
      inputSize: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      variant: figma.enum("Style", { Outlined: "outlined", "Filled-BG": "filled" }),
    },
    example: ({ inputSize, variant }) => (
      <SelectMenu
        inputSize={inputSize}
        variant={variant}
        defaultOpen
        placeholder="Choose a domain"
        defaultValue="gdpr"
        options={[
          { value: "tax", label: "Tax & VAT", description: "Registration, filing, OSS" },
          { value: "gdpr", label: "GDPR & Data", description: "DPA, records, DSARs" },
          { value: "epr", label: "EPR", description: "Packaging, WEEE, batteries" },
        ]}
      />
    ),
  }
);
