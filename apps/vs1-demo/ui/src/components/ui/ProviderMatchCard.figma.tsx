import figma from "@figma/code-connect";
import { ProviderMatchCard } from "./ProviderMatchCard";

// Code Connect: Compass "Provider Match Card" (1530:628) -> ProviderMatchCard.
// Tags / countries / rating / responseTime are not Figma component properties
// (they are per-provider data) — supplied from the data layer in code.
figma.connect(
  ProviderMatchCard,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1530-628",
  {
    props: {
      title: figma.string("Title"),
      eyebrow: figma.string("Eyebrow"),
      match: figma.string("Match"),
      rating: figma.string("Rating"),
      billing: figma.string("Billing"),
      isVerified: figma.boolean("isVerified"),
      matchTier: figma.enum("Match Tier", {
        High: "high",
        Strong: "strong",
        Moderate: "moderate",
      }),
    },
    example: ({ title, eyebrow, match, matchTier, isVerified, rating, billing }) => (
      <ProviderMatchCard
        title={title} eyebrow={eyebrow} match={match} matchTier={matchTier}
        isVerified={isVerified}
        tags={["VAT & OSS", "E-Commerce", "EU-weit"]}
        countries="IT · DE · EN"
        rating={rating}
        responseTime="Ø 3 Std. Antwortzeit"
        billing={billing}
      />
    ),
  }
);
