import figma from "@figma/code-connect";
import { DomainCard } from "./DomainCard";

// Code Connect: Compass "Domain Card" (1267:530) → DomainCard.
// Eyebrow / Title / Meta are TEXT properties; surface is tokenized
// (bg/brand-light + border/brand), so the same instance renders light + dark.
figma.connect(
  DomainCard,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1267-530",
  {
    props: {
      eyebrow: figma.string("Eyebrow"),
      title: figma.string("Title"),
      meta: figma.string("Meta"),
    },
    example: ({ eyebrow, title, meta }) => (
      <DomainCard eyebrow={eyebrow} title={title} meta={meta} />
    ),
  }
);
