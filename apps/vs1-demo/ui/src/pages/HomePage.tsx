// ─── User / Entrepreneur landing page (index route) ──────────────────────────
// Figma: CompliHub-360 · "Landingpage/user" (node 1206:2)
//
// Section order follows the journey in Brand & Marketing Map V1 §4 rather than
// the order the sections happened to be built in:
//
//   1 Hero                → HomeHeroWorld         understand, two equal entries
//   2 Problem Recognition → ProblemRecognition    the reader recognises themselves
//   3 The instrument      → EntryDoorDemo         compact self-playing demo
//   4 Risk Map            → RiskMapShowcase       the instrument's RESULT, immediately
//   5 Provider Matching   → MatchShowcase         who acts on it (anonymous dossiers)
//   6 How It Works        → HowItWorksRoute       the frame, once the value is shown
//   7 Compliance areas    → DomainsKnows          breadth as evidence, not the story
//   8 Trust by showing    → TwoReflexes · BrandCodePreview
//
// Reordered on 2026-08-25 (user decision): instrument → result → people,
// with the five-stage route explaining the frame only afterwards.
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
  HowItWorksRoute,
  RiskMapShowcase,
  MatchShowcase,
  DomainsAtlas,
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
      {/* Reordered 2026-08-25: the wizard showcase flows straight into its
          RESULT (Risk Map), then into who acts on it (the merged difference
          section) — the how-it-works route explains the frame afterwards. */}
      {/* Showcase edition (canvas 2026-08-25, Mercury pattern): the Risk Map
          drives up onto the tinted panel. RiskMapSection stays available. */}
      <RiskMapShowcase />
      {/* Merged edition (canvas 2026-08-25): the partner preview and the
          difference pitch become one section — anonymous dossiers on the
          drifting ghost grid. MatchmakingDifference stays available. */}
      <MatchShowcase />
      {/* Route edition (canvas 2026-08-25, petrol band): the five stages as
          stations on the golden route. HowItWorksSteps stays available. */}
      <HowItWorksRoute />
      {/* Atlas edition (canvas 2026-08-25): the drawer content comes onto the
          page — rail left, the active area's dossier on the Gradient panel,
          CTA to the area page. DomainsKnows stays available. */}
      <DomainsAtlas />
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
