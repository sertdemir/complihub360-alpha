# Addendum — Knowledge & Retention Layer

**Status:** Vision extension proposed and rolled into Landing S7 design
**Date:** 2026-05-15
**Origin:** Landing-page S7 redesign session (Aktamir + design partner)
**Affects:** Executive Product Vision · Monetization Model · Landing Page IA · Roadmap & Implementation Plan · Product Epics & Backlog Structure · GTM Strategy

---

## 1. What changed

The product vision is extended from **"infrastructure, not content"** (Investor Pitch §12) to **"infrastructure + content as retention layer."** Content is no longer scoped to opportunistic SEO landing pages or grounded sources inside results — it becomes a **first-class registration-gated layer** designed to make the user a **returning visitor**.

The framing CompliHub360 now operates under: **"one single source of truth for every compliance question."** The user does not come to CompliHub once for an assessment and leave; they come back daily/weekly because their ongoing compliance practice lives here.

## 2. The three registration-gated layers (as expressed on Landing S7)

| Layer | What it is | Source in current docs | Status |
|---|---|---|---|
| **Workspace** (operational) | Saved dossier · engagement timeline · partner relationships · live risk map | Landing IA Zone 5 · JTBD §2 · Personas U-Story 4 | ✅ in scope |
| **Live News** (monitoring) | Real-time alerts when regulators move, curated per-market and per-domain, scoped to the user's situation | Monitoring layer Phase 2 (Exec Vision · Roadmap) | ⚠️ Phase 2 — needs MVP commitment |
| **Knowledge Hub** (content / learning) | Webinars, expert tutorials (incl. recognized YouTube creators), deep-dives, walkthroughs, case studies, regulator interviews | Partially mentioned (JTBD Core Job 4 lists "Knowledge hub · Tutorials"), but **not specified as a product layer anywhere** | 🆕 **Net-new commitment** |

## 3. Why this matters strategically

- **Retention math:** A one-time assessment converts to a one-time customer. A "home base for everything compliance" converts to recurring use, recurring referrals, recurring data → recurring revenue.
- **Defensibility:** Verified Partners + dossier + trail is replicable. Verified Partners + dossier + trail + live news + curated expert content is much harder to replicate, especially the third bucket (which requires editorial relationships).
- **Positioning anchor:** GTM §7 already aimed at "the first place companies go when they face regulatory uncertainty." This addendum operationalizes that ambition — without content, that line is aspirational.

## 4. What the landing now promises (S7 — "Beyond the Assessment")

Eyebrow: `BEYOND THE ASSESSMENT`
Headline: "From one-time check to home base for everything compliance."
Subline: "The assessment is free. What comes after — your workspace, live news, expert content, your partners — is what makes CompliHub the place you come back to."

Three benefit cards (Workspace · Live News · Learn from the pros), each with a mini-visual marker (dashboard stats / news-feed snippet / webinar thumbnail).

Card 03 (Knowledge Hub) carries a **"LAUNCHING WITH BETA"** gold pill.
Footer note under the cards: *"Workspace available today. News & content library launching with Beta — early registrants get founding-member access."*

**Implication:** the page now makes a forward-looking commitment that must be honored by Beta launch, or the early-registrant promise breaks trust.

## 5. Document updates required

In priority order:

1. **Executive Product Vision** — add §12.b "Content as retention layer." Specify the three sub-layers (workspace, monitoring, knowledge) and how they relate to the existing infrastructure thesis.
2. **Monetization Model (Deep Dive)** — content is currently absent from the revenue model. Decide whether knowledge access is included in registration (default freemium hook) or paywalled into a higher tier. Recommended: **basic library free with registration · "Pro Library" / deep-dives gated to a paid tier.** Without this decision, the S7 promise can't be costed.
3. **Roadmap & Implementation Plan** — add Beta milestone for News (monitoring layer) and Knowledge Hub MVP (10–20 seed pieces from contracted experts).
4. **Product Epics & Backlog Structure** — add two new epics:
   - *Epic: Compliance News Feed* (ingestion · curation · personalization · notification rules)
   - *Epic: Knowledge Hub* (CMS · creator partnerships · tagging by domain/market · search · embed)
5. **GTM Strategy** — content as acquisition + retention loop. Map which Knowledge Hub categories double as SEO surfaces (already partially in §3).
6. **Personas & User Stories** — add U-Stories: "As a registered user, I want regulator-update alerts scoped to my markets so I don't miss filing-deadline changes." · "As a registered user, I want to watch expert webinars on domains relevant to my dossier so my compliance instincts deepen over time."
7. **API Contracts & Data Model** — add resources: `NewsAlert`, `KnowledgeAsset`, `UserContentSubscription`, `ContentEngagement`.
8. **Navigation Architecture** — top-nav must accommodate "News" and "Learn" (or umbrella "Library") as primary destinations alongside Dashboard / Risk Map / Partners.
9. **Landing Page IA v1.0** → bump to **v1.1** — Zone 4 (Testimonials) replaced by Zone 4 (Knowledge & Retention Layer). Note: testimonials were "names changed" persona sketches with weak credibility right before the closer; removed entirely.

## 6. Open decisions before Beta

- **Free vs. paid:** is the Knowledge Hub free-with-registration or paid? (See §5 item 2.) Affects everything below.
- **Editorial scope at launch:** how many seed pieces, in which domains, from which creators? Suggested minimum: 12 pieces across VAT · EPR · GDPR · Marketing, with at least 3 of them being recognized external creators.
- **News-feed sourcing:** in-house editorial, automated regulator-monitoring + AI summarization, or a partnership with an existing legal-news source (e.g., regulatory news aggregator licensing)?
- **Brand boundary:** does CompliHub create content (own brand voice) or only host curated external creator content? Or hybrid? Affects creator economics.
- **Beta promise duration:** how long is "founding-member access" honored? Lifetime, 1-year, until-Beta-ends? Needs legal review of the promise on the landing.

## 7. What is committed by this addendum

This document does **not** commit Operations to build the Knowledge Hub immediately. It commits:
- That the **Landing S7 promise stands** as the public surface of this strategic direction
- That **§5 doc updates above are queued** and need to be picked up by the relevant doc owners before the next IA / strategy review
- That **§6 decisions are flagged** as gating Beta and must be resolved before Beta launch
- That the **"LAUNCHING WITH BETA"** pill on S7 Card 03 is honest as long as Beta delivers the first viable knowledge surface (even if minimal)

If any of §6 trends toward "we cannot deliver content in Beta," the S7 design must be revisited — either remove Card 03, downgrade the pill to "Roadmap Q4 2026," or split the page into stages.

---

*Author: Design session output, 2026-05-15. Pending review by Aktamir (product) and the doc owners listed in §5.*
