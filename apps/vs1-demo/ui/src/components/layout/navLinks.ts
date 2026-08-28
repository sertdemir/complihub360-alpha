// ─── The header navigation, once ─────────────────────────────────────────────
// Both headers — the landing page's MarketingHeader and the GlobalNav every
// other route renders — MUST present the same navigation. Until 2026-08-28
// each of them carried its own copy of the five entries with a comment asking
// the reader to keep them in sync; this file is that promise made structural.
//
// The six destinations (user decision 2026-08-28): how the model works, what
// we cover, where it applies, WHO it is for, what it costs, and why to trust
// it. "Solutions" (the by-role page) moved up from the footer; "Trust &
// Security" (/ai-governance, the Trust Center) replaced its footer-only
// existence; "Resources" moved DOWN into the footer — the library is part of
// the dashboard offering, and the header is for the marketing story.

export interface HeaderNavLink {
  /** Path below the locale, e.g. 'markets'. */
  to: string;
  labelKey: string;
  labelDefault: string;
  /** Which mega-menu this entry opens on desktop instead of navigating. */
  sheet?: 'areas' | 'markets';
}

export const HEADER_NAV_LINKS: HeaderNavLink[] = [
  { to: 'how-it-works', labelKey: 'header.nav.howItWorks', labelDefault: 'How it works' },
  // "Für wen" sits directly beside "So funktioniert es" (user ask
  // 2026-08-28), mirroring the footer's Plattform column: the how and the
  // who belong together, before the what (areas) and the where (markets).
  { to: 'solutions', labelKey: 'header.nav.solutions', labelDefault: 'Who it is for' },
  { to: 'compliance', labelKey: 'header.nav.complianceAreas', labelDefault: 'Compliance areas', sheet: 'areas' },
  { to: 'markets', labelKey: 'header.nav.markets', labelDefault: 'Markets', sheet: 'markets' },
  { to: 'pricing', labelKey: 'header.nav.pricing', labelDefault: 'Pricing' },
  { to: 'ai-governance', labelKey: 'header.nav.trust', labelDefault: 'Trust & Security' },
];
