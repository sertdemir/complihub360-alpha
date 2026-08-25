// ─── User / Entrepreneur landing page (index route) ──────────────────────────
// Figma: CompliHub-360 · "Landingpage/user" (node 1206:2)
//
// Section order follows the journey in Brand & Marketing Map V1 §4 rather than
// the order the sections happened to be built in:
//
//   1 Hero                → HomeHeroWorld         understand, two equal entries
//   2 Problem Recognition → ProblemRecognition    the reader recognises themselves
//   3 The instrument      → EntryDoorDemo         compact self-playing demo
//   4 How It Works        → HowItWorksSteps       the five stages, condensed
//   5 Risk Map            → RiskMapSection        the result, as the marketing hero
//   6 Provider Matching   → MatchmakingDifference a consequence of clarity
//   7 Compliance areas    → DomainsKnows          breadth as evidence, not the story
//   8 Trust by showing    → TwoReflexes · BrandCodePreview
//
// EntryDoor moved from last to third on 2026-08-20; on 2026-08-25 the slot
// switched to EntryDoorDemo (canvas review: the 1440×1071 frosted-glass
// instrument dominated the page). The homepage now embeds NO interactive
// wizard — the demo self-plays at ~518 px, and every CTA opens the real
// wizard full-screen on the /:locale/wizard route.
//
// What actually moved: Problem Recognition is new at position 2, DomainsKnows
// now precedes the two trust sections, and HowItActs moved after them. Despite
// its name HowItActs is NOT the How-It-Works section — it carries id
// "engagement" and covers cost, response SLA and the engagement trail, which is
// where the header's "Pricing" anchor points. It belongs late, near the FAQ.
//
// HowItWorksSteps shares its copy with the /how-it-works page (common.json →
// howItWorks.*) instead of restating it, so the homepage summary and the full
// page cannot drift apart.
//
// (The former note about anchor order is gone with the scroll-spy: the header
// became a multipager nav on 2026-08-18 and no longer tracks section anchors,
// so section order is a narrative decision only.)
//
// Built screens-led on the Compass DS, section by section.

import {
  HomeHeroWorld,
  ProblemRecognition,
  HowItWorksSteps,
  RiskMapSection,
  MatchmakingDifference,
  DomainsKnows,
  TwoReflexes,
  BrandCodePreview,
  HowItActs,
  BeyondAssessment,
  HomeFaq,
  EntryDoorDemo,
  NewsletterBand,
  SiteFooter,
} from '../components/home';

export function HomePage() {
  return (
    <main className="bg-white">
      {/* World-map hero (canvas 2026-08-24). HomeHero stays available — this
          swaps the usage only; `<HomeHero wizard="animated" entry="search" />`
          brings the wizard-led hero back. */}
      <HomeHeroWorld />
      <ProblemRecognition />
      {/* Demo edition (canvas 2026-08-25, Mercury pattern): the compact
          self-playing wizard beside the pitch. EntryDoor stays available —
          `<EntryDoor />` brings the full frosted-glass instrument back. */}
      <EntryDoorDemo />
      <HowItWorksSteps />
      <RiskMapSection />
      <MatchmakingDifference />
      <DomainsKnows />
      <TwoReflexes />
      <BrandCodePreview />
      <HowItActs />
      <BeyondAssessment />
      <HomeFaq />
      <NewsletterBand />
      <SiteFooter />
    </main>
  );
}
