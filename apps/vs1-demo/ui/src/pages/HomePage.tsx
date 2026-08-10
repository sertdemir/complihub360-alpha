// ─── User / Entrepreneur landing page (index route) ──────────────────────────
// Figma: CompliHub-360 · "Landingpage/user" (node 1206:2)
//
// Section order follows the journey in Brand & Marketing Map V1 §4 rather than
// the order the sections happened to be built in:
//
//   1 Hero                → HomeHero              understand, two equal entries
//   2 Problem Recognition → ProblemRecognition    NEW — the reader recognises themselves
//   3 How It Works        → still missing         see note below
//   4 Risk Map            → RiskMapSection        the result, as the marketing hero
//   5 Provider Matching   → MatchmakingDifference a consequence of clarity
//   6 Compliance areas    → DomainsKnows          breadth as evidence, not the story
//   7 Trust by showing    → TwoReflexes · BrandCodePreview
//   8 Final CTA           → EntryDoor
//
// What actually moved: Problem Recognition is new at position 2, DomainsKnows
// now precedes the two trust sections, and HowItActs moved after them. Despite
// its name HowItActs is NOT the How-It-Works section — it carries id
// "engagement" and covers cost, response SLA and the engagement trail, which is
// where the header's "Pricing" anchor points. It belongs late, near the FAQ.
//
// The report's position 3 (Understand → Assess → Decide → Match → Act) has no
// section yet. It arrives with the /how-it-works page and slots in between
// ProblemRecognition and RiskMapSection.
//
// Anchor order matters: the header's scroll-spy nav lists how-it-works,
// what-we-know, brand-code, engagement — which under this order appear at
// positions 4, 5, 7 and 8, so the nav highlights in document order.
//
// Built screens-led on the Compass DS, section by section.

import {
  HomeHero,
  ProblemRecognition,
  RiskMapSection,
  MatchmakingDifference,
  DomainsKnows,
  TwoReflexes,
  BrandCodePreview,
  HowItActs,
  BeyondAssessment,
  HomeFaq,
  EntryDoor,
  NewsletterBand,
  SiteFooter,
} from '../components/home';

export function HomePage() {
  return (
    <main className="bg-white">
      <HomeHero wizard="animated" />
      <ProblemRecognition />
      <RiskMapSection />
      <MatchmakingDifference />
      <DomainsKnows />
      <TwoReflexes />
      <BrandCodePreview />
      <HowItActs />
      <BeyondAssessment />
      <HomeFaq />
      <EntryDoor />
      <NewsletterBand />
      <SiteFooter />
    </main>
  );
}
