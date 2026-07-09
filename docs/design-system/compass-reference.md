# Compass Design System — Code Reference

> Mirror of the **Compass** Figma DS (`a4BeKbsBGoHkcudhKXUJTl`) for code implementation in
> `apps/vs1-demo/ui`. Source of truth = the Figma foundation pages (read 2026-06, DS last updated
> 2026-05-02). This doc is the working reference for the token + component build.

## System totals (authoritative — Cover page is STALE)

The 🏠 Cover claims `120 Variables · 24 Text Styles · 7 Shadows · 37 Components`. The 🧭 Getting
Started page (2026-05-02) is current:

| Cover (stale) | **Actual** |
|---|---|
| 120 Variables | **174 tokens** |
| 24 Text Styles | **24** ✓ |
| 7 Shadows | **7 elevation styles** ✓ |
| 37 Components | **0 finalized** — 22 generic component pages *in progress* + 8 brand-specific *planned* + 3 coming-soon |

**10 pages finalized** = 7 Foundations (Color, Border, Elevation, Radius, Spacing, Grid, Typography)
+ 3 Brand (Brand Foundation, Brand Moments & Visual Codes, Component Manifest).

Token split: Color **74** · Typography **37** · Spacing **22** (14 numeric + 8 aliases) · Border **15**
(4 width + 11 color) · Radius **9** · Grid **23** · Elevation **7** styles.

## Page inventory (Compass file)

- **Intro:** 🏠 Cover · 🧭 Getting Started
- **BRAND:** 🎯 Brand Foundation · ✨ Brand Moments & Visual Codes · 📋 Component Manifest · 🗺️ Information Architecture · 🪪 Logo
- **FOUNDATIONS (finalized):** Color · Border · Elevation · Radius · Spacing · Grid · Typography
- **FOUNDATIONS (partial/next):** Blurring · Gradients · Shapes · Transparency
- **COMPONENTS (22, in progress):** Accordion · Alert · Avatar · Badge · Button · Divider · Forms · Icon · Progress · Tabbar · Cards · Tooltip · Bento · Breadcrumb · Header · Risk Badge · Modal · Drawer · Wizard · Empty State · Table · AppShell
- **COMING SOON:** Section Header · Testimonial Card · Hero

---

## 1 · Color (74 tokens · 6 namespaces)

**Brand anchors:** Petrol `#004D40` (brand anchor) · Gold `#D4AF37` (brand accent, used sparingly).

### Primitive scales (11 stops each)

**Petrol** (also carries the Risk-severity scale — *risk is never red*):
`50 #EBF1F0 · 100 #D1DFDD · 200 #A8C2BE · 300 #7AA29C · 400 #427B72 · 500 #004D40 ★ · 600 #002E26 (hover/active) · 700 #00231D · 800 #001612 · 900 #000B09 · 950 #000403`

**Gold** (scarcity — eyebrows, borders, active steps; never a fill):
`50 #FDF8E6 · 100 #FBEBBA · 200 #F8D882 · 300 #F4C44A · 400 #E6A514 · 500 #D4AF37 ★ · 600 #BCA033 · 700 #96802A · 800 #6A5B1E · 900 #3D3411 · 950 #1A1607`

**Neutral:**
`50 #FAFAFA · 100 #F4F4F5 · 200 #E5E7EB · 300 #D1D5DA · 400 #9CA3AF · 500 #6B7280 · 600 #5F5B5B · 700 #374151 · 800 #1F2937 · 900 #0F172A · 950 #030712`

**Status:** Success / Warning / Error / Info — full 11-stop scales each, with 4 banner surface
variants per status (`bg-light·text·border` / `bg-medium·text` / `bg-strong·text-on` / `bg·text-on`).

### Semantic namespaces (6)

