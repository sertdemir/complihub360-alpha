import figma from "@figma/code-connect";
import { ServicesAccordion } from "./ServicesAccordion";

// Maps Figma "Accordion" component to ServicesAccordion layout component.
figma.connect(
  ServicesAccordion,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=50:38",
  {
    props: {
      expanded: figma.enum("State", {
        Expanded: true,
        Collapsed: false,
      }),
    },
    example: () => <ServicesAccordion />,
  }
);
