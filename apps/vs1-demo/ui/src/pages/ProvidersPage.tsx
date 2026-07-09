import {
  ProvidersHero,
  MatchmakingSection,
  OneStopDashboardSection,
  PerformanceSection,
  ChannelsSection,
  FAQSection,
  RegisterSection,
  BetaFooterSection,
} from '../components/providers';

// ─── Provider / Partner acquisition landing page ─────────────────────────────
// Figma: CompliHub-360 · "Landingpage/providers" (node 1784:1156)
// Sections: S1 Hero · S1 Matchmaking · S2 Dashboard · S3 Performance ·
//           S4 Two Channels · S5 FAQ · S6 Register · S9 Footer

export function ProvidersPage() {
  return (
    <main className="bg-white">
      <ProvidersHero />
      <MatchmakingSection />
      <OneStopDashboardSection />
      <PerformanceSection />
      <ChannelsSection />
      <FAQSection />
      <RegisterSection />
      <BetaFooterSection />
    </main>
  );
}
