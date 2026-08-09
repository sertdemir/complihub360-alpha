// ─── User / Entrepreneur landing page (index route) ──────────────────────────
// Figma: CompliHub-360 · "Landingpage/user" (node 1206:2)
// Sections: S1 Hero · S2 Single Proof Line · S2.5 Matchmaking Difference ·
//           S3 Two Reflexes · S4 What CompliHub Knows · S5 How CompliHub Acts ·
//           S6 Brand Code Preview · S7 Beyond the Assessment · S7.5 FAQ ·
//           S8 The Entry Door · S9 Newsletter + Footer
// Built screens-led on the Compass DS, section by section.

import {
  HomeHero,
  RiskMapSection,
  MatchmakingDifference,
  TwoReflexes,
  DomainsKnows,
  HowItActs,
  BrandCodePreview,
  BeyondAssessment,
  HomeFaq,
  EntryDoor,
  NewsletterBand,
  SiteFooter,
} from '../components/home';

export function HomePage() {
  return (
    <main className="bg-white">
      <HomeHero wizard="animated" entry="search" />
      <RiskMapSection />
      <MatchmakingDifference />
      <TwoReflexes />
      <DomainsKnows />
      <HowItActs />
      <BrandCodePreview />
      <BeyondAssessment />
      <HomeFaq />
      <EntryDoor />
      <NewsletterBand />
      <SiteFooter />
    </main>
  );
}
