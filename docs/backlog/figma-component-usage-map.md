# Design-File Screen Inventory & Component Usage Map

> Source: `CompliHub-360` design file (`0tJtkBs5hsgswwBi9m1slJ`). **Screens are the lead** for every
> component. Compass component pages (file `a4BeKbsBGoHkcudhKXUJTl`) are the cross-reference; where a
> Compass page is stale, update it from the screen specs/assets. Each component ships **twice**: React +
> Storybook story AND a Compass Figma page (docs/variants/properties).

## Design-file pages

| Page | id | Screens |
|---|---|---|
| **Landingpages** | 1199:402 | `Landingpage/user` (home) D+M · `Landingpage/providers` D+M · UC-example + drawer + hover-state frames |
| **Wizard** | 1199:403 | Sections: 01 Markets · 02 Operations · 03 Domains · 04 Review · 05 Risk Map (each D+M result) |
| **Login** | 1199:405 | Companies · Provider |
| **Provider Onboarding** | 1199:406 | 01 Account · 02 Firm · 03 Coverage · 04 Verification · 05 Tooling · 06 Review & Activate (D+M) |
| **Dashboards** | 1199:404 | User + Provider dashboards (AppShell-based) |
| **Drawer, Modale, Overlays** | 1840:4594 | overlay variants (nested) |
| Local Components (handoff) | 1583:2659 | S1 Hero dev-handoff board |
| Assets | 1840:2294 | icons / illustrations / world map |
| Discovery · Wireframes · Design · Archiv | — | pre-work / archive |

## A. True components (Figma instances used across screens)

| Component | Uses (sampled) | Where | Compass page |
|---|---|---|---|
| **Icon** | 100s | all screens | 🔣 Icon 352:2 |
| **Risk Badge** | 28 (landing) + heavy (wizard) | risk maps, obligation cards, hero/matchmaking | ⚠️ Risk Badge 726:2 |
| **Avatar** | 11 | partner cards, profiles | 🪪 Avatar 472:2 |
| **Logo** | several | headers, result top bars | 🪪 Logo 242:199 |
| **Button** | few (most CTAs are local frames!) | primary actions | 🔘 Button 308:3 |
| **Header** (Marketing Desktop · Floating Mobile) | per page | landing/result chrome | 🎩 Header 704:2 |
| **AppShell** (Sidebar · Topbar · Domain Bar; Provider+User) | 15+15+7+7 | dashboards | 🧩 AppShell 974:2 |
| **Wizard Surface** (Step preview) | 2 | wizard, landing preview | 🧙 Wizard 744:2 + brand |
| **Drawer** (Domain D/M) | 2 | domain drawers | 🪟 Drawer 948:2 |
| **Subscribe Button** | 3 | footer newsletter | (Button variant) |

## B. DS-uptake — recurring LOCAL frames → must become components

These are drawn as local frames across screens (not yet instances) and recur enough to componentize.

| Pattern | Seen as | Compass page |
|---|---|---|
| **Badge / Chip** | `Chip · NEW`, `94% match`, `Active · 3`, `SPONSORED`, `BETA`, tier pills | 🏷 Badge 516:2 |
| **Card** | obligation card · result card · partner card · dashboard card · pricing card · brand-code card | 🃏 Cards 663:2 |
| **State Tag** | `Confirmed` · `Likely — confirm to refine` (icon + label status) | (Badge/status variant) |
| **Input / FormField / Select / Textarea** | onboarding (6 steps), login, register, wizard inputs | 📝 Forms 595:2 |
| **Stepper** | wizard 1–5 · onboarding 1–6 (Gold-on-Petrol pill stepper) | ⏳ Progress 536:2 + WizardStepper (brand) |
| **Stat / Metric** | risk-map stats (8 obligations · €25k · 14 days) · performance metrics | DashboardSection (brand) |
| **Tabs / Tabbar** | `Active / Archive` · dashboard sub-views | ⊟ Tabbar 607:2 |
| **Accordion** | FAQ (S5) | ≡ Accordion 570:2 |
| **Alert / Banner** | early-warning · `GUEST MAP · EXPIRES IN 30 MIN` guest bar | 🚨 Alert 439:2 |
| **Tooltip** | hovers | 💬 Tooltip 683:2 |
| **Table** | dashboard data | 📊 Table 786:2 |
| **Divider · Breadcrumb · Progress · Empty State · Modal · Bento** | various | 528:2 · 698:2 · 536:2 · 775:2 · 737:2 · 688:2 |

## C. Brand-specific components (Compass Manifest — all planned)

WizardSurface · WizardStepper · RiskBadge ✓ · RecommendedSolutionCard · AlternativeOptionCard ·
VerifiedPartnerBadge · EngagementTimeline · DashboardSection. Source: screens (wizard result, dashboard,
engagement, provider profile).

## D. Build order (usage-frequency × screen need)

1. **Icon system** · **RiskBadge** · **Badge/Chip** · **Button** · **Card** · **Avatar** — highest usage
2. **Forms** (Input/Select/Textarea/Checkbox/Radio/FormField) · **Tabs** · **Accordion** · **Alert** · **Divider** · **Tooltip** · **Stat**
3. **Header** · **AppShell** · **Drawer** · **Modal** · **Table** · **Stepper/Progress** · **Breadcrumb** · **EmptyState**
4. **Brand**: WizardSurface · WizardStepper · RecommendedSolutionCard · VerifiedPartnerBadge · EngagementTimeline · DashboardSection

Each: read Compass page → reconcile vs screen usages (screens win, update Compass if stale) → build React + Story → build Compass Figma page → verify.

## E. Mode map — CONFIRMED 2026-06-05 (sampled bg fills)

**Every component must ship BOTH light + dark** (user toggles modes at runtime). Derive each
variant from the screen that actually uses it.

| Surface area | Mode | Bg sampled | Notes |
|---|---|---|---|
| **User Dashboard v1** (all, D+M) | **DARK** | `#1F2937` (panel-form slate) | Home/Sessions/Detail/Requests/Domains/Tax&VAT |
| **Provider Dashboard** (pre-downgrade etc.) | **DARK** | `#0F172A` | sticky warning banner + inline alert card |
| **Wizard** (all domains) | **DARK** | `#0F172A` | Data Privacy · Tax&VAT · EPR · Marketing · Corporate · Full Support |
| **Login / Onboarding** | **DARK** | per app-workspace-dark-tokens.md | slate panels + petrol-green cards |
| **Marketing landings** | **LIGHT** | `#FFFFFF` | home · Services · Solutions · ComplianceAreas · Resources · Advisory-A · AiGov-A |
| **Marketing dark sections** | **DARK** | `#004D40` / `#0A1F1C` | SystemExplainer-B · Platform-B · Advisory-B · AiGovernance-B (petrol bands) |

**Two distinct darks:** App = **slate** (`#0F172A` / `#1F2937`, per [app-workspace-dark-tokens.md](app-workspace-dark-tokens.md));
Marketing dark bands = **petrol** (`#004D40`). Don't conflate.

**Alert / Banner real usages (screens are lead, NOT the light Compass Alert):**
- Provider dashboard **sticky top banner** — amber/warning, white title `#fff` + desc `#fff@85%`, action link + close ✕ (dark).
- Provider dashboard **inline alert card** — "Pre-downgrade warning", warn icon + title + body + nested fix-list (dark).
- Marketing **guest bar** — "GUEST MAP · EXPIRES IN 30 MIN" (light/petrol).
- Payment-failure **Alert** = Compass `Status=Error, Surface=Strong`.
- At-risk KPIs use **amber**, never red.
