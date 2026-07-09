# Compass Backlog — Design-System Uptake from Wizard Build

**Status:** OPEN — patterns shipped in wireframes, awaiting DS uptake
**Created:** 2026-05-15 · last updated 2026-05-16 (Steps 1–5 complete)
**Trigger:** Wizard Steps 1 → 5 build (Markets expansion + Operations affordances + Domains skip/full-coverage + (i)-affordance rollout + Review edge cases + Edit-Drawer pattern + Post-Generate Loading + Risk Map fourth state + Answer / Obligation drawers)
**Figma file:** `CompliHub-360` → Page `Wizard`
**Companion doc:** [`wizard-markets-expansion-us-tr.md`](./wizard-markets-expansion-us-tr.md) (backend coverage)
**Owner of this work:** `compass` skill, not `360-design`

---

## Why this exists

Building the Wizard Step 1 Markets expansion forced several patterns into the project file that should live in Compass instead. Each item below was built ad-hoc to ship the wireframe spec — and **must be hoisted into Compass** before the next surface that needs them. Otherwise we drift toward inconsistency: Wizard Step 1 looks one way, Step 2 builds its own checkbox, Step 3 builds its own drawer, and Compass loses authority.

Process: `360-design` flags. `compass` picks up. The project file consumes the canonical components afterwards. The current implementations in the project file are placeholders to be replaced by Compass instances once landed.

---

## 1. `Drawer · Picker` — new component (or `Drawer · Domain` variant extension)

**What exists in Compass today**
- `Drawer · Domain (Desktop)` — component set on `Local Components (Compass?)` page, key `1601:1562`, variants: `Domain=VAT`, `Domain=EPR`, (likely more). Each variant is a read-only domain explainer: eyebrow `DOMAIN` + serif H1 + Active-in line + paragraph + two check-list sections + gold CTA.
- `Drawer · Domain (Mobile)` — same shape at 390×780 with drag-handle.

**What was built in the wireframe (Wizard / Others Drawer)**
- Same chrome (top bar, body, sticky footer, gold CTA)
- But body is a **multi-select picker**: title + Active-line (`2 selected · 12 available` in petrol) + paragraph + **search input** + two sections of selectable country rows (checkbox + name + hint)
- Footer CTA dynamic: `Add N markets`

**Decision needed**
- **Option A:** Extend `Drawer · Domain` with a `Mode=Picker` variant property orthogonal to `Domain=*`. Gets messy fast — domain content and picker content share little.
- **Option B (recommended):** New component set `Drawer · Picker (Desktop)` + `Drawer · Picker (Mobile)` that *shares the chrome* (top bar, footer, eyebrow style, serif H1, body padding, drag handle on mobile) but exposes different body slots: `Search slot`, `Section header slot` (multiple), `Row list slot`. Implement chrome via nested components so Domain and Picker visually align.
- **Option C:** Build a low-level `Drawer · Shell` component with slots (top bar, body, footer) and let Domain/Picker compose it.

**Reference IDs**
- Desktop drawer instance built in wireframe: `1698:293` (in `1698:291` wrapper)
- Mobile drawer instance built in wireframe: `1699:278` (in `1699:276` wrapper)

**Acceptance**
- Two new components published from Compass (or one component set with mode variants)
- Existing Domain drawers untouched OR refactored onto the shared shell without visual diff
- Picker drawer supports props for: title, eyebrow, active-line, paragraph, sections with country rows, footer subtitle, CTA label + dynamic count

---

## 2. `Card · Country` — new component (current pattern is inline)

**What exists today**
- Inline frames named `Card — DE`, `Card — UK`, ..., `Card — US`, `Card — TR`, `Card — Others` in the Wizard Step 1 grid. Two states: Default (white + border-subtle) and Selected (petrol-tint fill + petrol stroke + check icon).

**What it should be**
- Component set `Card · Country` with:
  - Property `State` = `Default | Selected | Disabled`
  - Property `Width` = `Auto | Fixed-282 | Fixed-165 | Fill` (or just `Variant=Desktop-3col | Mobile-2col | Mobile-Full`)
  - Property `Country` (text) — bound title
  - Property `Hint` (text) — bound caption
  - Property `HasIcon` (boolean) — present in Selected state, absent in Default

**Why now**
- 6 EU markets + 3 new markets = 9 cards in production. The next domain (Operations cards Step 2, Domains cards Step 3) uses a near-identical card pattern but currently as separate inline frames. Without a `Card · Country` (or general `Card · Choice`) component, every step re-implements the pattern, drift is inevitable.

