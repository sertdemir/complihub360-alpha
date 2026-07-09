# Dashboard IA · Canonical Source of Truth

**Status:** OPEN — IA pass complete (2026-05-17), refactor pending
**Supersedes:** the v0 Dashboard sketch on Figma (Provider Dashboard frames `1903:2`, `1904:2`, `1904:217`, `1904:371`, `1904:518` + concept doc `1906:3`)
**Source docs consulted:** Provider Flows (Complete) · Jobs To Be Done Framework · Dashboard Component System · Navigation Architecture · Detailed Personas & User Stories
**Related:** `provider-spec-addendum.md` (decision §9 #1 — Dashboard ships v1 · overrides Provider Flows §9 deferred stub)

---

## 1. The fundamental tension

The v0 Dashboard sketch was built on the **Provider-Spec-Addendum §9 #1 override** ("Dashboard ships in v1, not deferred") without consulting the underlying Provider Flows doc. That created a 5-tab Linear-style workspace (Inbox · Active · Coverage · Performance · Billing) that **contradicts the canonical product mechanic** in two ways:

1. **Push vs Pull.** Provider Flows §3.1 defines provider interaction as push-only: *"system sends email to provider inbox · provider magic link"*. The provider is notified, clicks a magic link, and lands on the specific request — never browses a queue. A multi-tab pull-browse dashboard assumes the opposite mental model.

2. **One-shot vs Kanban.** Provider Flows §6 defines the request lifecycle as linear states (`awaiting_confirmation` → `awaiting_reply` → `responded` → `closed/expired`), not a multi-stage project Kanban. My "Active board with 5 columns: Just accepted / Discovery / Doing the work / Awaiting client / Wrap-up" is a project-management metaphor that does not exist in the canonical model.

The addendum override is real — we DO ship a portal in v1 — but it must respect the underlying mechanic, not contradict it. **The portal is a navigable enhancement to the magic-link-first flow, not a replacement for it.**

---

## 2. Canonical Provider JTBDs

Reconstructed from Personas P1/P2/P3 + P-Stories §1-4 (JTBD doc itself is demand-side only):

| # | Job | Source | Surface |
|---|---|---|---|
| PJ-1 | When a request lands, I want to confirm receipt in one click so the SLA timer pauses and the user knows I'm on it. | P-Story 1 · Provider Flows §4.2 Action A | **Request Detail** (magic-link-equivalent inside portal) |
| PJ-2 | When I confirm a request, I want full structured context (country, category, wizard answers) so I don't reply with a clarifying email. | P-Story 2 · P1 Schmidt "structured leads" | **Request Detail** · structured-answer preview |
| PJ-3 | When I reply, I want one channel that captures price/timeline/deliverables so the proposal trail stays on-platform. | Provider Flows §5 · §11.3 leakage-mitigation | **Request Detail** · Proposal block + attachment |
| PJ-4 | When a request is out of scope or I'm at capacity, I want to decline with a typed reason so I'm not penalized and the user gets routed elsewhere. | Provider Flows §4.2 Action C | **Request Detail** · Decline flow with 3 reasons |
| PJ-5 | When my response time slips, I want to be warned BEFORE I lose status. | P-Story 3 · Provider Flows §7.2 | **Governance Strip** (page-level Alert · persistent) |
| PJ-6 | When I'm downgraded or my ranking drops, I want to know exactly why. | P-Story 4 · Provider Flows §7.2 | **Performance · Ranking Transparency** |
| PJ-7 | When I want to expand my markets/domains, I want to see what coverage gaps would unlock demand. | P1 "qualified leads" · §8 partner-boost | **Coverage** · with opportunity-signal strip |
| PJ-8 | When invoicing happens, I want transparent billing in line with the engagement model. | P1 "transparent billing" · §9 future-stub item 3 | **Billing** |
| PJ-9 | When my contact email bounces, I want to fix it before I lose visibility. | Provider Flows §11.2 | **Settings · Notifications** + alert state |
| PJ-10 | When I'm a multi-person firm (P2), I want to route requests to the right colleague. | P2 100+ lawyers · NOT in canonical docs | **Team & Routing** (deferred · v1 = single-user) |

---

## 3. Canonical Surface Map (v1)

The portal has **two top-level surfaces** plus settings, not five peer tabs:

```
/partner (root, requires auth)
├── /requests (DEFAULT LANDING — push-anchored)
│   ├── filter: All / Awaiting confirmation / Awaiting reply / Active / Closed
│   ├── search across requester, country, category
│   └── /requests/[id] (REQUEST DETAIL — the canonical interaction surface)
│       ├── Context block: requester · country · category · wizard answers
│       ├── Action block: Confirm receipt (Magic-link Action A)
│       ├── Reply block: Proposal form + attachment (Action B + §5)
│       ├── Decline block: 3 reasons + alternative-routing trigger (Action C)
│       └── Timeline: state changes + SLA timers + reminder events
├── /performance
│   ├── KPIs from §12: confirm_rate · reply_rate · avg_confirm_time · avg_reply_time · sla_breach_rate
│   ├── Ranking transparency: current rank · last change · what affects it
│   └── Pre-downgrade warning state (when triggered, also surfaces as page-level Alert)
├── /coverage
│   ├── Markets · Domains · Languages · SLA-target (re-uses Onboarding Step 3 component)
│   ├── Effects on ranking explicitly called out per edit
│   └── Coverage-expansion opportunity strip (gold)
├── /billing
│   ├── Running period · last invoice · YTD
│   ├── Invoice history (table)
│   └── Payment-failure state (Stripe webhook → Alert Status=Error Surface=Strong + 7d grace + lock day 8)
└── /settings
    ├── Profile (contact email · 2FA)
    ├── Notifications (in-app bell preferences + email delivery)
    ├── Cal.com link · Stripe-connect status
    └── Team & Routing (deferred to WK3 — v1 single-user-per-workspace)
```

**Key changes from v0 sketch:**
- **Inbox + Active → merged into single `/requests` surface with status filter.** The canonical lifecycle is linear, not Kanban. Filter chips replace the column metaphor.
- **`/requests/[id]` Request Detail is the MISSING PRIMARY SURFACE.** This is where the magic-link experience lives inside the authenticated portal. The 3 actions (Confirm / Reply / Decline) are the JTBD core.
- **No "Active board" Kanban.** Removed. The project-management board was overlay imagination — Compliance engagements are state-driven (confirmed/responded/closed), not stage-driven (discovery/work/wrap-up).
- **Settings is a hub, not a side-nav stub.** Profile, notifications, integrations, team-routing all live there.

---

## 4. Resolution of the 8 open IA questions

(originals in Figma node `1906:3`)

| # | Question | Resolution | Source |
|---|---|---|---|
| 1 | Where does Engagement Detail live? | **Full-page route `/requests/[id]`**. Drawer is too small for proposal form + attachment + timeline. | Provider Flows §4.2 + §5 require composition of context + action + proposal — drawer can't fit |
| 2 | What separates Inbox from Active? | **No separation. Single `/requests` surface with status filter chips.** Default filter = "Awaiting confirmation" (PJ-1 SLA-critical). | Provider Flows §6 lifecycle is linear, not Kanban; Dashboard Component System §9 uses single Request List |
| 3 | How does Partner discover new requests? | **Push-only (email + magic-link primary).** Portal supplements with in-app bell + persistent banner for new arrivals. NOT a pull-browse-first model. | Provider Flows §3.1 |
| 4 | Active board: drag-and-drop or click? | **Removed.** No board — single list with status filters. State changes happen via Request Detail action buttons, not by dragging cards. | Provider Flows §6 |
| 5 | Coverage tab: edit-or-preview? | **Edit only. Public-profile preview opens in new tab via separate button** (current header CTA is correct). | Aligns with Onboarding Step 3 pattern |
| 6 | Performance time range? | **Toggle 7/30/90d/All-time at section level**, default 30d. Custom picker deferred to WK4. | No canonical spec — judgment call |
| 7 | Billing payment-failure flow? | **Email + Stripe webhook → in-portal Alert Status=Error Surface=Strong → 7d grace → lock-on-day-8.** Workspace-locked state shows only Billing tab. | Compass Alert spec + canonical event model (no explicit doc resolution) |
| 8 | Multi-user team support v1? | **Single-user-per-workspace in v1.** P2 100+ lawyers scenario deferred. Beta cohort is Solo/Boutique-skewed. | P3 Novak DPO + P1 Schmidt single-operator; P2 not in beta cohort |

---

## 5. New questions surfaced by the IA pass

These were not on my original 8 — they emerged from the docs:

| # | New question | Why it matters |
|---|---|---|
| N1 | Should the portal default-route to magic-link-style auth on first visit, or assume password-session from Onboarding Step 1? | Provider Flows §4 says magic-link; Onboarding Step 1 says password. These conflict. Decision needed. |
| N2 | When a Partner clicks an email magic-link AFTER they have an authenticated session, do we deep-link straight to `/requests/[id]` or land on `/requests` list? | Push-flow optimization. Recommend deep-link to `/requests/[id]` with subtle Inbox-back-button. |
| N3 | How is the Decline-reason-taxonomy persisted and surfaced to the user-side? | §4.2 says "system suggests alternative providers to user" — needs an event payload spec. |
| N4 | Where does the Wizard-answer-context appear in Request Detail? Inline? Collapsible? | Critical for PJ-2 (qualification signal). |
| N5 | Pre-downgrade warning: as Alert strip in Performance only, or as a sticky banner across all tabs? | §7.2 mandates the warning but not its placement. Recommend: sticky banner across all tabs UNTIL acknowledged, then Performance-only. |
| N6 | Attachment redaction state: how is "redaction in progress" surfaced to the Partner mid-flow? | §10 mentions `attachment_redaction_completed` event — UI placement undefined. Recommend: inline status under the attached file with progress indicator. |
| N7 | Featured-Provider / partner-boost transparency: do we show ranking-position changes proactively, or only on Performance tab? | §8 says partner-boost exists. P-Story 4 wants explanation when status changes. Recommend: passive on Performance tab + push notification on rank-drop. |
| N8 | What's the "empty state" for a brand-new activated Partner with zero requests? | Verification just passed, no requests have routed yet. Need a primer state with "We're matching your first leads — typical first request within 24h of activation." |

---

## 6. Refactor plan

**Drop these from v0 sketch:**
- ✗ Inbox tab as separate concept (merge into Requests)
- ✗ Active tab Kanban board (5 stages)
- ✗ Bauwerk Vienna / Brunnen Living / KraftKaffee project-stage cards (not how engagements work)

**Keep + refactor:**
- ✓ AppShell pattern (sidebar + main with topbar) — extends cleanly
- ✓ Coverage tab content (markets, domains, opportunity strip)
- ✓ Performance tab KPIs — but use canonical KPI names from §12, not invented ones
- ✓ Billing tab pricing breakdown — but ADD payment-failure state

**Build new:**
- ◆ `/requests/[id]` Request Detail — the missing primary surface (PJ-1, PJ-2, PJ-3, PJ-4)
- ◆ Decline flow with 3-reason picker + alternative-routing trigger
- ◆ Pre-downgrade warning surface (sticky banner state + Performance section)
- ◆ Settings hub (profile · notifications · integrations · team-routing-deferred)
- ◆ Bell notification feed (events from canonical event model)
- ◆ Empty/Pending-Verification state across all surfaces
- ◆ Empty/First-Request state for activated-but-no-requests-yet Partner

**Estimated re-work:** 5 design-days for Desktop refactor + 3 design-days for new surfaces + 2 design-days for Mobile parity = ~10 design-days total. Phase D (User Dashboard) is separate — that one has a cleaner spec foundation (Dashboard Component System §1-12 covers it fully) and should be straightforward.

---

## 7. Risks and red flags

1. **The Provider Spec Addendum override may be wrong.** §9 #1 said "Dashboard ships v1" — but the canonical flow design intentionally deferred the portal because magic-link is sufficient for the JTBDs. Worth a stakeholder check: do we genuinely need a portal in v1, or are 1-2 critical surfaces (Request Detail + Billing) enough?
2. **Multi-user team support deferral is risky for P2.** If a beta partner is a large firm, they'll hit the "shared inbox" problem fast. Mitigation: filter P2-class firms out of beta cohort OR ship single-user with a clear "team coming WK3" disclosure.
3. **Push-vs-pull mental model.** If we visually emphasize the portal too much, partners may stop checking email — and the magic-link flow has the lowest friction. Solution: portal augments, doesn't replace. Bell + persistent "new request" notification is the bridge.
4. **Onboarding Step 1 (password) vs Provider Flows §4 (magic-link)** is a real auth conflict. Per the Provider-Spec-Addendum §9 #7 decision (full password auth from day 1), password wins — but then magic-link emails should deep-link into authenticated sessions, not present a separate auth flow. Needs spec.

---

## File metadata

Canonical IA doc for Provider Dashboard. Supersedes earlier sketches. Pairs with:
- Figma · v0 sketch frames (to be refactored): `1903:2 · 1904:2 · 1904:217 · 1904:371 · 1904:518`
- Figma · concept doc (v0 acknowledgment): `1906:3`
- Figma · this doc's decision log: see panel below `1906:3` (built 2026-05-17)
- Source docs (re-read on every major decision): `Provider Flows (Complete).md` · `Dashboard Component System.md` · `Jobs To Be Done Framework.md`

Update in-place. When refactor begins, append an `## Execution log` section with PRs and decisions.
