import figma from "@figma/code-connect";
import { Drawer } from "./Drawer";

// Code Connect: Compass "Drawer Surface" (948:449) → Drawer. Size → size; the Type
// (Detail/Edit/Picker/SubWizard) is expressed via the header + body/footer content.
figma.connect(
  Drawer,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=948-449",
  {
    props: {
      size: figma.enum("Size", { SM: "sm", MD: "md", L: "lg", Mobile: "md" }),
    },
    example: ({ size }) => (
      <Drawer open onClose={() => {}} size={size} eyebrow="Domain" title="VAT & Tax">
        Drawer body content.
      </Drawer>
    ),
  }
);
