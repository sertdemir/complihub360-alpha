# Addendum — Wizard Spec Reconciliation

**Status:** Disconnect identified between Wizard Component System spec and the public landing-page promise. Pilot Screen 1 built following the landing promise; full spec rewrite needed.
**Date:** 2026-05-15
**Origin:** Wizard Screen 1 pilot build session (Aktamir + design partner)
**Affects:** Wizard Component System · User Flows (Complete) · Product Overview & System Architecture · Results Page Architecture · Roadmap

---

## 1. The disconnect, in one table

| Aspect | Wizard Component System doc | Landing page promise (S2 / S2.5 / S5 / S6 / S8) | Pilot Screen 1 followed |
|---|---|---|---|
| Target time | "Under 25 seconds" | "Six minutes" | Landing |
| Steps | 5 question steps + Country Gate (step 0) + Review (step 6) = 7 screens | "Four to five questions" / "6 min → Risk map → Register → Workspace" | Landing — 4 steps + Review |
| Step labels | Country Gate · Category · Context · Market Scope · Risk Driver · Complexity · Review | Markets · Operations · Domains · Review | Landing |
| Output | `SearchProfile` JSON → **Results Page** with Providers/Laws/Guides tabs | **Risk Map** (concrete obligations with severity, date, citation, fine exposure) | Landing |
| Surface | Unspecified | Implied: full-page route reached from "Start your assessment" | Full-page route `/assessment/start` |
| Free vs registered | Wizard identical for both; registration pitched after Review | Free assessment → risk map → register to unlock workspace/news/learn | Both consistent — landing extends the docs |
| Mobile treatment | Unspecified | Implied (all marketing built mobile-first) | Built — 2-col card grid, FILL-width Next |

## 2. What the two specs each get right

The **Wizard Component System doc** is closer to a real product engineering spec — it defines:
- `WizardShell` slot structure (TopBar / Stepper / Body / Footer)
- Step types with reusable input components (`SingleSelectCardGroup`, `MultiSelectChips`, `RangeSelector`, `YesNoToggle`, `FreeText`)
- Validation rules ("Next disabled until valid input")
- Performance KPIs (>60% completion rate, <25s average time)
- "Visual card selection preferred over dropdowns" — a clear interaction doctrine

The **landing promise** is closer to a real user-value story — it defines:
- A motivating frame ("6 minutes of yours. The rest is on us.")
- Concrete output everyone can picture (Risk Map with severity colors, obligation titles, due dates)
- A registration path that makes sense (free assessment → workspace unlocks at registration)
- A reusable visual vocabulary (4-dot stepper, petrol/gold tokens, Plex Serif headlines)

Neither is wrong. They're describing different products at different fidelities.

## 3. What the pilot Screen 1 commits to

The Wizard Screen 1 pilot built on 2026-05-15 follows the **landing promise**. Concretely:

- Full-page route `/assessment/start`
- WizardShell pattern: WizardTopBar · WizardStepper · WizardBody · WizardFooter
- 4-step stepper (Markets · Operations · Domains · Review)
- Step 1 input: **Multi-select Country Cards** for the 6 MVP markets (DE · UK · NL · FR · IT · ES)
- Output target: feeds into a Risk-Map-generating pipeline (Step 1's selection scopes which obligations get evaluated)
- Save-progress link in top bar (non-blocking — preserves wizard state, pitches account creation)

This pilot does NOT follow the docs in two ways:
1. **No Country Gate on landing.** The doc places country selection BEFORE the wizard ("Step 0"). The landing has no such pre-step. The pilot puts country selection as Step 1 of the wizard itself.
2. **No Category-as-Step-1 branching.** The doc says Category Selection drives wizard variants. The pilot does NOT branch by category at all — the 4 steps are universal.

## 4. What needs to update — by document

In priority order:

1. **Wizard Component System** — primary rewrite needed. Update step list, target time, output model (SearchProfile → RiskMap), input doctrine (4 universal steps, no category-driven branching). Reflect WizardShell pattern as built.
2. **User Flows (Complete)** §4 — replace wizard screen-by-screen flow with the 4-step pilot pattern. Remove §11.3 "country change destructive" or keep with new step-numbering.
3. **Product Overview & System Architecture** §4.1 — change "Wizard (4–5 steps)" reference to "Wizard (4 steps + Review)". Add `/assessment/start` to route map.
4. **Results Page Architecture** — biggest knock-on: if output changes from `SearchProfile → Providers/Laws/Guides tabs` to `Risk Map`, the Results Page architecture needs a new spec. The landing's S2 (Risk Map demo) is effectively the new Results Page header pattern. Build a "Results Page (Risk Map)" architecture doc.
5. **Detailed Personas & User Stories** — review U-Stories that reference "search results" vs "risk map." The promise to the user changed.
6. **Search & Ranking Logic** — if the wizard no longer produces a SearchProfile, this doc's relevance is now scoped to the **Provider matching** step (S2.5 narrative), not the wizard output. Re-scope.
7. **Roadmap & Implementation Plan** — confirm the wizard MVP delivers a Risk Map, not a Search-Results page. Affects Beta scope.

## 5. Open decisions before further wizard build-out

1. **Branching:** Does the wizard branch by domain selection (Step 3 Domains decides which sub-questions appear), or stay universal? **Recommendation:** universal for Beta — branching multiplies content cost. Add branching in v2 once we have data on which paths users abandon.
2. **Step 0 / Country Gate:** Should there be a pre-step on landing that captures primary country before launching the wizard? **Recommendation:** no. Step 1 inside the wizard handles it. Adds friction to put it on landing.
3. **Free-text fallback:** When user picks "Don't see your market", what happens? **Recommendation:** route to a one-line "Tell us where" field, then proceed to a degraded wizard variant that still produces a Risk Map (but with a "Coverage limited" footer note).
4. **Category-first vs Market-first:** The doc puts Category Selection as Step 1. The pilot puts Markets as Step 1. **Decision needed**: stick with Markets-first (cleaner mental model: where → what) or pivot.
5. **Registration timing:** Confirmed in pilot: registration is post-result, optional. But the Save-progress link in the top bar is a soft prompt. Is that the right place? **Recommendation:** yes — non-intrusive, present every step, doesn't break the funnel.

## 6. What this addendum commits

- The pilot Screen 1 is the SOURCE OF TRUTH for the WizardShell structure going forward
- Doc items in §4 are queued for the relevant doc owners
- Decisions in §5 are flagged as gating the Beta wizard build-out
- The Results Page Architecture as written is no longer canonical — it must be updated or replaced to reflect the Risk-Map output model

If §5.1 (universal vs branching) goes "branching", the pilot needs a third step type that doesn't exist yet: a conditional-renderer. Flag this before Step 3 build.

---

*Author: Design session output, 2026-05-15. Pending review by Aktamir (product) and the doc owners listed in §4.*
