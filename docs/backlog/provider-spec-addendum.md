# Provider Spec Addendum — v1 Reality Overrides

**Status:** OPEN — Provider Landing Page wireframes shipped, backend Provider scope to align with these decisions
**Created:** 2026-05-16
**Trigger:** Provider Landing Page build (clone of customer Landing Page, 6 new sections + adapted Hero)
**Source-of-truth precedence:** This addendum **overrides** the corresponding sections in `Provider Flows (Complete).md` for v1 implementation. Provider Flows doc itself should be updated in-place when this is committed.

---

## 1. Hard overrides vs. existing Provider Flows

### Override A · Provider Dashboard IS part of v1

**Source doc statement** (Provider Flows §9):
> "In v1, providers do not need full portal. Future portal features: engagement inbox, analytics, billing, profile editing."

**v1 reality (decided 2026-05-16):**
The Provider Dashboard is built and shipped with v1. Every provider response, accept/decline, profile management, and performance tracking happens inside the dashboard. The dashboard is THE workspace, not an optional addition.

**Dashboard v1 scope:**
- **Inbox** — incoming engagement requests with full structured context (D2C profile, prioritized obligations, statutory citations, match score)
- **Active engagements** — post-accept reference view (handover-pack metadata, private notes, no outcome tracking)
- **Archive** — historic engagements (Accepted, Declined, Expired)
- **Profile & Coverage** — categories toggle, jurisdictions chip-select, auto-pause threshold
- **Performance** — Tier ranking, KPIs (acceptance rate, avg confirm time, SLA breaches), Founding-Partner badge, early-warning panel
- **Billing** — fee history (Affiliate clicks + Engagement accepts), payment method, downloadable invoices

Visual reference: Provider Landing Sektion 2 (`1792:814`) demonstrates 3 sub-views — Inbox, Active-Engagement-Post-Accept, Coverage-Settings.

### Override B · No Magic-Link in v1

**Source doc statement** (Provider Flows §4):
> "Magic Link Provider Flow (No Calendar Required) — Goal: Provider can confirm and respond in 1-2 clicks. Magic Link Email contains: request summary, secure magic link, SLA expectation."

**v1 reality:**
**Magic Link is removed.** Provider responses happen ONLY in the dashboard. Email notifications are still sent ("You have a new request in your inbox"), but they link to the dashboard login — not to a one-off magic-link-landing-page.

**Rationale:**
- Single-channel response model simplifies billing (no edge case where Accept is logged twice — once via magic-link, once via dashboard)
- Force dashboard adoption: builds the relationship with the workspace from day one
- Reduces support surface area (no expired-magic-link recovery flow needed)

**Impact on Provider Flows doc:**
- §4 Magic Link Provider Flow → DEPRECATE entire section
- §3 Engagement Request Handling → update: "System creates EngagementRequest record. System sends email to provider inbox (notification only). Provider logs into dashboard to view/respond."
- §11.1 Magic Link Expired → DEPRECATE

### Override C · CompliHub journey ends on Accept

**Source doc statement** (Provider Flows §4.2):
> "Actions: A) Confirm receipt · B) Reply to user · C) Decline request"

**v1 reality:**
On Accept-click, CompliHub's responsibility ends. We transfer the full handover-pack (user profile, prioritized obligations, statutory citations, **direct contact details**) and step out of the way. No reply-via-platform, no proposal upload, no in-platform messaging.

**The provider–user relationship continues OFF-PLATFORM** in the tools both prefer (email, phone, video, contract).

**What CompliHub still does after Accept:**
- Records the engagement event for billing (€92 / $100 billed within 24h)
- Stores reference metadata in provider's Active tab for their own bookkeeping (NOT for outcome tracking)
- Sends user a confirmation email with provider's contact details
- Does NOT track: response time, deliverables, contract value, outcomes, satisfaction

**Impact on Provider Flows doc:**
- §4.2 Actions B (Reply) and §4.2 Actions A (Confirm receipt) → SIMPLIFY to single "Accept" action
- §5 Provider Proposal Flow → REMOVE entire section for v1 (proposals happen off-platform)
- §6 SLA & Monitoring → SIMPLIFY: SLA only tracks confirm-or-decline within 24h, NOT reply-within-48h (no in-platform reply exists)

### Override D · Two-channel monetization explicit on landing page

**Source doc statement** (Provider Flows §0.1 + Monetization Model §2.1-2.2):
- Partner Provider: Primary CTA enabled (engagement)
- Non-Partner Provider: Secondary CTA only (affiliate website visit)

