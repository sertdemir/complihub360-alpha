import figma from "@figma/code-connect";
import { Banner } from "./Banner";

// Code Connect: Compass "Alert" component set (445:2) → Banner.
// Status → status; Title → title; Description → children; Show Close → onClose.
// The Compass Alert is mode-aware (Color collection has Light + Dark modes); the
// Banner mirrors it in code with Tailwind `dark:` variants. Surface=Light/Medium
// maps to the Banner's translucent-tint treatment; the full-bleed sticky-banner
// usage from the dashboards is the Banner `variant="strip"`.
figma.connect(
  Banner,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=445-2",
  {
    props: {
      status: figma.enum("Status", { Info: "info", Success: "success", Warning: "warning", Error: "error" }),
      title: figma.string("Title"),
      description: figma.string("Description"),
    },
    example: ({ status, title, description }) => (
      <Banner status={status} title={title} onClose={() => {}}>
        {description}
      </Banner>
    ),
  }
);
