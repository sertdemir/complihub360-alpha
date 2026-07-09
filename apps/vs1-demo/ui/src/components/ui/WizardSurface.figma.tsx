import figma from "@figma/code-connect";
import { WizardSurface } from "./WizardSurface";

// Code Connect: Compass "Wizard Surface" set (751:903) → WizardSurface.
// Axes: Layout (Vertical Stepper · Horizontal Stepper) × Step (1–4 of 4).
// Layout → stepperOrientation. Steps + eyebrow/title/description are instance
// content; the example uses representative content.
figma.connect(
  WizardSurface,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=751-903",
  {
    props: {
      stepperOrientation: figma.enum("Layout", {
        "Vertical Stepper": "vertical",
        "Horizontal Stepper": "horizontal",
      }),
    },
    example: ({ stepperOrientation }) => (
      <WizardSurface
        steps={[
          { label: "Profile" },
          { label: "Domains" },
          { label: "Matching" },
          { label: "Review" },
        ]}
        current={1}
        eyebrow="Onboarding"
        title="Set up your profile"
        description="Tell us about your business."
        stepperOrientation={stepperOrientation}
      >
        Step body
      </WizardSurface>
    ),
  }
);
