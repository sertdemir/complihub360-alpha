# Figma → Code Tracker (CompliHub-360 screens · `0tJtkBs5hsgswwBi9m1slJ`)

Source of truth for the final UI = the **Figma design-file screens**, not legacy code pages.
Build each screen faithfully (desktop + mobile), responsive at every breakpoint, verified by
screenshot-compare against Figma before moving on. Tokens come from Compass (see
`docs/design-system/compass-reference.md`).

## Status legend
todo · wip · done · verified ✓

## Phase C — Compass component inventory (Compass → Storybook → Code)

Each component derives from its Compass page; mirrored as a Storybook page + DS component.

| Component | Compass page | Code | Storybook | Status |
|---|---|---|---|---|
| Button | 308:3 🔘 Button | components/ui/Button.tsx | Components/Button | done (sizes fixed to 32/40/48 px; gold-accent + hover) |
| Logo | 242:199 🪪 Logo (set 712:266) | components/ui/Logo.tsx | Foundations/Logo | done · verified ✓ (lockup × tone, exact vector + Inter 16/10) |
| MarketingHeader | 704:2 🎩 Header | components/layout/MarketingHeader.tsx | Components/MarketingHeader | done · verified ✓ (wired via SiteHeader on landing routes) |
| RiskBadge / RiskDot | 726:2 ⚠️ Risk Badge | components/ui/RiskBadge.tsx | Components/RiskBadge | done · verified ✓ (4 risk × 4 style × 3 size; exact petrol tokens, never red) |
| Badge / Chip / Tag | 516:2 🏷 Badge | — | — | todo (408 variants: Badge · Dot · Filter Chip · Tag) |
| Accordion · Alert · Avatar · Card · Forms · Tooltip · Tabbar · Divider · Modal · Drawer · Table · Empty State · Breadcrumb · Bento · Progress · Icon | (Compass COMPONENTS pages) | — | — | todo |

## Providers landing (`Landingpage/providers` · desktop 1784:1156 · mobile 1808:838)

| Section | Desktop node | Mobile node | Target file | Status |
|---|---|---|---|---|
| S1 Hero | 1786:932 | 1808:849 | components/providers/ProvidersHero.tsx | done · verified ✓ (DS tokens + Container; desktop/wide/mobile @ 1440/1900/390) |
| S1 Matchmaking | 1789:830 | — | components/providers/MatchmakingSection.tsx | todo |
| S2 Dashboard | 1792:814 | — | components/providers/DashboardSection.tsx | todo |
| S3 Performance | 1798:817 | — | components/providers/PerformanceSection.tsx | todo |
| S4 Two Channels | 1799:822 | — | components/providers/TwoChannelsSection.tsx | todo |
| S5 FAQ | 1800:829 | — | components/providers/FaqSection.tsx | todo |
| S6 Register | 1801:837 | — | components/providers/RegisterSection.tsx | todo |
| S9 Footer | 1784:1713 | — | components/providers/MarketingFooter.tsx | todo |

## ⚠️ S1 Hero — rebuild spec (Phase D · faithful)

**Desktop (1786:932):** two-column — left: eyebrow → headline (serif, gold "actually") → subcopy →
CTAs → trust chips → founding-specialist list; right: full "Partner Inbox" sample card. Verify the
hero is **full-bleed/full-width** and content width matches Figma (container/xl 1200 centered; the
current proto uses max-w-7xl and reads too narrow — confirm against Figma on rebuild).

**Mobile (1808:849, 390w) — order differs from a naive stack (current proto is WRONG):**
1. Eyebrow `FOR VERIFIED PARTNERS · BETA`
2. Headline (serif, "actually" gold)
3. Subcopy
4. **Compact Partner-Inbox preview** (condensed card: NEW + 94% match chips · `D2C · DE · UK · NL` ·
   `€2M—€5M · 2 Critical priorities` · gold `Accept →` + `€92 on accept`) — sits **right after the
   subcopy**, NOT at the bottom.
5. Founding-specialist list (3 rows; first row active w/ petrol left-border)
6. CTAs (`Apply for Beta cohort` primary + `See how matching works →`)
7. Trust chips — mobile wording: `No upfront fee · no subscription` / `Pay only on accepted
   engagements` / `Founding-Partner badge through Beta`
8. `ONE INCOMING REQUEST · SAMPLE` label + micro line `Dashboard-only · One-click Accept · Pay $100 on accept`

Implementation note: the inbox visual must render between subcopy and CTAs on mobile but in the right
column on desktop → use CSS `order`/grid-area per breakpoint (don't duplicate the node).

**Known fix:** risk/critical markers must use `risk/*` petrol, NOT `bg-error-500` (red) — see reference §13b.

Refs (downloaded): `.claude/figma-refs/1784-1156/s1-hero.png` (desktop) · `s1-hero-mobile.png` (mobile).
