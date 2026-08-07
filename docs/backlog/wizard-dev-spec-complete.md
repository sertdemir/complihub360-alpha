# Wizard — Complete Dev Spec & Handoff Reference

**Status:** OPEN — frontend wireframes complete (Steps 1–5), backend implementation pending
**Created:** 2026-05-16
**Owner:** Backend team (handover from `360-design`)
**Companion docs:**
- [`compass-uptake-from-wizard.md`](./compass-uptake-from-wizard.md) — Design System component backlog (24 items)
- [`wizard-markets-expansion-us-tr.md`](./wizard-markets-expansion-us-tr.md) — Coverage-expanding markets backend spec

---

## Purpose

This document consolidates every backend-relevant decision, API contract, click handler, content matrix, and tracking event needed to build the CompliHub360 Wizard end-to-end. **Use it as the single hand-over reference** for backend implementation, copy-paste into a Claude Code task to drive feature development.

Figma reference file: `CompliHub-360` (file key `0tJtkBs5hsgswwBi9m1slJ`), page `Wizard`. All Frame IDs cross-referenced inline.

---

## Table of Contents

1. [Cross-cutting concerns](#1-cross-cutting-concerns)
2. [Step 1 — Markets](#2-step-1--markets)
3. [Step 2 — Operations](#3-step-2--operations)
4. [Step 3 — Domains](#4-step-3--domains)
5. [Step 4 — Review](#5-step-4--review)
6. [Step 5 — Risk Map Result](#6-step-5--risk-map-result)
7. [Drawer content matrices](#7-drawer-content-matrices)
8. [Tracking event dictionary](#8-tracking-event-dictionary)
9. [Open product questions](#9-open-product-questions)

---

## 1. Cross-Cutting Concerns

### 1.1 Wizard session model

- **Anonymous-first**: User reaches `/assessment/start` without authentication. A session ID is minted server-side (UUID v4, signed cookie).
- **State storage**: Wizard inputs are persisted to `wizard_sessions` table keyed by session ID. Updates on every step transition (no autosave per keystroke).
- **TTL**: Anonymous sessions live for **24 hours** after last activity (decided 2026-05-16). After expiry, the session record is hard-deleted (no orphan data). A one-time email reminder fires at the 18h mark if the user provided an email anywhere in the flow.
- **Account binding**: When user clicks "Save progress with a free account" OR "Create free account" on the Risk Map, the existing anonymous session is bound to the new user account (foreign key `user_id`), and the TTL is removed.
- **URL persistence**: `/results/{risk_map_id}` is a stable shareable URL valid for 30 min unless saved to an account. After save, the same URL becomes permanent.

### 1.2 Anonymous URL persistence + cache

- Risk Map URL: `/results/{risk_map_id}` where `risk_map_id` is a 12-char base62 token.
- URL valid for **24 hours** (matches session TTL, decided 2026-05-16) unless saved to an account.
- Cache: results are computed once per session input combination and cached for 24h server-side. Re-generating with same inputs returns the cached result.
- On account-binding: cache is migrated to permanent storage.

### 1.3 Currency handling

- **Anchor currency**: EUR. All revenue bands, penalty amounts, and risk exposure totals are stored and computed in EUR.
- **Display layer**: When user's Step-1 selection contains only non-EUR markets (TR-only, US-only), revenue chips and select monetary displays show native-currency hint inline (hover or alongside): `€2M — €5M (≈ ₺72M — ₺180M)`.
- **FX rates**: Frozen at session start, sourced from ECB end-of-day rates. Stored as session metadata. Tooltip displays "as of [date]".

### 1.4 Account-creation interception points

Four registration-prompt locations across the wizard. All four use the same **User auth flow: email-only magic-link, no password**. Pre-fill the new account with the existing session's inputs.

> **Note on auth divergence**: User auth uses magic-link (here). **Provider auth uses traditional email + password** — see `provider-spec-addendum.md` §9.7. Two separate auth services.

1. **Top-right "Save progress with a free account"** — every step. Non-blocking (does not interrupt wizard flow). Opens an inline modal.
2. **Risk Map top-right "Save this map"** — pre-result equivalent. Auto-binds the Risk Map URL to the new account.
3. **Risk Map locked-partner cards** — "Unlock matches with a free account →".
4. **Risk Map bottom block** — "Save this map. Unlock the partners." — final conversion climax.

All four fire `auth_signup_started{source: 'step{N}_save' | 'step5_save_map' | 'step5_unlock_partners' | 'step5_bottom_cta'}` on click.

---

## 2. Step 1 — Markets

**Frame IDs:** Desktop `1649:2` · Mobile `1649:77` · Initial-state Desktop `1705:262` · Other-Markets Drawer Desktop `1698:291` · Mobile `1699:276` · Drawer Empty `1703:262` · Drawer No-Results `1703:338` · Germany Country Drawer Desktop `1740:428` · States panel `1700:276`.

### 2.1 Route

- `/assessment/start` → `/assessment/markets` (Step 1 surface)

### 2.2 API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wizard/markets` | Returns the 9 headline market cards (DE, UK, NL, FR, IT, ES, US, TR, Others-trigger) with `hint` copy. Localizable. |
| GET | `/api/wizard/markets/others` | Returns Tier-1 + Tier-2 country list for the Others drawer. Cached client-side. |
| GET | `/api/wizard/markets/search?q=` | Search across all countries. Returns code, name, hint, `coverage_status` (`full` \| `partial` \| `expanding`). |
| GET | `/api/countries/{code}/regulatory-profile` | Returns full content for the Country Drawer. Schema below. |
| POST | `/api/wizard/sessions/{session_id}/markets` | Saves markets selection. Idempotent. |

### 2.3 Card click behavior

- **Click on country card body** → toggles selection (multi-select). Updates local state, fires `wizard_step1_market_selected{code}` or `wizard_step1_market_deselected{code}`.
- **Click on (i) glyph** (top-right of card) → opens `Drawer · Country` for that market. Content fetched via `GET /api/countries/{code}/regulatory-profile`. See content matrix §7.1.
- **Click on Others card** → opens `Drawer · Picker` (Other Markets). Content via `GET /api/wizard/markets/others`. Search backed by `/api/wizard/markets/search`. Selection sub-set persists alongside headline-markets selection in same payload field: `markets.codes[]`.

### 2.4 Country Drawer (`Drawer · Country`)

When (i) is clicked. Right-anchored 520×900 (Desktop) or bottom-sheet 390×780 (Mobile). Selection state is unchanged by this interaction.

**Response schema** (`/api/countries/{code}/regulatory-profile`):
```json
{
  "code": "DE",
  "name": "Germany",
  "active_regime": ["VAT", "OSS", "LUCID", "GwG"],
  "description": "Germany runs 19% standard VAT with mandatory OSS for cross-border B2C above €10,000. EPR registration is centralized through LUCID (Verpackungsregister) with separate streams for packaging, batteries, and WEEE. UStG, VerpackG, and GwG are the primary statutes you will encounter.",
  "what_we_cover": [
    "VAT registration · OSS / IOSS quarterly returns",
    "EPR LUCID registration + annual reporting",
    "VerpackG ecomodulation contributions",
    "Beneficial-owner register filings (GwG)",
    "Distance-selling threshold monitoring",
    "Reverse-charge mechanism (UStG §13b)"
  ],
  "when_this_matters": [
    "You ship physical goods into Germany",
    "Your cross-border B2C revenue crosses €10,000",
    "You join Amazon FBA-DE or a German marketplace"
  ],
  "coverage_status": "full"
}
```

See §7.1 for content matrix of all 9 country variants.

### 2.5 Validation

- Step 1 valid when `markets.codes[]` contains ≥1 code (either headline OR via Others picker).
- Next button is disabled until validation passes.
- If user clicks the disabled Next anyway (a11y: keyboard nav reaches it), surface a polite inline toast: "Pick at least one market to continue."

### 2.6 Tracking events

```
wizard_step1_viewed
wizard_step1_market_selected{code}
wizard_step1_market_deselected{code}
wizard_step1_info_opened{type:'country', code}    # (i) glyph click
wizard_step1_others_opened
wizard_step1_others_searched{query_length}
wizard_step1_others_no_results{query}
wizard_step1_others_added{count, codes[]}
wizard_step1_others_cancelled
wizard_step1_completed
```

### 2.7 Edge cases

| Case | Handling |
|---|---|
| User opens Others, adds 0, closes | Others card stays in default state. No state change. |
| User selects only Others-list countries (no headline) | Valid state. `markets.codes[]` populated with selected non-headline codes. |
| User selects market with `coverage_status: "expanding"` (US, TR) | No special UI on Step 1. Coverage-expanding disclaimer surfaces on Step 4 Review and Step 5 Risk Map (see §5 + §6). |
| User selects 9+ markets via Others picker | No hard cap. Performance: risk-map generation may take >4s; UI shows extended loading state. |
| "Don't see your market?" microcopy click | Opens existing contact form. Routes to general inquiry. NOT in scope for backend wizard work — separate fallback flow. |

---

## 3. Step 2 — Operations

**Frame IDs:** Desktop `1655:49` · Mobile `1655:140` · Initial-state Desktop `1717:287` · Validation-highlight Desktop `1746:428` · Other-selected+input Desktop `1720:337` · Mixed-currency Desktop `1721:363`.

### 3.1 Route

- `/assessment/markets` → `/assessment/operations`

### 3.2 API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wizard/business-models` | Returns the 6 business model cards. Each has title, description, and `behavior_flags`. Behavior flags drive downstream filtering (e.g. SaaS-only flag suppresses EPR-related domain suggestions). |
| GET | `/api/wizard/revenue-bands` | Returns the 5 revenue bands in EUR. Each band has `min`, `max` (or null for `€25M+`), and a localizable label. |
| GET | `/api/business-models/{code}/regulatory-profile` | Returns full content for the BusinessModel Drawer. Schema below. |
| POST | `/api/wizard/sessions/{session_id}/operations` | Saves operations selection. |

### 3.3 Card click behavior

- **Click on BM card body** → single-select (toggling the active card auto-deselects the previously-selected one). Fires `wizard_step2_business_model_selected{value}`.
- **Click on (i) glyph** → opens `Drawer · BusinessModel` for that model. Content via `/api/business-models/{code}/regulatory-profile`. See §7.2.
- **Click on Revenue chip** → single-select revenue band. Fires `wizard_step2_revenue_band_selected{band}`.
- **Click on "Other" card** → expands inline text input below the card grid (NOT a drawer — different sub-interaction). User must type a free-text business-model description. Input is required to advance.

### 3.4 BusinessModel Drawer (`Drawer · BusinessModel`)

Same chrome as Country drawer (520×900 / 390×780). Content matrix in §7.2.

**Response schema** (`/api/business-models/{code}/regulatory-profile`):
```json
{
  "code": "d2c",
  "title": "D2C e-commerce",
  "tagline": "Direct-to-consumer online sales",
  "description": "Selling physical goods directly to end consumers across one or more markets...",
  "typical_compliance_footprint": [
    "Cross-border VAT (OSS / IOSS)",
    "Distance-selling thresholds",
    "EPR registration + packaging fees per market",
    "Cookie consent and tracking-pixel DPIA",
    "Consumer protection: returns, warranties, ODR linking"
  ],
  "common_pitfalls": [
    "Not registering for OSS once €10k cross-border threshold crossed",
    "Missing EPR registration when shipping to multiple EU markets",
    "Running tracking pixels without a DPIA"
  ],
  "when_this_is_decisive": [
    "Physical-goods shipper, multi-market expansion",
    "FBA-based logistics (Amazon, Zalando)",
    "Brand owner (vs. reseller) — EPR producer status"
  ]
}
```

See §7.2 for content matrix of all 5 BusinessModel variants.

### 3.5 "Other" business-model free-text handling

- Triggered by selecting the "Other" card.
- Inline text input appears below the Model cards grid.
- Validation: input ≥10 characters before Next enables. Empty input = same disabled state as no-BM-selected.
- Input value stored as `business_model.other_text` (string, max 280 chars).
- Backend behavior: when `business_model = "other"`, the risk-map generation engine bypasses the standard regulatory mapping and instead routes the session to a human-reviewer queue (via `/api/triage/other-bm-inquiries`). Risk Map for these sessions shows a placeholder state with "Our team is reviewing your operation — we'll email you within 1 business day" copy.
- **Queue ownership: DEFERRED** (decided 2026-05-16) — implementation ships with founder-team email forwarding stub (queue → `complihub360.dev@gmail.com`) until Operations team takes ownership. Slack alert via `#other-bm-inquiries` to be added when team scales.

### 3.6 Validation

- **Step 2 valid** when BOTH `business_model.code` AND `revenue_band` have values.
- If user clicks Next while incomplete: scroll to the first missing section and apply a 3px petrol outline to the missing block for 1.5s. Inline error text "Pick a business model to continue." or "Pick a revenue band to continue." appears in petrol below the outlined block. Fades out together.

### 3.7 Mixed-currency context

If Step 1 selection contains at least one non-EUR market (TR, US) AND NO EUR market is also selected, the Revenue chip row gets an info hint below it: `ⓘ Bands in EUR. Hover for TRY equivalents (Türkiye selected in Step 1).` Hover on any chip displays native-currency equivalent in a tooltip (uses session-start FX rate).

When BOTH EU and non-EU markets are selected: EUR is anchor, hover shows multi-currency parallel (€2M — €5M ≈ ₺72M — ₺180M ≈ $2.1M — $5.3M).

### 3.8 Tracking events

```
wizard_step2_viewed
wizard_step2_business_model_selected{value}
wizard_step2_revenue_band_selected{band}
wizard_step2_info_opened{type:'business_model', code}
wizard_step2_other_input_started
wizard_step2_other_input_completed{length}
wizard_step2_other_input_abandoned
wizard_step2_validation_triggered{missing_section: 'business_model' | 'revenue_band'}
wizard_step2_completed
```

### 3.9 Edge cases

| Case | Handling |
|---|---|
| User selects "Other" then types <10 chars | Next stays disabled. Helper text "Tell us in a sentence" pulses. |
| User selects "Other" then deselects to D2C | Free-text input collapses + clears. `business_model.other_text = null`. |
| User crosses €25M revenue band | Same flow. Backend may flag for enterprise sales follow-up via `crm_enterprise_lead{session_id}` event. |

---

## 4. Step 3 — Domains

**Frame IDs:** Desktop `1650:5494` · Mobile `1650:5587` · Initial-state Desktop `1726:364` · Full-Coverage-selected Desktop `1730:395` · Drawer-Affordance Pattern panel `1731:438`.

### 4.1 Route

- `/assessment/operations` → `/assessment/domains`

### 4.2 API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wizard/domains` | Returns the 6 domain cards: VAT & Tax, EPR & Packaging, GDPR & Privacy, Marketing Compliance, Corporate & Filings, Full Coverage. |
| GET | `/api/domains/{code}/regulatory-profile` | Full content for Domain Drawer. Uses existing Compass `Drawer · Domain` master where variants exist (VAT, EPR). New variants needed for GDPR, Marketing, Corporate, Full Coverage. |
| POST | `/api/wizard/sessions/{session_id}/domains` | Saves domain selection. |

### 4.3 Card click behavior

- **Click on domain card body** → multi-select toggle (Confirmed/Likely styling on selected). Fires `wizard_step3_domain_selected{code}` / `_deselected`.
- **Click on (i) glyph** → opens `Drawer · Domain` for that variant. Content via `/api/domains/{code}/regulatory-profile`. See §7.3.
- **Click on Full Coverage card** → toggle-override: when selected, the other 5 cards transition to disabled state (opacity 0.5, click intercepts a brief "Included in Full Coverage" tooltip + ignores selection toggle). Deselecting Full Coverage re-enables the other 5.

### 4.4 Skip behavior

- If user clicks Next/Review-answers with `domains.codes[].length === 0`, the wizard does NOT block. The Step-3 valid state is "skip-OK".
- CTA copy dynamic: 0 selections → "Skip & route →", 1+ selections → "Review answers →".
- Payload when skipped: `domains.codes = ["auto"]` (explicit sentinel value, not `null` or `[]`).
- Backend behavior for `auto`: the risk-map generation engine derives applicable domains from `markets.codes[]` × `business_model.code`. Each derived domain has `inferred: true` flag.

### 4.5 Full Coverage semantic

- Payload: `domains.codes = ["full_coverage"]` (mutually exclusive with explicit codes).
- Backend treats this as "cross-domain partner triage" — Verified Partners are matched on broad-coverage criteria rather than per-domain specialty.
- Risk Map context line adapts to "All 5 compliance areas — cross-domain partner routing." (See §6.3 adaptive header.)

### 4.6 Tracking events

```
wizard_step3_viewed
wizard_step3_domain_selected{code}
wizard_step3_domain_deselected{code}
wizard_step3_full_coverage_toggled{enabled}
wizard_step3_info_opened{type:'domain', code}
wizard_step3_skip_chosen           # fired when "Skip & route" is clicked with 0 selections
wizard_step3_domains_selected{codes[], full_coverage:bool}    # fired on Review-answers click
wizard_step3_completed
```

### 4.7 Edge cases

| Case | Handling |
|---|---|
| User selects Full Coverage AND another card before Full Coverage takes over | Full Coverage wins. Other selections cleared on transition. Animation: petrol fill spreads from Full Coverage, fades others to 0.5 opacity over 200ms. |
| User came via Step-3 skip but later edits via Step 4 Edit-Domains drawer | Drawer opens with all 6 cards in default state. User can opt back into explicit selection. `domains.codes = ["auto"]` is replaced with actual selection. |
| Domain irrelevant for selected markets (e.g. GDPR for US-only) | DEFERRED. Soft-Note pattern flagged in `compass-uptake-from-wizard.md` item — not blocking for v1. |

---

## 5. Step 4 — Review

**Frame IDs:** Desktop `1660:162` · Mobile `1660:235` · Edge-Cases Panel `1749:471` · Edit-Markets-Drawer Desktop `1750:471` · Step-3-Skipped Desktop `1751:471` · Coverage-Expanding Desktop `1752:499` · Post-Generate Loading Desktop `1757:527`.

### 5.1 Route

- `/assessment/domains` → `/assessment/review`
- After Generate click: `/assessment/review` → `/results/{risk_map_id}`

### 5.2 API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wizard/sessions/{session_id}/review` | Returns the consolidated review payload (markets, business_model, revenue_band, domains) for rendering the summary card. |
| POST | `/api/risk-map/generate` | Triggers risk-map computation. Payload: `{session_id}`. Returns `{risk_map_id, status: 'processing' \| 'ready', estimated_seconds}`. Polled or SSE for transitions. |
| GET | `/api/risk-map/{risk_map_id}/status` | Polled while in processing state. Returns progressive `steps_completed[]` for the loading UI. |

### 5.3 Summary card click behavior

Each of the 3 rows (Markets, Operations, Compliance Domains) has an `Edit →` link. **Click opens a scoped Drawer · Edit** (NOT a navigation back to the corresponding step).

- **Edit Markets** → `Drawer · Edit (Section=Markets)` — country card grid 2-col compact + Others trigger.
- **Edit Operations** → `Drawer · Edit (Section=Operations)` — BM cards + Revenue chips.
- **Edit Domains** → `Drawer · Edit (Section=Domains)` — domain cards + Full Coverage toggle.

Drawer chrome: `EDIT · [SECTION]` eyebrow, Plex Serif H1, petrol subline `N selected · changes apply on Confirm`, body grid, sticky footer with Cancel link + Gold "Update [section]" CTA.

**Cancel** → drawer closes, no state change.
**Update** → drawer closes, summary row updates, Wizard payload updates. NO destructive-confirm modal — edits are scoped.

### 5.4 Summary-row variants (rendering rules)

| State | Markets row | Operations row | Domains row |
|---|---|---|---|
| Default (happy path) | "Germany · UK · Netherlands" | "D2C e-commerce · €2M — €5M" | "VAT & Tax · EPR & Packaging · GDPR & Privacy" |
| Others-picker mixed | "Germany · UK · NL · +3 via Others" + `+3` petrol badge | — | — |
| Others-picker only | "Switzerland · Sweden · Norway (via Others)" + `3` badge | — | — |
| Other BM + free-text | — | "Other: [user's sentence] · €2M — €5M" | — |
| Full Coverage | — | — | "Full Coverage (cross-domain partner routing)" + `all 5` badge |
| Step-3 skipped | — | — | "Auto-routed based on your markets + business model" (text/secondary muted) |
| Mixed-currency (TR/US in mix) | "+ Türkiye" with `COVERAGE EXPANDING` badge | "D2C e-commerce · €2M — €5M (≈ ₺72M — ₺180M)" | — |

### 5.5 Coverage-Expanding disclaimer

When Step 1 includes any coverage-expanding market (US, Türkiye, Tier-2), an inline disclaimer notice appears between the Summary Card and the "Anonymous · No account…" reassurance line:

- 720 × ~80 pill, petrol-tinted bg @4%, petrol border @20%, cornerRadius 10
- (i) icon + heading "Coverage in active expansion for [country name(s)]" + body paragraph
- Multi-market variant: when both US and TR selected, heading reads "Coverage in active expansion for United States and Türkiye"

### 5.6 Generate click → Loading state

Click on "Generate my risk map" gold CTA:

1. POST `/api/risk-map/generate` with `session_id`.
2. Frontend transitions to in-page loading state (NOT a route change yet).
3. Body content replaced with centered loader UI: pulse-circle + "Analyzing your situation…" + progress bar + 3-step list.
4. Footer Generate button changes to disabled "Analyzing…" state. Back button stays enabled (user can cancel mid-loading; click triggers `wizard_step4_generate_cancelled` and re-shows Step 4 in static state).
5. Poll `/api/risk-map/{id}/status` every 500ms (or use SSE if available).
6. Steps progressively flip from `○` to `✓` as backend signals completion: Markets mapped → Obligations matched → Matching Verified Partners.
7. On `status: 'ready'`, transition to `/results/{risk_map_id}` route. Replace history entry (back button doesn't return to loading state).
8. If `status` polling exceeds 6s without `ready`, surface escape hatch: "Taking longer than usual. Try refreshing."

### 5.7 Tracking events

```
wizard_step4_viewed
wizard_step4_edit_opened{section: 'markets' | 'operations' | 'domains'}
wizard_step4_edit_updated{section, changes_count}
wizard_step4_edit_cancelled{section}
wizard_step4_generate_clicked
wizard_step4_generate_cancelled              # if user back-clicks during loading
wizard_step4_loading_extended                # >6s threshold reached
wizard_step4_completed                       # status: 'ready'
```

### 5.8 Edge cases

| Case | Handling |
|---|---|
| Edit Markets removes the only EU market, leaving only US | Coverage-Expanding disclaimer auto-appears on Update commit. Markets row updates. |
| Edit Operations changes business_model to "Other" (free-text) | Drawer surfaces inline text-input. User must complete before Update enables. |
| Step-3-skipped session reaches Step 4 | COMPLIANCE DOMAINS row shows "Auto-routed based on…" in muted color. Edit → still opens the Edit Domains drawer for explicit opt-in. |
| Backend `/api/risk-map/generate` returns error (5xx) | Loading state ends with retry CTA: "Something interrupted us. Try again →" with `wizard_step4_generate_error{error_code}` event. |

---

## 6. Step 5 — Risk Map Result

**Frame IDs:** Desktop `1667:215` · Mobile `1669:238` · Obligation-State Variants Panel `1771:540` · Adaptive Header Variants Panel `1773:540` · Drawer · Answer · DPIA Desktop `1774:540` · Drawer · Obligation · OSS Desktop `1776:540`.

### 6.1 Route

- `/results/{risk_map_id}` — guest state by default. URL valid **24 hours** (decided 2026-05-16). Account-binding makes it permanent. One-time reminder email at 18h mark if user provided email.

### 6.2 API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/risk-map/{id}` | Returns full risk map: context line, stats, obligations[], locked-partner previews. |
| GET | `/api/obligations/{obligation_id}` | Returns full obligation detail for the Drawer · Obligation. Schema below. |
| POST | `/api/risk-map/{id}/save` | Binds the risk map to a user account (called from save flow). |
| GET | `/api/risk-map/{id}/answer/{obligation_id}` | Returns the question set for resolving a Depends-on-X obligation. Used by Drawer · Answer. |
| POST | `/api/risk-map/{id}/answer/{obligation_id}` | Submits answers; returns new obligation state (Confirmed / Removed / Depends-refined). |
| POST | `/api/risk-map/{id}/inquiry` | Submits a "Connect with pilot partner" inquiry for coverage-expanding obligations. |
| POST | `/api/risk-map/{id}/unlock` | Triggered after account creation. Reveals Verified Partner details + sends them to the matched partners as notification (the "engagement request"). |

### 6.3 Four obligation states

Obligations have a `state` field with one of four values, plus a `coverage_status` field:

| State | Visual | When | Action |
|---|---|---|---|
| `confirmed` | Petrol-tint pill, `✓ Confirmed` indicator | We have enough info to confirm | Click row → opens Drawer · Obligation |
| `likely` | Outlined petrol pill, `○ Likely · confirm to refine` | Inferred from inputs but not directly verified | Click row → Drawer · Obligation (with "confirm to refine" hint) |
| `depends` | Action button: `Answer 2 questions →` (petrol-filled) | Resolution requires 2-3 follow-up answers | Click button → Drawer · Answer |
| `coverage_expanding` | Neutral grey pill `Coverage expanding`, outlined action button `Connect with pilot partner →` | `obligation.coverage_status === "expanding"` for the affected market | Click button → posts inquiry to `/api/risk-map/{id}/inquiry` |

### 6.4 Adaptive header context-line

Four variants based on Step 1-3 inputs:

| Path | Context-line text | Badge |
|---|---|---|
| Default (happy path) | "Based on [markets]. [BM] · [revenue]. [Domains] in scope." | — |
| Step-3 skipped | "...Domains auto-scoped from your setup." | `AUTO-SCOPED` petrol pill |
| Full Coverage | "...All 5 compliance areas — cross-domain partner routing." | `FULL COVERAGE` pill |
| Coverage-Expanding | "Based on [markets including TR/US]." | `[COUNTRY] COVERAGE EXPANDING` pill |

### 6.5 Stats bar

Four power-numbers above the table:

- `8 obligations identified` — total count from `obligations[]`
- `€25k total exposure` — `sum(obligations[].penalty_estimate)`. Uses median of penalty range when range is given.
- `14 days median deadline` — median of `obligations[].due_in_days`
- `3 Verified Partners ready` — count from `matched_partners[]`

For coverage-expanding-only sessions, the stats bar adapts: `N obligations in pilot · — exposure · — deadline · pilot network`.

### 6.6 Drawer · Answer (Depends-on-X resolution)

When user clicks "Answer 2 questions →" on a Depends-row, the drawer opens.

**Response schema** (`GET /api/risk-map/{id}/answer/{obligation_id}`):
```json
{
  "obligation_id": "dpia_tracking_pixels",
  "obligation_title": "DPIA for tracking pixels",
  "questions": [
    {
      "id": "q1_tracking_pixels",
      "text": "Do you use tracking pixels (Google Analytics, Meta Pixel, TikTok)?",
      "options": [
        {"id": "yes", "label": "Yes", "sublabel": "At least one tracking pixel is loaded on our site"},
        {"id": "no", "label": "No", "sublabel": "We use only first-party analytics or none"},
        {"id": "unsure", "label": "Not sure", "sublabel": "Have engineering confirm"}
      ]
    },
    {
      "id": "q2_consent_banner",
      "text": "Do you display a cookie consent banner today?",
      "options": [
        {"id": "yes_records", "label": "Yes — with consent records"},
        {"id": "yes_no_records", "label": "Yes — but no consent records stored"},
        {"id": "no", "label": "No"}
      ]
    }
  ]
}
```

**Submit schema** (`POST /api/risk-map/{id}/answer/{obligation_id}`):
```json
{
  "answers": {"q1_tracking_pixels": "yes", "q2_consent_banner": "no"}
}
```

**Response**:
```json
{
  "outcome": "applies" | "removed" | "ambiguous",
  "new_state": "confirmed" | "removed" | "depends",
  "sub_label": "...",          // updated sub-label for the row
  "stats_delta": {"obligations": -1, "exposure": -2500, "median_deadline_days": 0}    // if removed
}
```

UI behavior on response:
- `applies` → drawer closes, row transitions to Confirmed (200ms petrol-fill animation on the State pill).
- `removed` → drawer closes, row fades out (400ms), stats bar updates with new totals.
- `ambiguous` → drawer closes, row stays Depends but Action-button label updates to "Refine 1 question →" with new question set.

### 6.7 Drawer · Obligation (row detail)

When user clicks anywhere on the row body (NOT the action button or the (i) glyph in the Severity column).

**Response schema** (`GET /api/obligations/{obligation_id}`):
```json
{
  "id": "oss_quarterly_return",
  "title": "OSS quarterly return",
  "severity": "critical",
  "coverage_status": "full",
  "markets": ["DE", "NL"],
  "statute": "UStG §18i (OSS)",
  "penalty": {
    "range_min": 5000,
    "range_max": null,
    "modifier": "+ 1%/month",
    "breakdown": "on unpaid VAT, accruing monthly until filed"
  },
  "description": "Quarterly One-Stop-Shop return for cross-border B2C sales into other EU member states. Replaces the country-by-country VAT filing for sellers above the €10,000 distance-selling threshold. Filed via the home-country tax authority (BZSt for DE-resident sellers).",
  "deadline_filing": [
    "Next due: April 30, 2026 — 6 days remaining",
    "Cadence: quarterly (Q1/Q2/Q3/Q4 due last day of following month)",
    "Last confirmed filing: Q1 2025"
  ],
  "matched_partners": [
    {"id": "p_m_lang", "name": "M. Lang", "location": "Munich", "specialty": "VAT & OSS specialist", "match_score": 94, "response_time": "24h", "prior_engagements": 142},
    /* 2 more in locked state */
  ]
}
```

For `coverage_status: "expanding"` variant of the drawer:
- Penalty box adds caveat: "Estimated from local regulator guidance — confirm with pilot partner."
- `matched_partners` section is replaced with a `pilot_network` block + inquiry-form CTA.

### 6.8 Tracking events

```
risk_map_viewed{id, scope_summary}
risk_map_info_opened{type:'obligation', obligation_id}       # (i) on Severity column — same drawer as row click
risk_map_obligation_row_clicked{obligation_id}
risk_map_answer_drawer_opened{obligation_id}
risk_map_answer_drawer_resolved{obligation_id, outcome}
risk_map_answer_drawer_cancelled{obligation_id}
risk_map_expanding_inquiry_opened{obligation_id}
risk_map_expanding_inquiry_submitted{obligation_id}
risk_map_save_clicked
risk_map_unlock_partners_clicked
risk_map_account_created{from_cta: 'top_save' | 'unlock_partners' | 'bottom_cta'}
risk_map_url_expired                # 30-min anonymous TTL hit before save
```

### 6.9 Edge cases

| Case | Handling |
|---|---|
| Session has only coverage-expanding obligations (e.g. TR-only) | Stats bar adapts (see §6.5). Locked-partner section replaced with pilot-network inquiry form. Bottom CTA copy changes to "Connect with our pilot network →". |
| User opens 4+ Answer drawers in same session | All resolutions persist. Stats bar updates after each. No special handling. |
| 24h URL expires before user saves | On next navigation to URL: show "This map has expired" state with options to (a) re-run wizard, (b) start a new assessment. Past inputs are NOT recoverable for unsaved sessions. |
| Backend `matched_partners[]` returns 0 for a domain we explicitly mapped | Show graceful fallback in the Partners section: "Verified Partners for this market are joining the network. We'll notify you when matches are ready." |

---

## 7. Drawer Content Matrices

### 7.1 Step 1 — Country Drawer (9 variants)

Already documented as item #12 in [`compass-uptake-from-wizard.md`](./compass-uptake-from-wizard.md). Includes DE, UK, NL, FR, IT, ES, US, TR, Others-Search. Each has Active Regime / What We Cover / When This Matters tables.

### 7.2 Step 2 — BusinessModel Drawer (5 variants) — NEW

| Code | Title | Tagline | Footprint | Pitfalls | Decisive when |
|---|---|---|---|---|---|
| `d2c` | D2C e-commerce | Direct-to-consumer online sales | Cross-border VAT (OSS/IOSS) · Distance-selling thresholds · EPR per market · Cookie/Pixel DPIA · Consumer protection (returns, ODR) | Not registering OSS at €10k · Missing EPR for multi-market · Tracking pixels without DPIA | Physical-goods shipper · Multi-market expansion · FBA-based logistics · Brand-owner status |
| `b2b` | B2B / wholesale | Sell to businesses or distributors | Reverse-charge VAT mechanism · Intra-community supply rules · Beneficial-owner registration · Customs filings · Late-payment compliance | Not validating customer VAT ID before reverse-charge · Misclassifying cross-border services · Missing INTRASTAT thresholds | High-revenue · Multi-country supplier · Low-volume high-value transactions |
| `marketplace` | Marketplace | You connect buyers + sellers | Marketplace facilitator rules (US, UK, EU) · P2B Regulation · Digital Services Act (DSA) · VAT collection obligations · Seller-onboarding KYC | Underestimating marketplace-facilitator liability · DSA reporting non-compliance for very-large platforms · Counterfeit-listing liability under DSA | Any platform handling 3rd-party sellers · Cross-border facilitator status · ≥10M EU users (VLOP threshold) |
| `saas` | SaaS / digital products | Software, subscriptions, no physical shipment | MOSS/OSS for B2C digital services · GDPR (DPAs, DPIAs) · E-invoicing in mandate countries (TR, IT, PL) · Payment data PCI-DSS · Sub-processor management | Not applying B2C VAT correctly per consumer location · Missing DPA with sub-processors · Storing payment data on own infrastructure | B2C SaaS with EU consumers · Multi-country footprint · Payment data processing · Sub-processor cascade |
| `hybrid` | Hybrid | Mix of B2C and B2B channels | All of D2C + B2B + the complexity of split treatment | Revenue-band misclassification (mixing B2B and B2C in OSS) · Split entity accounting confusion · Inconsistent customer-status validation | Mid-revenue · Splits both channels · Mixed brand-vs-reseller portfolio |

(For `other`, no drawer — free-text input replaces the (i) affordance.)

### 7.3 Step 3 — Domain Drawer (6 variants)

| Code | Title | Active Regulations | What We Cover | When This Matters |
|---|---|---|---|---|
| `vat` | VAT & Tax | (existing Compass Drawer · Domain `Domain=VAT`) | OSS / IOSS quarterly returns · Distance-selling threshold monitoring · Intra-community supply VAT · Reverse-charge mechanism · Per-market VAT registrations · Bilateral DTA implications | You sell B2C into another EU market for the first time · You exceed €10,000 in cross-border B2C sales · You change your fulfilment model |
| `epr` | EPR & Packaging | (existing Compass Drawer · Domain `Domain=EPR`) | Producer registers (LUCID, PackUK, CITEO, Stichting OPEN, Ecoembes) · Ecomodulation contributions · Take-back schemes · WEEE registration · Battery directive | You ship physical goods · You're brand-owner (vs. reseller) · You enter a new EU market with physical products |
| `gdpr` | GDPR & Privacy | NEW — needs Compass Drawer · Domain `Domain=GDPR` variant | DPIA for high-risk processing · RoPA (Records of Processing Activities) · Processor agreements (DPAs) with sub-processors · Data-breach notification · Transfer Impact Assessments for non-EU transfers · Cookie consent records | Collecting personal data from EU residents · Tracking pixels or marketing automation · Sub-processor integration (Stripe, Auth0, etc.) · Cross-border data transfer (US, UK post-Brexit) |
| `marketing` | Marketing Compliance | NEW — needs Compass Drawer · Domain `Domain=Marketing` variant | Cookie consent banners + consent records (TTDSG, GDPR Art. 6/7) · Dark-pattern audits (EU DSA, Cal CCPA) · Unsolicited communications (CAN-SPAM, GDPR Art. 6) · Influencer disclosure (FTC, EU UCPD) · AB-testing transparency | Any marketing site EU-facing · B2C campaigns · Marketing automation deployment · Use of cookies/pixels beyond strictly necessary |
| `corporate` | Corporate & Filings | NEW — needs Compass Drawer · Domain `Domain=Corporate` variant | Annual financial statements (HGB, Companies House) · Beneficial-owner registry filings (Transparenzregister, PSC) · Beneficial-owner update obligations · Related-party disclosures · Audit thresholds per jurisdiction | Incorporated entity · Multi-country presence (subsidiary filings) · Beneficial-owner change (10%+ stake shift) · Crossing audit thresholds |
| `full_coverage` | Full Coverage | All 5 domains, routed through cross-domain partner matching | We assess all 5 domains in one engagement, prioritize the most material obligations, and route to specialists across domains via a single coordinated brief. | You don't know where to start · You want one partner who manages the full picture · Time-poor founder operations · Multi-domain audit-prep needs |

### 7.4 Step 5 — Obligation Drawer (8 examples + template)

The 8 obligations currently shown in the canonical Risk Map. Each follows the schema from §6.7.

| Obligation ID | Title | Severity | Markets | Statute | Penalty | Description (1-2 sentences) |
|---|---|---|---|---|---|---|
| `oss_quarterly_return` | OSS quarterly return | critical | DE, NL | UStG §18i (OSS) | €5,000 + 1%/month on unpaid VAT | Quarterly One-Stop-Shop return for cross-border B2C sales into other EU member states. Filed via the home-country tax authority. |
| `vat_registration_uk` | VAT registration — UK | critical | UK | UK VATA 1994 §3 | Up to £20,000 | Post-Brexit threshold check needed. UK is no longer part of EU VAT regime — separate registration required when £85k threshold crossed. |
| `epr_lucid_de` | EPR packaging registration (LUCID) | critical | DE | VerpackG Art. 9 Abs. 1 | Up to €50,000 | Producer status to confirm. All packaging-bearing producers selling into Germany must register with LUCID before first sale. |
| `epr_packuk` | EPR registration renewal (PackUK) | high | UK | UK Packaging Regs. 2023 §7 | 4% of UK revenue | Last filed Apr 2024 — annual renewal due. PackUK reporting covers household + commercial packaging. |
| `cookie_consent_eu` | Cookie banner + consent records | high | EU-wide | GDPR Art. 6/7 · TTDSG §25 | Up to 2% global revenue (GDPR), €50,000 (TTDSG) | B2C EU users require explicit consent for non-essential cookies. Consent records must be retained min. 24 months. |
| `dpia_tracking_pixels` | DPIA for tracking pixels | medium | EU-wide | GDPR Art. 35 | Up to 4% global revenue | Depends on tracking stack. High-risk processing (profiling, behavioural advertising) requires a documented Data Protection Impact Assessment. |
| `reverse_charge_de` | Reverse-charge mechanism | medium | DE, NL | UStG §13b | None directly (VAT shortfall recovered) | Applies only if cross-border B2B share >0. Customer VAT ID validation is required before applying reverse-charge. |
| `beneficial_owner_de` | Beneficial-owner update | medium | DE | GwG §20 Abs. 1 | €1,000–5,000 | Ongoing reporting obligation. Updates required within 14 days of any 10%+ stakeholder change. |

**Coverage-expanding example** (template for backend):

| Obligation ID | Title | coverage_status | Markets | Statute | Action |
|---|---|---|---|---|---|
| `efatura_registration_tr` | e-Fatura registration | expanding | TR | Vergi Usul Kanunu §227 | Pilot-partner inquiry (no auto-confirmation flow) |

Coverage-expanding obligations omit the `due` field and `matched_partners` field; instead the response includes a `pilot_network` block with inquiry form.

---

## 8. Tracking Event Dictionary

Complete event catalog. All events include implicit metadata: `session_id`, `timestamp`, `user_id` (if authenticated), `viewport: 'desktop'|'mobile'`.

### Cross-cutting

```
wizard_started{source}
wizard_step_transitioned{from_step, to_step}
wizard_abandoned{last_step, time_on_step_seconds}
auth_signup_started{source}
auth_signup_completed{source, session_bound: bool}
```

### Step 1

(See §2.6)

### Step 2

(See §3.8)

### Step 3

(See §4.6)

### Step 4

(See §5.7)

### Step 5

(See §6.8)

### Performance

```
performance_step_load{step, ms}
performance_risk_map_generation{ms, obligations_count, partners_count}
performance_drawer_load{drawer_type, ms}
```

---

## 9. Decisions Log + Still-Open Questions

Resolved 2026-05-16. Remaining open items flagged.

### ✅ DECIDED

**2. Pilot-partner network for US/TR — HOLDING QUEUE.** Coverage-expanding inquiry form submits to a holding queue. Copy: *"We're onboarding US/TR partners — first inquiries get founding-member matching."* Inquiries build a waitlist that motivates partner contracts. Implementation: `POST /api/risk-map/{id}/inquiry` writes to `pilot_inquiries` table with status `queued`. No live partner-routing on day one.

**4. DSA / VLOP threshold — INFERRED FROM REVENUE BAND.** When Marketplace BM is selected AND revenue band ≥ €25M, the Risk Map auto-surfaces VLOP-relevant obligations (DSA reporting, content-moderation transparency, trusted-flagger obligations). The wizard does NOT explicitly ask "do you have 10M EU users?" — non-tech founders can't reliably answer.

**5. URL TTL — 24 HOURS.** Anonymous session + Risk Map URL both valid for 24h after last activity. One-time email reminder fires at 18h mark if user provided email anywhere in the flow. Replaces the earlier 30-min stub spec.

**6. Mobile parallel state frames — DEFERRED to implementation time.** Mobile drawer-to-bottom-sheet pattern is well-documented in Compass (existing `Drawer · Domain (Mobile)` master). Developer adapts the desktop drawers without explicit mobile wireframes. Re-evaluate only if usability testing surfaces friction.

**7. Cross-step disabled-domain hints — TIE TO BACKEND MAPPING COVERAGE.** Soft-Note pattern activates when backend obligation-mapping reaches 90% coverage threshold for the relevant market+BM combination. Until then, no hints (premature hints damage trust). Track coverage via `backend_mapping_coverage{market, business_model}` metric.

**8. Localization — ENGLISH-ONLY v1, language switch in v2.** TR-only users see English UI in v1 with a small disclaimer: *"Our assessment interface is English. Your Verified Partner replies in Turkish."* Language switch infrastructure scheduled for v2 (priority TBD based on TR-traffic signal).

### ⏳ STILL OPEN

**1. `COMPASS PROMOTION` (Step 5)** — DEFERRED for later product discussion. The "COMPASS PROMOTION — OPEN" section in Step 5 DEV HANDOFF (`1670:292`) and the placeholder location on the Risk Map remain unresolved. **Unblocks once:** product decides whether Compass is a separate user-facing product (e.g. paid monitoring subscription) or internal-only naming.

**3. "Other" BM human-reviewer queue ownership** — DEFERRED. Implementation ships with founder-email forwarding stub. **Unblocks once:** Ops team is in place to take ownership + define alert/SLA/reply-template.

---

## 10. Implementation order recommendation

For backend prioritization:

1. **Foundations**
   - Wizard session model + anonymous URL flow (1.1, 1.2)
   - Auth flow (1.4) — email magic-link
   - Currency handling (1.3) — FX rate ingestion + storage

2. **Step 1 + Step 4 generation path** (the conversion-critical spine)
   - `/api/wizard/markets`, `/api/wizard/markets/others`, `/api/wizard/markets/search`
   - `/api/countries/{code}/regulatory-profile` for 9 variants
   - `/api/risk-map/generate` + status polling
   - `/api/risk-map/{id}` returning happy-path Risk Map for DE/UK/NL × D2C × VAT/EPR/Privacy

3. **Steps 2 + 3 fillout**
   - `/api/wizard/business-models`, `/api/business-models/{code}/regulatory-profile` (5 variants)
   - `/api/wizard/domains`, `/api/domains/{code}/regulatory-profile` (6 variants)
   - Skip-route + Full Coverage backend logic
   - Other-BM free-text human-reviewer queue

4. **Step 5 interactions**
   - `/api/obligations/{id}` for Drawer · Obligation
   - `/api/risk-map/{id}/answer/{obligation_id}` GET + POST for Drawer · Answer
   - Coverage-expanding inquiry endpoint

5. **Coverage expansion** (US + TR + Tier-2)
   - Per `wizard-markets-expansion-us-tr.md` — state-by-state US nexus, KDV/e-Fatura, Tier-1 Others mapping

6. **Account binding + save flow**
   - `/api/risk-map/{id}/save`
   - `/api/risk-map/{id}/unlock` (partner-reveal flow)

---

## 11. Companion docs

- [`compass-uptake-from-wizard.md`](./compass-uptake-from-wizard.md) — 24 design-system items needed to industrialize the wireframes into reusable components
- [`wizard-markets-expansion-us-tr.md`](./wizard-markets-expansion-us-tr.md) — Coverage-expanding markets backend deep-dive

---

## File metadata

This doc is the canonical backend handover reference. Update in-place as decisions land. When backend work begins, append a `## Execution log` section with PR links and learned constraints.