**v1 confirmation (no change):**
The two-tier model stays, with concrete pricing **now disclosed publicly on the Provider Landing Page**:
- **Affiliate Link** — €2 / $2 per click, open to all providers, no application
- **Engagement Requests** — €92 / $100 per accepted request, partner-tier (sign-up to unlock)

Visual reference: Provider Landing Sektion 4 (`1799:822`).

---

## 2. SLA model simplification

### Old SLA (Provider Flows §6.1)
- Confirm within 24h
- Reply within 48h

### v1 SLA
- **Accept-or-Decline within 24h** of request arrival in dashboard inbox
- After 24h with no action: request auto-archives as "expired", user is informed
- After Accept: NO ongoing SLA (CompliHub is out of the loop)
- After Decline: provider's decline-rate is logged for tier governance

### v1 Tier-governance triggers (unchanged from §7.1)
- Repeated 24h-expiries (=no action) → flagged
- Repeated declines without reason → flagged
- Stale email contact (bounce) → flagged
- After 3 flags in rolling 30d window → Tier-2 review (downgrade warning + 7-day grace)

---

## 3. Pricing v1 — single source of truth

| Channel | Tier | Pricing | When billed |
|---|---|---|---|
| Affiliate Link | Open (all providers) | €2 / $2 per click on "Visit website" button | Daily batch, charged to stored payment method |
| Engagement Request | Partner-tier (application required) | €92 / $100 per accepted request | Within 24h of Accept-click |

No monthly subscription. No setup fee. No minimum spend. Pause or disable from dashboard anytime.

**Future revenue streams (Provider Flows § + Monetization Model §2.3-2.4):**
- Partner Subscription (Phase 2+) — recurring fee for priority ranking + advanced analytics + badge customization
- User Monitoring Subscription (Phase 2+) — recurring fee for ongoing compliance alerts and multi-country monitoring

---

## 4. Provider personas (v1 confirmed)

Per `Detailed Personas & User Stories.md` PART II:
- **P1** Boutique Compliance Consultant (Dr. Schmidt, 8 MA, VAT/EPR)
- **P2** Large International Law Firm (Corporate Compliance Department, 100+ lawyers)
- **P3** Specialized Data Protection Officer (Laura Novak, independent, GDPR)

Landing Page persona-picker (Sektion 6) collapses these into 3 tiers:
- **Solo Specialist** = P3
- **Boutique Firm** = P1
- **Mid-sized / Network** = P2

All three sizes are addressed by the same Beta application flow with persona-specific onboarding-call prep.

---

## 5. Beta cohort cap

**Public commitment on the Landing Page:** First 100 Verified Partners get founding-partner status (badge + tier-1 ranking, locked-in for the lifetime of the platform).

**Live counter** ("23 of 100 founding spots claimed") is displayed on Sektion 6 Register-as. Counter is real, backed by `pilot_inquiries.partner_status` count.

**Application review process:**
1. Provider submits Beta application via Landing Page form
2. We respond within 1 business day with calendar link
3. 15-minute onboarding call: coverage alignment, SLA expectations, contract sign
4. Partner status activated, dashboard access granted
5. Counter increments

---

## 6. Provider Landing Page — node reference

Located on `Landingpages` page, cloned from customer Landing Page v2 then adapted.

| Section | Frame ID | Purpose |
|---|---|---|
| Provider page root | `1784:1156` | Main page frame (1440 × ~9000) |
| Hero (Provider) | `1786:932` | Adapted from customer Hero, Dashboard preview right-side |
| S1 — Matchmaking | `1789:830` | Side-by-side: cold inbox vs structured request |
| S2 — One-Stop Dashboard | `1792:814` | 3 sub-views (Inbox, Active, Coverage) + 3 feature cards |
| S3 — Performance Tracker | `1798:817` | Dashboard with Gold Founding-Partner badge + Early-Warning panel |
| S4 — Two Channels | `1799:822` | Affiliate Link card + Engagement Requests card (partner-tier locked) |
| S5 — FAQ | `1800:829` | 8 accordion items (2 expanded by default) |
| S6 — Register-as | `1801:837` | Persona picker + form + live counter + Gold CTA |
| Newsletter + Footer | `1784:1713` | Unchanged from customer page |

---

## 7. API endpoints needed for Provider experience

### Authentication & onboarding
- `POST /api/providers/applications` — Beta application form submit (Sektion 6)
- `POST /api/auth/provider/login` — email magic-link login (separate from user auth)
- `GET /api/providers/me` — current provider profile