- **color/bg/**: primary, secondary, tertiary, inverse, brand, brand-light, accent, accent-light, success, warning, error, info, info-light, info-medium
- **color/text/**: primary, secondary, tertiary, disabled, inverse, brand, accent, success, warning, error, info, on-brand, on-accent, on-info
- **color/border/**: default, strong, strong-a11y, input, brand, accent, focus, success, warning, error, info
- **color/interactive/**: primary, primary-hover (=petrol/600 #002E26), primary-active, primary-disabled, secondary, accent, accent-hover, danger, danger-hover, info, info-hover, info-active
- **color/icon/**: default, brand, accent, success, warning, error, info, inverse, disabled
- **risk/**: low, medium, high, critical · low-bg, medium-bg, high-bg, critical-bg · text-on-low, text-on-medium, text-on-high, text-on-critical

### Color doctrines

- **🚨 Risk in Petrol — NEVER red/yellow/green.** Risk severity is encoded on the petrol scale
  (lighter = less, darker = more). *"Risk ist eine Skala. Status ist ein Ereignis."* → `risk/*` and
  status (`success/warning/error/info`) are different token families. `risk/critical` is still petrol.
- **`color/border/focus`** (Petrol, 9.83:1) is **mandatory** on every interactive element, min 2px
  (`border/width/md`). Never `outline:none` without replacement.
- **Gold = scarcity**, never a fill. On gold write dark petrol, never white. Gold is **not** a
  premium/verified marker — Verified-Partner is a *pattern* (crown icon + label + border), not a color.

---

## 2 · Typography (37 tokens · 24 styles)

**Fonts:** IBM Plex Serif = Display only (**≥32pt**, hard boundary). **Inter** = everything else
(UI/headings/body/labels/captions). *NOT IBM Plex Sans* — 19 styles were repaired Plex Sans → Inter (2026-05).

Format below: `style — size/line-height/letter-spacing · font`.

- **Display (Plex Serif Bold):** `display/2xl 72/105/-2 ★` · `display/xl 60/110/-1` · `display/lg 48/110/-1` · `display/md 40/115/-0.5` · `display/sm 36/120/0`
- **Heading (Inter):** `h1 32/130/-0.5 Bold` · `h2 24/130/-0.3 Bold` · `h3 20/130/0 SemiBold` · `h4 18/140 SemiBold` · `h5 16/140 SemiBold` · `h6 14/140 SemiBold`
- **Body (Inter Regular):** `body/lg 18/160` · `body/md 16/160 ★` · `body/sm 14/160` · `body/xs 13/160` · + Medium variants `body/lg-medium · md-medium · sm-medium`
- **Label (Inter SemiBold):** `label/lg 16/140` · `label/md 14/140 ★` · `label/sm 12/140` · `label/xs 11/140/+2 (eyebrow, UPPERCASE)`
- **Caption (Inter Regular):** `caption/md 12/145` · `caption/sm 11/145`

Tabular numbers (`tnum`) mandatory for compliance data/tables. Max 3 sizes per view; hierarchy via
weight + spacing, not size inflation.

---

## 3 · Spacing (14 numeric + 8 aliases · base 4px)

Numeric `spacing/0–13` is **canonical**; t-shirt aliases are convenience. Never hardcode px; never mix
schemes in one component.

| Token | px | Alias | Use |
|---|---|---|---|
| spacing/0 | 0 | — | reset / full-bleed |
| spacing/1 | 2 | — | hairline gap |
| spacing/2 | 4 | xs | icon→label in buttons |
| spacing/3 | 8 | sm | compact inline cluster |
| spacing/4 | 12 | — | medium inline gap |
| spacing/5 | 16 | md | standard item gap |
| spacing/6 | 20 | — | comfortable inline gap |
| spacing/7 | 24 | lg | ★ card padding (desktop) |
| spacing/8 | 32 | xl | larger section gap |
| spacing/9 | 40 | — | sub-section gap |
| spacing/10 | 48 | 2xl | section-to-section |
| spacing/11 | 64 | 3xl | ★ foundation-section gap |
| spacing/12 | 80 | 4xl | hero-to-content |
| spacing/13 | 96 | — | ★ page-top padding |

---

## 4 · Radius (9 tokens · default 2xl/12px)

`none 0 (tables/code)` · `xs 2 (mini-chips)` · `sm 4 (buttons, inputs)` · `md 6 (selects, dropdowns)`
· `lg 8 (mobile card, toolbar)` · `xl 10 (modal content)` · **`2xl 12 ★ default card`** · `3xl 16
(hero, wizard-modal)` · `full 9999 (pill, avatar, dot)`.

Doctrine: 12px = soft-but-institutional (not boxy/Bundesbank @4px, not playful/Notion @24px).
Same radius on all 4 corners. Pills always `radius/full`.

---

## 5 · Elevation (7 effect styles · `Y/blur/alpha`)

`xs 0/1/2·5% (buttons resting, tooltips, chips)` · `sm 0/1/3·6% (<200px cards/dropdowns)` ·
**`md 0/4/6·8% (default card)`** · `lg 0/10/15·10% (hover, popover, notifications)` ·
`xl 0/20/25·12% (modals, drawers)` · `2xl 0/25/50·18% (top overlay, wizard-modal; sparingly)` ·
`inner 0/2/4·8% (pressed, inset)`.

5-layer hierarchy: 0 Page=none · 1 Card resting=md · 2 Card hover=lg · 3 Floating (modal/drawer)=xl ·
4 Top overlay=2xl. **On dark petrol surfaces, borders replace shadows** (`border/strong-a11y` for
separation, `border/accent` for accent). A11y: shadow is never the only signal (pair with
cursor/border/backdrop/color-shift); no shadow transition under `prefers-reduced-motion`.

---

## 6 · Border (4 widths + 11 colors)

**Widths:** `none 0` · `sm 1px (90% — cards/inputs/tables)` · `md 2px (active/focus/selected, a11y)`
· `lg 4px (accent — hero/verified, rare)`.

**Colors (with contrast):** `default 1.24:1 (decorative)` · `strong 1.48:1 (decorative)` ·
`strong-a11y 4.83:1 AA (UI-bearing/selected)` · `input 4.83:1 AA (mandatory for form inputs)` ·
`brand Petrol 9.83:1 AAA` · `accent Gold 2.10:1 (decorative, ok ≥2px)` · `focus Petrol 9.83:1 AAA
(mandatory)` · `success 3.04 AA · warning 2.65 (decorative) · error 4.10 AA · info 3.85 AA`.

Patterns: Card = `width/sm + border/default` · Input = `width/sm + border/input` (never default) ·
Focus = `width/md + border/focus` (mandatory) · Hero-Card = `width/sm + border/accent` · Selected =
`width/md + border/strong-a11y` (≥3:1).

---

## 7 · Grid & Containers (23 tokens) — the responsive system

**Breakpoints (6):** `xs 360 · sm 600 · md 768 · lg 1024 · xl 1440 ★ COMPASS · 2xl 1920`.

**Columns / margins / gutters:**
| Layout | Active | Cols | Margin | Gutter | Container |
|---|---|---|---|---|---|
| Mobile | <768 | 4 | 16 | 16 | sm 600 |
| Tablet | ≥768 (md) | 8 | 40 | 24 | md 768 |
| Desktop | ≥1024 (lg) | 12 | 80 | 32 | 2xl 1440 ★ |

**Container max-widths (5):** `sm 600 (reading/login/modal)` · `md 768 (article/body/wizard)` ·
`lg 1024 (app + sidebar)` · **`xl 1200 (★ standard marketing/hero)`** · `2xl 1440 (★ Compass max)`.

**Baseline:** 4px unit / 8px major. All vertical values are multiples of 4. Margins/gutters alias to
spacing (single source of truth).

→ **Provider landing page** uses `container/xl` = **1200px** content, reading column `container/md`
768px, fluid side margins 16→40→80.

---

## 8 · Components

**Brand-specific (8, all PLANNED — Component Manifest §):** WizardSurface · WizardStepper · RiskBadge ·
RecommendedSolutionCard · AlternativeOptionCard · VerifiedPartnerBadge · EngagementTimeline ·
DashboardSection. Generic primitives stay separate; these encode brand logic. Build order starts with
RiskBadge + WizardSurface.

**Generic component pages (22, in progress):** Accordion, Alert, Avatar, Badge, Button, Divider,
Forms, Icon, Progress, Tabbar, Cards, Tooltip, Bento, Breadcrumb, Header, Risk Badge, Modal, Drawer,
Wizard, Empty State, Table, AppShell.

Each Compass component manual (per Getting Started §07) documents: ① Anatomie · ② Variants & States ·
③ Props & API · ④ A11y · ⑤ Do/Don't · ⑥ Code-Snippet.

---

## 9 · Core doctrines (How to use Compass)

1. **Tokens, never hex** — if a value isn't a token, either create the token or rethink the idea.
2. **Text styles, never custom fonts** — pick a style; the 24 cover all cases.
3. **Risk in petrol scale, never red** — most defining visual brand code.
4. **Plex Serif only ≥32pt** — below it, Inter. Hard boundary.
5. Naming: `category/value` · `category/subcategory/value` · `namespace/role-on-context`
   (e.g. `color/text/on-petrol`) · `role/size` (t-shirt).
6. Voice: Calm · Structured · Active · Authoritative · Precise (calm first, precise last).
   Passes the "Notar · Bundesbank · Senior Consultant" test.

---

## 10 · Code mapping notes (divergences from current `apps/vs1-demo/ui`)

The existing code token bridge is ~70% aligned but has drift to fix in Phase A:

- **Petrol scale**: code `primary.*` uses `#E8F5E9…#004D40…#000504`; Compass petrol is
  `#EBF1F0…#004D40…#000403`. → Replace with Compass values (and it doubles as `risk/*`).
- **Spacing names**: code uses `1=4,2=8,…6=24,7=32`; Compass uses `spacing/0–13` (`/7=24`). → Adopt
  Compass numeric names + t-shirt aliases.
- **Radius**: code `md=8`; Compass `sm=4` for buttons, `2xl=12` default card. → Adopt Compass radius.
- **Missing**: `risk/*` tokens, `color/border/focus|input|strong-a11y`, the 6 semantic namespaces as
  CSS vars (`--color-bg-brand`, `--color-text-primary`…), `.dark` block, container tokens.
- **Fonts**: code already uses Inter (sans) + IBM Plex Serif (serif) ✓ — matches Compass.

Implementation lands in: `src/index.css` (primitive + semantic CSS vars + `.dark` scaffold),
`tailwind.config.js` (utilities `bg-brand`/`text-primary`/`border-default`/`ring-focus`/container
sizes), `tokens.json` (synced JSON mirror).

---

## 11 · Brand voice & persona (🎯 Brand Foundation)

**Brand in one sentence:** *"CompliHub360 ist die Orchestrierungsschicht zwischen Compliance-
Komplexität und unternehmerischer Realität."*

**Hero persona (design for this one person):** the **internationally expanding online merchant** —
SME 5–250 employees, no internal compliance function, often the operational right hand (E-commerce/
Operations/Office manager), who discovers compliance problems and argues for tools internally.
Supporting: Compliance Pro (power features), Beginner (good defaults + microcopy, no "Easy Mode"),
Provider (dignified, not the protagonist).

**Character — 5 adjectives, in priority order:** ① Calm (never alarmist) ② Structured (every screen
has a next step) ③ Active (we orchestrate, not just inform) ④ Authoritative (we sound like we know)
⑤ Precise (say what we mean, cite sources).

**Voice test:** could it appear in a notarial doc, a Bundesbank publication, or a quietly confident
senior consultant's email? If it sounds like a SaaS marketing landing page, rewrite. **Not:** warm ·
playful · legalistic · alarmist ("high penalties!") · enthusiastic (no `!`, no emojis, no "finally").

**Brand reflex:** informational ("I'll surely find that on CompliHub360") + agentic ("and they help
me implement it"). **5 cascading decisions:** Hero=merchant · reflex=info+agentic · Petrol #004D40 anchor
· Gold=second tone not paywall · Risk in petrol never red.

## 12 · Brand moments & visual codes (✨)

**5 brand moments** (where character is delivered or betrayed): ① **Risk Status** — the calm warning
(manageable, not threatening) ② **Wizard result** — the moment of truth ("we thought for you; here's
the right answer + why + next", not "47 options, good luck") ③ **Dashboard after login** — the welcome
back (sections: *Decide · Monitor · Inform*) ④ **Engagement Request** — the handover (SLA visible,
EngagementTimeline) ⑤ **First wizard step** — the entry door (full-bleed Petrol, one well-posed
question, sidebar of steps, single Gold CTA).

**4 visual codes** (identify CompliHub without a logo): ① **Petrol Layer Pattern** — surfaces filled in
dark petrol with light card-islands (#FFF/#F4F4F5) ② **Risk in Petrol severity scale** — never RYG; red
reserved for *true errors only* ③ **Plex Serif for Display** (≥32pt, hard boundary) ④ **Gold-on-Petrol
pill stepper** (wizard-exclusive).

## 13 · Surface doctrine & IA (🗺️)

**Surface hierarchy (selectivity gives the petrol pattern its power):** Marketing = **white** · Dashboard
= **neutral** · Wizard = **Petrol** · (Results/Provider per page). The Providers landing is *marketing →
white bg* with petrol/gold accents; risk chips still use the petrol `risk/*` scale, not red.

**Sitemap V2 (MVP) — canonical routes** (note: provider landing is **`/for-providers`**, not `/providers`):
- Marketing: `/` · `/how-it-works` · **`/for-providers`** · `/for-providers/apply` · `/solutions/{vat-tax,product-packaging,data-privacy}` · `/countries/{germany,uk}` · `/:country/:domain` · `/guides` · `/about` `/contact` `/trust` `/privacy` `/terms` `/impressum` `/cookies` `/gdpr`
- Assessment: `/start` · `/start/:wizardId/:step` · `/start/review` · `/results/:sessionId` · `/providers`
- App (auth): `/auth/*` · `/app` · `/app/sessions/*` · `/app/requests/*` · `/app/settings/*`
- Provider magic-link: `/provider/magic/:token{,/confirm,/reply,/decline}`
- System: `/404` `/500` `/maintenance` · newsletter/unsubscribe token routes

## 13b · Guidelines ↔ Screens reconciliation (CRITICAL)

**Rule: the screens are the pixel-truth.** The final code must reproduce exactly the UI defined in the
`CompliHub-360` screens file — not an idealized Compass interpretation. Where a screen diverges from the
written guideline, the screen wins and the guideline is updated to the "new brand."

**Verification (Providers landing, nodes 1784:1156 / 1789:830):** the screens **bind Compass library
variables directly** — verified resolved values: `bg/brand #004D40` · `bg/accent #D4AF37` ·
`text/primary #0F172A` · `text/secondary #5F5B5B` · `text/tertiary #6B7280` · `bg/primary #FFFFFF` ·
`bg/secondary #FAFAFA` · `border/subtle #F4F4F5` · `border/default #E5E7EB` · `radius/md 6` ·
`shadow/xl`. **Conclusion: guidelines ARE applied.** Risk/critical badges use the petrol/neutral palette
— **no red token** — consistent with "Risk in Petrol, never red."

**Operative token values for code (screen-aligned, override stale handoff-board snapshot):**
- `color/bg/primary` (marketing surface) = **#FFFFFF** · `color/bg/secondary` = **#FAFAFA**
  (NOT the warm `#FAFAF7 / #F5F5F2` from the old S1-Hero handoff board §6 — that was a stale local snapshot).
- All other semantic values match the Compass Color page.

**Known divergence to FIX in code (not the guideline):** the current `ProvidersHero.tsx` renders the
"2 critical priorities" marker with `bg-error-500` (red). That is a build error introduced before this
reconciliation — it must become `risk/*` petrol on the Hero redo (Phase D). No screen uses red for risk.

## 14 · Logo (🪪)

Round **360° mark** (gold/white) + **"CompliHub"** wordmark + tagline **"Compliance. Simplified."**.
Use the real DS logo instance — never a placeholder. Current `GlobalNav` uses a `CircleDot` placeholder
→ replace with the real 360° mark when the header is reworked.
