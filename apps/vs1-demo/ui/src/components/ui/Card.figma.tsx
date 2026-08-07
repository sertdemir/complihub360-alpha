import figma from "@figma/code-connect";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./Card";

// Code Connect: Compass "Card Base" set (664:50) → Card.
// Style → styleVariant (Outlined·Filled·Elevated); State (Default·Hover·Selected·
// Disabled) maps to interactive/selected/disabled props (Hover is CSS-driven).
figma.connect(
  Card,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=664-50",
  {
    props: {
      styleVariant: figma.enum("Style", { Outlined: "outlined", Filled: "filled", Elevated: "elevated" }),
      selected: figma.enum("State", { Selected: true, Default: false, Hover: false, Disabled: false }),
      disabled: figma.enum("State", { Disabled: true, Default: false, Hover: false, Selected: false }),
    },
    example: ({ styleVariant, selected, disabled }) => (
      <Card styleVariant={styleVariant} selected={selected} disabled={disabled}>
        <CardHeader>
          <CardTitle>Card title</CardTitle>
          <CardDescription>Supporting description.</CardDescription>
        </CardHeader>
        <CardContent>{/* card content */}</CardContent>
      </Card>
    ),
  }
);
