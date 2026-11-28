import figma from "@figma/code-connect";
import { Banner, BannerLink } from "./Banner";

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

// Code Connect: Compass "Alert Strip" (2277:198) → Banner variant="strip".
// Aktionen stehen unter dem Text: Show Action / Show Action 2 → actions mit BannerLink.
figma.connect(
  Banner,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=2277-198",
  {
    props: {
      status: figma.enum("Status", { Info: "info", Success: "success", Warning: "warning", Error: "error", Brand: "brand", Accent: "accent" }),
      surface: figma.enum("Surface", { Light: "light", Medium: "medium", Strong: "strong", Solid: "solid" }),
      title: figma.string("Title"),
      description: figma.string("Description"),
    },
    example: ({ status, surface, title, description }) => (
      <Banner
        variant="strip"
        status={status}
        surface={surface}
        title={title}
        onClose={() => {}}
        closeLabel="Hinweis schließen"
        actions={
          <>
            <BannerLink href="#">Beta-Vereinbarung lesen</BannerLink>
            <BannerLink href="#">Wieder anmelden</BannerLink>
          </>
        }
      >
        {description}
      </Banner>
    ),
  }
);