### Dashboard data
- `GET /api/providers/inbox` — incoming engagement requests
- `GET /api/providers/active` — accepted engagements
- `GET /api/providers/archive?status=` — historic
- `POST /api/engagements/{id}/accept` — accept a request (billing event fires here)
- `POST /api/engagements/{id}/decline` — decline with reason

### Profile + coverage
- `GET /api/providers/me/coverage` — categories + jurisdictions
- `PATCH /api/providers/me/coverage` — update coverage
- `PATCH /api/providers/me/auto-pause` — set threshold for inbox auto-pause

### Performance
- `GET /api/providers/me/performance` — KPI snapshot (acceptance rate, avg confirm, breaches, tier, ranking)
- `GET /api/providers/me/breach-warnings` — active warnings (Early-Warning panel)

### Billing
- `GET /api/providers/me/billing/history` — all fee events
- `GET /api/providers/me/billing/upcoming` — pending charges

### Affiliate
- `GET /api/providers/me/affiliate/link` — generate / fetch the affiliate link
- `GET /api/providers/me/affiliate/stats` — clicks + cost

### Beta cohort counter
- `GET /api/beta/cohort-status` — public endpoint returning `{claimed_count, cap, status}` for the Live Counter on Landing Page Sektion 6

---

## 8. Tracking events — Provider Landing Page

```
provider_landing_viewed{source}
provider_landing_section_viewed{section: 'hero' | 'matchmaking' | 'dashboard' | 'performance' | 'two-channels' | 'faq' | 'register'}
provider_landing_faq_expanded{question_id}
provider_landing_persona_selected{type: 'solo' | 'boutique' | 'mid-sized'}
provider_landing_practice_area_toggled{area, active}
provider_landing_country_toggled{code, active}
provider_landing_apply_submitted{persona, areas[], countries[], email_domain}
provider_landing_apply_validation_error{field, reason}
provider_landing_secondary_cta_clicked{location: 'hero_see_how' | 'card4_affiliate' | 'card4_engagement'}
```

Plus the cross-cutting `auth_signup_started{source: 'provider_apply'}` when Beta application completes.

---

## 9. Decisions Log + Resolved Open Items

All 7 originally-open items resolved 2026-05-16. Each decision below is binding for v1 implementation.

### ✅ #1 — Counter accuracy: STATIC 30-MIN CACHE

The Beta-cohort counter ("23 of 100 founding spots claimed") on Landing Page §6 is backed by a server-side cache refreshed every 30 minutes via cron. No SSE / WebSocket / polling.

**Rationale:** the counter is a scarcity-signal, not a live-data feed. Approximate-current is sufficient. Avoids the infrastructure overhead of real-time push for a number that moves <5×/day in beta.

**Backend implementation:** cron job at :00 and :30 of every hour reads `pilot_inquiries WHERE partner_status = 'active' COUNT` and writes to `cache.beta_cohort_count` table. Public endpoint `GET /api/beta/cohort-status` reads from cache. Stale-OK headers.

### ✅ #2 — Beta over-cap: WAITLIST WITH PRIORITY

When the 100-Founding-Partner cap is reached, the page does NOT hard-stop. Copy switches to:
- Counter pill becomes: `100 of 100 spots claimed — join the priority waitlist`
- CTA copy stays "Apply for Beta cohort →" but functionally writes new applications to `pilot_inquiries` with `partner_status = 'waitlist_priority'`
- Confirmation page acknowledges: *"Founding cohort is full. You're on the priority waitlist for the next phase. We'll reach out within 2 weeks when the next slot opens."*

**Rationale:** don't lose interested providers; waitlist length itself becomes social proof; existing applicants get clear priority access to next phase.

### ✅ #3 — Affiliate-Link slug structure: HYBRID

Format: `complihub360.com/p/m-lang-{4-char-base36-suffix}`

Examples:
- `complihub360.com/p/m-lang-x4f2`
- `complihub360.com/p/s-whitcomb-9k1q`
- `complihub360.com/p/dubois-cabinet-p3b8`

**Rationale:** readable name-fragment for trust + shareability, 4-char suffix prevents collisions (allows multiple "M. Lang" providers), SEO-friendly. Slug auto-generated from provider name+initials, suffix is random.

**Backend:** unique constraint on full slug; slug generation handles name collisions by re-rolling suffix.

### ✅ #4 — Onboarding-call tooling: CAL.COM (self-hosted)

Cal.com (open-source booking platform), self-hosted on CompliHub infrastructure.

**Rationale:** open-source eliminates per-seat SaaS cost (vs Calendly), full data control, brand-skinnable, fits the orchestrator-philosophy (we own the stack we depend on).

