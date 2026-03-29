import figma from "@figma/code-connect";
import { WizardStepper } from "./WizardStepper";

// Maps Figma "Wizard Step" component to WizardStepper.
// The Figma component shows a single step atom; WizardStepper renders the full list.
figma.connect(
  WizardStepper,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=50:26",
  {
    props: {
      state: figma.enum("State", {
        Completed: "completed",
        Active: "active",
        Upcoming: "upcoming",
        Error: "error",
      }),
    },
    example: () => (
      <WizardStepper />
    ),
  }
);
