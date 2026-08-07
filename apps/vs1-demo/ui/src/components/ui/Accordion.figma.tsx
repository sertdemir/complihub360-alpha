import figma from "@figma/code-connect";
import { Accordion, AccordionItem } from "./Accordion";

// Code Connect: Compass "Accordion" component set (573:2) → Accordion + AccordionItem.
// Figma models a single disclosure item; in code an Accordion groups one or more
// AccordionItems. Variants map to props; the Title/Content text + Disabled state
// flow through to the item. Open/Hover are runtime states, not code props.
figma.connect(
  Accordion,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=573-2",
  {
    props: {
      size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
      styleVariant: figma.enum("Style", { Default: "default", Filled: "filled", Ghost: "ghost" }),
      disabled: figma.enum("State", { Disabled: true, Collapsed: false, Expanded: false, Hover: false }),
    },
    example: ({ size, styleVariant, disabled }) => (
      <Accordion type="single" styleVariant={styleVariant} size={size}>
        <AccordionItem value="item" title="Section title" disabled={disabled}>
          Section content goes here.
        </AccordionItem>
      </Accordion>
    ),
  }
);