**Implementation cost:** ~1 week to self-host + integrate (Docker deployment, Postgres, OAuth for Cal.com admin). Vs. Calendly ~$15/seat/month forever.

### ✅ #5 — Provider invoicing: FULL VAT-COMPLIANT FROM v1

All provider fees (Affiliate-clicks + Engagement-accepts) generate VAT-compliant invoices from day one, via Stripe Invoicing.

**Why not simple-receipt:** provider-trust signal. B2B providers need VAT-compliant invoices for their own bookkeeping — anything less makes us look amateurish. Will trigger early provider churn.

**Coverage:**
- DE residents: 19% VAT or reverse-charge if cross-border EU B2B with valid VAT-ID
- UK residents: 20% VAT or reverse-charge depending on cross-border status
- US residents: state sales-tax via Stripe Tax if nexus exists
- TR residents: KDV (20%) if e-Fatura-registered, otherwise net invoice
- Other EU: handled by Stripe Tax with VIES VAT-ID validation

**Invoice content:** sequential invoice number, dates, line items (description: "Engagement acceptance fee for request {id}" or "Affiliate click traffic 2026-05"), VAT rate or reverse-charge indication, CompliHub corporate identity + VAT-ID, provider name+address+VAT-ID.

**Endpoint:** `GET /api/providers/me/billing/invoices/{id}.pdf` returns rendered PDF. Email auto-sent on creation.

### ✅ #6 — Decline-reason taxonomy: 6 OPTIONS

When provider clicks Decline on an engagement request, they pick one reason:

1. `out_of_scope` — Regulatory area not my expertise
2. `at_capacity` — Too many active engagements
3. `wrong_jurisdiction` — I don't cover this market
4. `outside_fee_tier` — User budget too low or too high
5. `language_barrier` — Don't speak required language
6. `other` — free-text field

Tracking: `engagement_declined{obligation_id, reason, free_text?}` event. Used for:
- Matching-engine tuning (reduce false matches)
- Persona insights (which providers see what mismatches)
- Capacity-management UX (auto-pause threshold tuning)
- Product analytics dashboards

Free-text on `other` is mandatory (min 10 chars) to prevent throwaway decline-data.

### ✅ #7 — Dashboard login: EMAIL + PASSWORD ("richtiger Login")

Provider Dashboard authentication uses traditional email + password from v1. **Not** magic-link.

**Diverges from User auth** (per `wizard-dev-spec-complete.md` §1.4 — Users still get magic-link).

**Rationale:** Providers are returning users with longer engagement sessions (vs. one-time risk-map users). Magic-link friction stacks up over repeated logins. Traditional auth respects power-user workflow.

**Implementation requirements:**
- Password hashing: argon2id (NIST-recommended, memory-hard)
- Password reset flow via email
- "Forgot password" link in login UI
- Rate limiting: 5 attempts per IP per 15 min, account-lock at 10 failed attempts (24h auto-unlock or admin-unlock)
- Optional: 2FA (TOTP) — defer to Phase 2 unless compliance requires earlier
- Session: JWT with 24h expiry, sliding refresh on activity

**OAuth (Google / Microsoft) deferred to Phase 2** — add as secondary option when provider volume justifies (~500+ active providers).

---

### Cross-cutting impact

Items #5 + #7 affect downstream specs:
- `wizard-dev-spec-complete.md` §1.4 — User auth remains magic-link, Provider auth is separate flow. Doc to be updated with auth-divergence note.
- New backend services needed: password-hashing + reset infrastructure, Cal.com self-hosted, Stripe Invoicing config, slug-generator with collision-handling.

### Still-open items

None — all 7 originally-open items resolved. Future items will be added to this section as they arise.

---

## 10. Companion docs

- [`wizard-dev-spec-complete.md`](./wizard-dev-spec-complete.md) — User-side wizard backend spec
- [`compass-uptake-from-wizard.md`](./compass-uptake-from-wizard.md) — Design system uptake from wizard build
- [`wizard-markets-expansion-us-tr.md`](./wizard-markets-expansion-us-tr.md) — Coverage-expanding markets

Source documents being overridden:
- `GoogleDrive_Docs/Provider Flows (Complete).md` — see §1 above for which sections override
- `GoogleDrive_Docs/Monetization Model (Deep Dive).md` — §2.1 + 2.2 confirmed, pricing made public

---

## File metadata

Canonical addendum for Provider experience v1. Update in-place as decisions land. Sync to Provider Flows doc when stable.