---

## 3. `Card · Country / State=Selected` with count pill (Others-style)

**What exists today**
- `Card — Others (Selected, 3)` built inline in States panel — petrol-tinted fill, petrol stroke, title + `3` count pill (petrol@10% bg, petrol text) + check icon, caption listing selected countries.

**What it should be**
- A variant of `Card · Country` with `HasCount=true` property — slot for a count pill.
- Count pill itself should be a tiny atom (see #6 below).

**Reference**
- States panel built in wireframe: `1700:276` showing Default vs Selected for Desktop (282) + Mobile (342) sizes.

---

## 4. `Checkbox` atom — new component

**What exists today**
- Inline 16×16 (drawer rows) and 20×20 (modal — now deprecated) checkbox frames. Two states baked in: Default (transparent fill + 1.5px gray border) and Selected (petrol fill + petrol border + white check glyph).

**What it should be**
- `Checkbox` atom with:
  - Property `State` = `Default | Hover | Checked | Indeterminate | Disabled`
  - Property `Size` = `Sm (16) | Md (20)`
  - Token-bound fills/strokes — no hardcoded petrol
- Lives under Compass `📝 Forms` page.

---

## 5. `Search Input` atom — new component

**What exists today**
- Inline frame in Other Markets drawer: rounded-10 input with `⌕` glyph + placeholder text, white bg + border-subtle stroke.

**What it should be**
- `Search Input` atom with:
  - Property `State` = `Default | Focus | Filled | Disabled | Error`
  - Property `Size` = `Sm | Md | Lg`
  - Slots: `Leading icon`, `Placeholder text`, `Trailing icon` (clear button)
- Lives under Compass `📝 Forms` page.

---

## 6. `Pill · Count` atom — new component

**What exists today**
- Inline rounded-999 pill with petrol@10% bg + petrol text, padding 8/2, used as Others-card count indicator.

**What it should be**
- `Pill · Count` atom in Compass `🏷 Badge` page (sibling of Risk Badge):
  - Property `Tone` = `Neutral | Petrol | Gold | Danger | Success`
  - Property `Size` = `Sm | Md`
  - Text slot for number/label
- Token-bound, no hardcoded color.

---

## 7. `Risk Badge / State=Coverage expanding` — variant (spec finalized 2026-05-16)

**Context:** Documented in detail in companion doc [`wizard-markets-expansion-us-tr.md`](./wizard-markets-expansion-us-tr.md). Currently Risk Badge has Critical/High/Medium variants. Backend returns a fourth state when a selected market is outside current coverage.

**Visual spec (now built in wireframes)**
- Neutral grey pill (text/tertiary-bound stroke + bg/tertiary @15% fill — NOT a petrol-tinted pill since severity is undetermined)
- Label text: "Coverage expanding" (Inter Semi Bold 10/11, letter-spacing 6%, text/tertiary)
- Distinct from petrol-toned Critical/High/Medium pills used for confidently-mapped obligations
- Pairs with an outlined (not filled) action button "Connect with pilot partner →" in the State column — also distinct from the petrol-filled "Answer 2 questions" Depends-action button
- Row sorts to the bottom of the Risk Map table (after Medium-severity rows)

**Acceptance**
- New variant added to existing Risk Badge component
- Token-bound (no hardcoded greys — see #8 for petrol-strong + neutral-strong scales)
- Backend property: `obligation.coverage_status === "expanding"` triggers the variant

**Reference**
- Visual: Step 5 Obligation-State Variants panel (`1771:540`), row #4
- Row treatment: `Connect with pilot partner →` outlined button atom in same panel

---

## 8. Petrol-strong token + Petrol-tint scale

**What exists today**
- Hardcoded usages across the Wizard:
  - Petrol `#0E5249` on the active stepper dot + Next button (already documented in Wizard DEV-HANDOFF)
  - Petrol 6% opacity on selected card fill
  - Petrol 10% opacity on count pill bg
  - Petrol used directly as text color on `Active in: …` lines and count text — there IS a `text/brand-petrol` token (VariableID:.../214:2) for text usage, good

**What's missing**
- A solid-fill petrol token at `color/brand/petrol/strong` (the `#0E5249`-ish hue used for buttons + active dots). Today the gold CTA is bound to a `brand/gold` token — petrol-strong should match the pattern.
- A petrol opacity scale (`color/brand/petrol/06`, `color/brand/petrol/10`, `color/brand/petrol/20`) for selected fills, count pill backgrounds, hover states. Today these are inline opacity hacks.

**Acceptance**
- Variables added to the Color collection in the appropriate scope (`FRAME_FILL`, `SHAPE_FILL`)
- Existing Wizard inline hardcodes refactored to consume the tokens (`360-design` does the refactor in the project file once tokens are available)

---

## 9. Bottom-sheet pattern documentation

**What exists today**
- `Drawer · Domain (Mobile)` is a bottom-sheet: 390×780 anchored at y=64 (leaves 64px backdrop sliver on top), rounded top corners 20, drag-handle 40×4 at top, top bar 48, body 609, sticky footer 103.

**What's missing**
- The pattern isn't documented anywhere. The numbers are reverse-engineered from the existing instance. A new builder either copies an existing drawer (good) or guesses (drift).

**Acceptance**
- Add documentation page or component description capturing:
  - Default bottom-sheet height (780 of 844 viewport)
  - Drag-handle dimensions and position
  - Top corner radius
  - Footer sticky pattern
  - Backdrop color/opacity (slate 4-8-10 @ 55%)
  - When to use full-height drawer vs partial bottom-sheet

---

## 10. Country chip-row (post-picker state — speculative)

**What exists today**
- Nothing yet. Speculation: after a user picks markets via the Others drawer, the headline grid on Step 1 may want to show the selected non-headline countries as small chips below the grid (e.g. `Selected via Others: Switzerland · Sweden · Norway × clear`).

**What it might be**
- A `Chip · Country` atom (small rounded pill with country code + name + remove-X)
- A chip-row container that wraps multiple chips with a leading label

**Status:** Not built. Flagged only as a likely-next pattern. Decide on need before designing.

---

## Suggested execution order for `compass` skill

**Foundations (small, unblock everything):**
1. **#8 Petrol tokens** — every other item benefits from these
2. **#4 Checkbox atom** + **#6 Pill · Count atom** + **#11 Icon · Info atom** + **#17 Icon Square atom** — atomic primitives
3. **#5 Search input atom** — useful beyond the drawer

**Card layer (replace inline wizard frames):**
4. **#14 Card · Country** (extends #2 with `HasInfoAffordance` + `HasCount`)
5. **#15 Card · BusinessModel** (sibling, with `HasExpansion` for Other)
6. **#16 Card · Domain** (with `Icon Square` slot + `IsOverride` for Full Coverage)

**Drawer layer (depends on cards + atoms):**
7. **#12 Drawer · Country** (new component set mirroring Drawer · Domain)
8. **#13 Drawer · BusinessModel** (sibling)
9. **#1 Drawer · Picker** (Other Markets — depends on #4 + #5)
10. **#18 Drawer · Edit** (scoped multi-select edits from Step 4 Review — depends on #14, #15, #16)
11. **#20 Drawer · Answer** (sub-wizard for Step 5 Depends-on-X resolution)
12. **#21 Drawer · Obligation** (row-detail view from Risk Map — depends on #22 Penalty Box)

**Risk / status (depends on petrol tokens + new pill atoms):**
13. **#23 Severity Pill** atom (Critical / High / Medium / Coverage-Expanding)
14. **#24 State Indicator** atom (Confirmed / Likely / Action / Coverage-Action)
15. **#22 Penalty Box** atom (used in Drawer · Obligation)
16. **#7 Risk Badge / Coverage-expanding** — spec finalized; depends on #23

**Background / wait states:**
17. **#19 Post-Generate Loading pattern** (Loader · Pulse + Progress · Linear + Step Tracker atoms)

**Documentation / speculative:**
18. **#9 Bottom-sheet pattern docs** — anytime
19. **#10 Country chip-row** — only if/when needed

---

## 11. Info Affordance `(i)` — new atom + card-level integration

**What exists today (2026-05-15)**
- A custom-built `Info icon` frame: 16×16 circular border, "i" glyph centered, stroke + text bound to `text/tertiary` token. Wrapped in a 24×24 click target.
- **Rolled out across 19 cards in canonical wizard frames:**
  - Step 1 Desktop (`1649:2`) — all 8 country cards: DE · UK · NL · FR · IT · ES · US · TR (Others card excluded — it's a drawer trigger)
  - Step 2 Desktop (`1655:49`) — 5 BM cards: D2C · B2B · Marketplace · SaaS · Hybrid (Other card excluded — has its own text input interaction)
  - Step 3 Desktop (`1650:5494`) — all 6 domain cards: VAT · EPR · GDPR · Marketing · Corporate · Full Coverage
- Pattern spec: `Card · Domain — Drawer Affordance Pattern` panel (node `1731:438`).

**What it should be in Compass**
- `Icon · Info` atom under Compass `🔣 Icon` page:
  - 16×16 outline-style, with 1.25px stroke
  - Color bound to `text/tertiary` (default) and `text/primary` (hover)
  - Variant for filled state if needed for future
- `Click target wrapper` standard atom for tap-zone hygiene (24×24 transparent frame around small icons) — also used by close-X in drawers.

**Behavior (consistent across all card types)**
- Click on card body → toggles selection (existing behavior, unchanged).
- Click on `(i)` glyph → opens a context-appropriate drawer:
  - Step 1 country card `(i)` → opens `Drawer · Country` (NEW — see item 12 below)
  - Step 2 BM card `(i)` → opens `Drawer · BusinessModel` (NEW — see item 13 below)
  - Step 3 domain card `(i)` → opens existing Compass `Drawer · Domain` matching variant
- Selection state is unchanged by `(i)` click.
- Disabled-state cards (e.g. Step 3 cards when Full Coverage is on) → `(i)` is still clickable at 0.5 opacity.

**Acceptance**
- `Icon · Info` published as Compass atom
- All cards in `Card · Country` / `Card · BusinessModel` / `Card · Domain` components expose `(i)` slot
- `360-design` refactors the canonical wizard frames to instantiate these components once shipped

---

## 12. `Drawer · Country` — new component (mirror of `Drawer · Domain`)

**What's missing**
- The `(i)` glyph on Step 1 country cards needs a Compass drawer to open — explaining the regulatory regime for that country (registration thresholds, primary tax codes, packaging registers, e-invoicing mandates).

**Concrete example built (2026-05-15):** Germany Country Drawer at node `1740:428` on the Wizard page. Demonstrates the full pattern: MARKET eyebrow, IBM Plex Serif Bold 36px H1 ("Germany"), petrol Active-regime line ("Active regime: VAT · OSS · LUCID · GwG"), paragraph explaining the regulatory landscape, WHAT WE COVER section with 6 check-list items (VAT/OSS, LUCID, VerpackG, GwG, distance-selling, reverse-charge UStG §13b), WHEN THIS MATTERS section with 3 triggers, sticky footer with subtitle and gold "See if this applies to you" CTA. Use this as the visual + content template for the other 8 country variants.

**Content seeds per variant**

| Country | Active regime | What we cover | When this matters |
|---|---|---|---|
| DE | VAT · OSS · LUCID · GwG | VAT/OSS returns · LUCID + VerpackG ecomod · GwG beneficial-owner · distance-selling · reverse-charge UStG §13b | Ship physical goods into DE · cross-border B2C ≥ €10k · Amazon FBA-DE |
| UK | VAT · PackUK · CTR | VAT registration · PackUK EPR + ecomod · digital-services tax · Companies House filings · post-Brexit MOSS replacement | Ship physical goods into UK · register UK Ltd · join Amazon FBA-UK |
| NL | VAT · WEEE · GwG-EU | VAT/OSS returns · WEEE producer registration · Stichting OPEN packaging · ANBI/Holding filings | Ship physical goods into NL · use Rotterdam as EU import hub |
| FR | VAT · AGEC · EPR · CITEO | VAT/OSS · AGEC ecomod (broader than DE) · CITEO packaging registry · WEEE Eco-systèmes | Ship into FR · French marketplace presence · DIY/electronics catalog |
| IT | VAT · CONAI · REACH | VAT/OSS · CONAI packaging contribution · SISTRI waste tracking · REACH for chemicals · sdi e-invoicing | Ship into IT · cosmetic/chemical/DIY catalog · e-fattura compliant invoicing |
| ES | VAT · Ecoembes · SII | VAT/OSS · Ecoembes packaging · WEEE Ecolec/Ecotic · SII real-time invoicing (large taxpayers) | Ship into ES · large-revenue threshold · register with mercantile registry |
| US | State sales tax · Marketplace facilitator · CCPA/CPRA | State-by-state sales-tax nexus (CA, NY, TX, FL, WA pilot) · marketplace facilitator flags · resale certificates · CCPA/CPRA privacy · 1099-K reporting | Inventory in any state · cross $100k/200 txn threshold per state · marketplace seller |
| TR | KDV · e-Fatura · e-Arşiv · e-Defter | KDV registration + filing · e-Fatura/e-Arşiv mandate ≥ 3M TRY · e-İrsaliye delivery notes · e-Defter ledger · withholding tax (stopaj) | Revenue ≥ 3M TRY · cross-border digital services to TR consumers · DDP shipments |
| Other (Search) | Variable per country | Catch-all coverage; routes to Verified Partner inquiry form | User picks a country outside the headline 8 |

**Construction**
- `Drawer · Country (Desktop)` component set, mirror of existing `Drawer · Domain (Desktop)` (key `1601:1562`):
  - Variants: `Country=DE`, `Country=UK`, `Country=NL`, `Country=FR`, `Country=IT`, `Country=ES`, `Country=US`, `Country=TR`, `Country=Other`
  - Same chrome (top bar with `MARKET` eyebrow + close, body, sticky footer with gold CTA "See if this applies to you")
  - Body sections: Title block · Paragraph · WHAT WE COVER · WHEN THIS MATTERS
- `Drawer · Country (Mobile)` bottom-sheet variant, mirror of `Drawer · Domain (Mobile)`.

**Backend dependency**
- Content lookups pulled from API: `/api/countries/{code}/regulatory-profile` returning `{name, active_regime[], obligations[{title, statute, penalty}], triggers[]}`. See [`wizard-markets-expansion-us-tr.md`](./wizard-markets-expansion-us-tr.md) for full data model.

---

## 13. `Drawer · BusinessModel` — new component

**What's missing**
- The `(i)` glyph on Step 2 BM cards needs a drawer explaining business-model compliance implications.

**What it should be**
- `Drawer · BusinessModel (Desktop)` component set:
  - Variants: `Model=D2C`, `Model=B2B`, `Model=Marketplace`, `Model=SaaS`, `Model=Hybrid`
  - Same chrome as Domain/Country drawers, `BUSINESS MODEL` eyebrow
  - Body sections: `Typical compliance footprint`, `Common pitfalls`, `When this is decisive`

**Why this matters**
- Marketplace especially has heavy regulatory implications (marketplace-facilitator rules in US, OSS / IOSS for EU, intermediary liability). Currently buried — the drawer makes it scannable.

---

## 14. `Card · Country` — new component (was implied in item 2, now concrete)

The `Card · Country` component (item 2) must expose:
- Property `State` = `Default | Selected | Disabled`
- Property `Width` = `Desktop-3col (282) | Mobile-2col (165) | Mobile-Full (342)`
- Property `Country` (text) — bound title
- Property `Hint` (text) — bound caption
- Property `HasInfoAffordance` (boolean, default `true`) — exposes `(i)` slot wired to `Drawer · Country`
- Property `HasCount` (boolean, default `false`) — for the Others variant only (count pill)

---

## 15. `Card · BusinessModel` — new component

Sibling of `Card · Country`:
- Property `State` = `Default | Selected | Disabled` (this is single-select — selecting one auto-deselects the others, owned by parent form-control)
- Property `Width` = `Desktop-3col (282) | Mobile-2col (165)`
- Property `Title` + `Description` (text)
- Property `HasInfoAffordance` (boolean, default `true`)
- Property `HasExpansion` (boolean, default `false`) — for `Model=Other`, exposes the inline text-input expansion below the card grid

---

## 16. `Card · Domain` — new component (extends item 2 logic with icon-square)

Building on item 2 + item 3, the Domain card is distinct from Country/BusinessModel:
- Property `State` = `Default | Selected | Disabled (Full Coverage on)`
- Property `Width` = `Desktop-3col (309) | Mobile-2col (165)`
- Property `Domain` (instance-swap) → exposes the `Icon Square` slot (32×32 with petrol-tint fill + domain glyph)
- Property `Title` + `Description` (text)
- Property `HasInfoAffordance` (boolean, default `true`)
- Property `IsOverride` (boolean, default `false`) — for `Domain=FullCoverage` only, signals to parent form-control that this card toggles others into disabled state

---

## 17. `Icon Square` — new atom

**What exists**
- 32×32 frame with petrol-tint fill at 8% opacity, contains a 32×32 domain icon instance. Used in Step 3 Domain cards.

**What it should be**
- Atom under Compass `🔣 Icon` page (or new container subpage):
  - Property `Tone` = `Petrol (default) | Gold | Neutral`
  - Property `Size` = `Sm (24) | Md (32) | Lg (40)`
  - Slot for inner icon instance (any Compass icon)
- Used wherever a contained-icon-on-tinted-square pattern appears (Domain cards today; possibly Verified Partner badges, status indicators tomorrow).

---

## 18. `Drawer · Edit` — new component set (scoped edit replaces destructive-confirm)

**What exists today (2026-05-15)**
- Edit-Markets Drawer built inline in Wizard Step 4 (node `1750:471`).
  - 520×900 right-anchored, dim backdrop
  - `EDIT · MARKETS` eyebrow, Plex Serif "Edit markets" H1, petrol "N selected · changes apply on Confirm" subline
  - 2-col compact country card grid (220×76 cards) with full (i) affordance per card
  - Others trigger as full-width card
  - Sticky footer: Cancel link + Gold "Update markets →" CTA
- The pattern replaces the originally-considered destructive-confirm modal — edits are scoped within the drawer, Cancel reverts cleanly, no destructive side-effects on Step 1-3 selections.

**What it should be in Compass**
- `Drawer · Edit (Desktop)` component set:
  - Property `Section` = `Markets | Operations | Domains`
  - Each variant exposes a different body slot:
    - `Section=Markets`: country card grid (2-col compact) + Others trigger
    - `Section=Operations`: BM card grid (2-col compact) + Revenue chips row
    - `Section=Domains`: domain card grid (2-col compact) + Full Coverage toggle-override
  - Property `SelectedCount` (number) — drives the petrol subline
  - Property `CtaCopy` (text) — dynamic: "Update markets" / "Update operations" / "Update domains"
- `Drawer · Edit (Mobile)` bottom-sheet variant.

**Why this pattern matters**
- Eliminates the "Edit → jump back to Step N → user loses context → user has to navigate forward through valid-state replay" anti-pattern.
- Removes the need for a destructive-confirm modal (which would be needed because Editing Markets in Step 1 might invalidate Step 3 domain selections).
- Keeps the user on Step 4 throughout — the Conversion Climax screen — preserving the "almost done" momentum.
- Symmetric with the Other-Markets Picker Drawer pattern already built (item #1) — both are scoped multi-select transactions with the same chrome.

**Acceptance**
- Component set published with 3 variants (Markets, Operations, Domains) for Desktop + Mobile
- Body slots delegate to `Card · Country`, `Card · BusinessModel`, `Card · Domain` instance arrays
- CTA text bound to dynamic property; selection-count auto-computed
- Cancel returns to host screen without committing; Update emits an event with the new selection state

**Reference IDs**
- Edit Markets Drawer Desktop: `1750:471`
- (Edit Operations Drawer, Edit Domains Drawer — deferred until component set ships)

---

## 19. Post-Generate Loading State — new pattern (not a component, a state spec)

**What exists today**
- Built inline at Step 4 Post-Generate Loading Desktop (`1757:527`).
- Pulse circle 64×64 (petrol@12% outer, 32×32 solid petrol inner with ↻ glyph) — animated rotation 1.2s linear infinite.
- Progress bar 480×6, petrol fill at progressing percentage, light-gray track.
- Three-step status list (Markets mapped → Obligations matched → Matching Partners…) with check / open-circle markers.
- Headline state copy "Analyzing your situation…" in Plex Serif, plus subline "Mapping N obligations across M markets · checking partner availability".

**What should live in Compass**
- `Loader · Pulse` atom (64/32 nested circles in petrol, animated)
- `Progress · Linear` atom (bar with petrol fill, customizable height + percentage)
- `Step Tracker · Vertical` pattern (list of items with state=done/active/pending markers)
- Pattern documentation for "background-task wait state" with copy guidelines (truthful timer expectation, escape-hatch after threshold)

**Reference**
- Visual spec: `1757:527`

---

## 20. `Drawer · Answer` — sub-wizard for Depends-on-X resolution

**What exists today (2026-05-16)**
- DPIA-for-tracking-pixels Drawer · Answer Desktop built at node `1774:540`.
- 520×900 right-anchored drawer with dim backdrop.
- Eyebrow: `ANSWER · [OBLIGATION TITLE]`
- Plex Serif H1 "Two quick questions" + petrol subline "Resolves this obligation from Depends to Confirmed"
- Helper paragraph framing anonymity + edit-anytime promise
- Question blocks: each shows "QUESTION N OF M" label + Inter Semi Bold 16 question + 3-option radio list (radios use the same petrol-tint + check pattern as Step 1 card selection)
- Sticky footer: Cancel link + Gold "Resolve obligation →" CTA

**What it should be in Compass**
- `Drawer · Answer (Desktop)` + `Drawer · Answer (Mobile)` component set:
  - Property `Questions` (slot for 2-4 question blocks)
  - Property `ObligationTitle` (text — drives eyebrow)
  - Property `SubtitleCopy` (text — "Two quick questions" or "Three quick questions")
- Question block as nested component:
  - Property `QuestionNumber` + `QuestionTotal` (drives "QUESTION N OF M" label)
  - Property `QuestionText` (Inter Semi Bold 16)
  - Property `Options` (slot for radio options, single-select)

**Resolution behaviors (drive payload from backend)**
- Answers map to "obligation applies" → row transitions to Confirmed state, stats bar unchanged
- Answers map to "obligation doesn't apply" → row fades out, stats bar updates (e.g. 8 obligations → 7)
- Ambiguous answers → row stays Depends but with refined sub-label

**Tracking**
- `wizard_step5_answer_drawer_opened{obligation_id}`
- `wizard_step5_answer_drawer_resolved{obligation_id, outcome: "applies" | "removed" | "ambiguous"}`
- `wizard_step5_answer_drawer_cancelled{obligation_id}`

**Reference**
- Visual: `1774:540`

---

## 21. `Drawer · Obligation` — row detail view from Risk Map

**What exists today (2026-05-16)**
- OSS-quarterly-return Drawer · Obligation Desktop built at node `1776:540`.
- 520×900 right-anchored drawer.
- Eyebrow: `OBLIGATION`
- Plex Serif H1 with obligation name + Meta row (severity pill + markets + statute reference, all in petrol)
- `Penalty Box` (new pattern): bg/secondary card with PENALTY RANGE eyebrow + Plex Serif Bold amount + text/secondary breakdown
- Description paragraph (plain-language explanation + authority references)
- `DEADLINE & FILING` section with petrol-check list (next due, cadence, last filing)
- `VERIFIED PARTNERS FOR THIS OBLIGATION` section with locked partner card (lock-circle avatar + name/specialty + match% pill) + "+N more partners — unlock with a free account" link
- Sticky footer with reassurance subtitle + Gold "Unlock partner profiles →" CTA

**What it should be in Compass**
- `Drawer · Obligation (Desktop)` + `(Mobile)` component set:
  - Property `Severity` = `Critical | High | Medium | CoverageExpanding`
  - Property `ObligationTitle`, `Markets`, `StatuteRef` (text — drives meta row)
  - Property `PenaltyAmount` + `PenaltyBreakdown` (drives Penalty Box)
  - Property `Description` (text)
  - Slot for `Deadline & Filing` list items
  - Slot for `Verified Partners` (collection of 1-3 partner cards in locked state)
- Coverage-Expanding variant of the drawer:
  - Penalty Box adds caveat: "Estimated from local regulator guidance — confirm with pilot partner."
  - VERIFIED PARTNERS section replaced with PILOT NETWORK explainer + inquiry-form CTA

**Why this matters**
- Closes the loop on the (i) affordance pattern from Steps 1-3: clicking the Risk Map row body opens the same drawer chrome that the (i) glyphs open elsewhere. One consistent reveal pattern across the entire wizard.

**Reference**
- Visual: `1776:540`

---

## 22. `Penalty Box` — new atom

**What exists today**
- Inline in `Drawer · Obligation` (`1776:540`).
- bg/secondary card, cornerRadius 10, padding 16/20.
- Children:
  - "PENALTY RANGE" eyebrow (Inter Semi Bold 11, letter-spacing 6%, text/tertiary)
  - Amount: IBM Plex Serif Bold 22, text/primary (e.g. "€5,000 + 1%/month")
  - Breakdown: Inter Regular 13, text/secondary (e.g. "on unpaid VAT, accruing monthly until filed")

**What it should be in Compass**
- `Penalty Box` atom under Compass `🃏 Cards` page (or sibling).
- Properties: `Amount` (text), `Breakdown` (text), `Tone` = `Neutral | Warning | Coverage-expanding` (the last adds the "Estimated — confirm with pilot partner" caveat as a third line).

---

## 23. `Severity Pill` — new atom

**What exists today**
- Inline severity pills in the Risk Map table: Critical (petrol@12%), High (petrol@8%), Medium (petrol@5%), Coverage Expanding (neutral grey @15%).
- All currently hardcoded with opacity values + petrol RGB. Same hardcode chain as the Step-1-Card-Selected pattern — depends on item #8 petrol scale.

**What it should be in Compass**
- `Severity Pill` atom under Compass `🏷 Badge` page.
- Properties: `Severity` = `Critical | High | Medium | CoverageExpanding`.
- Bound to the petrol opacity scale (item #8) for the petrol variants, plus a neutral-tertiary scale for Coverage Expanding.

---

## 24. `State Indicator` — new atom set

**What exists today**
- Three visual treatments built inline in Step 5 Obligation-State Variants panel (`1771:540`):
  - **Confirmed pill**: petrol@8% bg, petrol ✓ + label, no stroke
  - **Likely pill**: transparent bg, 1px petrol stroke, ○ + label
  - **Action button**: solid petrol fill, white "Answer 2 questions →" label
  - **Coverage-expanding action button**: transparent bg, neutral-tertiary stroke, text/primary label, "Connect with pilot partner →"

**What it should be in Compass**
- `State Indicator` atom under `🏷 Badge` or new "State" subpage.
- Properties: `Kind` = `Confirmed | Likely | Action | Coverage-Action`, `Label` (text).

---

## Reference IDs in the file

| What | Node ID | Page |
|---|---|---|
| **Step 1** Desktop (with (i) rolled out) | `1649:2` | `Wizard` |
| Step 1 Mobile | `1649:77` | `Wizard` |
| Step 1 Initial state Desktop | `1705:262` | `Wizard` |
| Desktop Drawer wrapper (Other Markets) | `1698:291` | `Wizard` |
| Mobile Drawer wrapper (Other Markets) | `1699:276` | `Wizard` |
| Drawer Empty state | `1703:262` | `Wizard` |
| Drawer No-Results state | `1703:338` | `Wizard` |
| Card · Others / States panel | `1700:276` | `Wizard` |
| **Step 2** Desktop (with (i) rolled out) | `1655:49` | `Wizard` |
| Step 2 Mobile | `1655:140` | `Wizard` |
| Step 2 Initial state Desktop | `1717:287` | `Wizard` |
| Step 2 Validation highlight Desktop | `1746:428` | `Wizard` |
| Step 2 Other + inline input Desktop | `1720:337` | `Wizard` |
| Step 2 Mixed-currency Desktop | `1721:363` | `Wizard` |
| **Step 3** Desktop (with (i) rolled out) | `1650:5494` | `Wizard` |
| Step 3 Mobile | `1650:5587` | `Wizard` |
| Step 3 Initial state Desktop (Skip & route) | `1726:364` | `Wizard` |
| Step 3 Full Coverage selected Desktop | `1730:395` | `Wizard` |
| Drawer Affordance Pattern panel | `1731:438` | `Wizard` |
| **Germany Country Drawer Desktop** (concrete (i)-click example) | `1740:428` | `Wizard` |
| **Step 4** Desktop (canonical happy-path) | `1660:162` | `Wizard` |
| Step 4 Mobile | `1660:235` | `Wizard` |
| Step 4 Summary-Row Edge Cases panel | `1749:471` | `Wizard` |
| Step 4 Edit Markets Drawer Desktop | `1750:471` | `Wizard` |
| Step 4 Step-3 Skipped Desktop | `1751:471` | `Wizard` |
| Step 4 Coverage-Expanding Desktop | `1752:499` | `Wizard` |
| Step 4 Post-Generate Loading Desktop | `1757:527` | `Wizard` |
| **Step 5** Desktop (canonical Risk Map) | `1667:215` | `Wizard` |
| Step 5 Mobile (Risk Map) | `1669:238` | `Wizard` |
| Step 5 Obligation-State Variants Panel (4 states incl. Coverage-Expanding) | `1771:540` | `Wizard` |
| Step 5 Adaptive Header Variants Panel (4 contexts) | `1773:540` | `Wizard` |
| Step 5 Drawer · Answer · DPIA (Desktop) | `1774:540` | `Wizard` |
| Step 5 Drawer · Obligation · OSS (Desktop) | `1776:540` | `Wizard` |
| Compass Drawer Domain Desktop master | `1601:1148` | `Local Components (Compass?)` |
| Compass Drawer Domain Mobile master | `1602:1214` | `Local Components (Compass?)` |
