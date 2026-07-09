# Backend Backlog — Partner Onboarding · Complete DEV SPEC

**Status:** OPEN — design done (6 Desktop + 6 Mobile frames), backend pending
**Created:** 2026-05-17
**Scope:** Post-invite Provider Onboarding flow — from "Apply for Beta accepted" email → activated Verified-Partner workspace
**Figma:** `CompliHub-360` → Page `Provider` → frames `1868:2` · `1840:3678` · `1870:2` · `1874:2` · `1875:2` · `1876:2` (Desktop) + `1877:2` · `1877:72` · `1877:161` · `1878:2` · `1878:73` · `1878:144` (Mobile)
**Related docs:** `provider-spec-addendum.md` (decisions §9 — full password auth from day 1, Stripe Invoicing, Cal.com self-hosted, beta cohort + waitlist) · `app-workspace-dark-tokens.md` (token map) · `wizard-dev-spec-complete.md` (sibling Customer Wizard spec — same handoff format)

---

## Why this exists

The Provider Onboarding flow takes a beta-accepted applicant from the moment they click their invite link to the moment their workspace is activated and the Verified-Partner badge appears in search. It's a 6-step wizard that gates verification (license, ID, address) behind a 1-2 business-day Trust-Ops review. The Customer Wizard collects intent — this one collects the **deliverable** the platform sells (a verified, billable, bookable Partner profile).

Key constraints:
- **Full password auth from day 1** (per Provider-Spec-Addendum §9 decision #7) — no magic-link for Partner accounts, argon2id hashing
- **Verification is manual** — Trust-Ops reviews license + ID + address before activation, asynchronously
- **Stripe Invoicing** for full-VAT monthly invoices (€2/click affiliate + €92/accept engagement)
- **Cal.com self-hosted** at `cal.complihub360.com` — no third-party booking integration
- **Auto-save** on every step transition — Partners can leave and resume within 14 days; expired invites trigger a re-invite flow

---

## 1. Cross-cutting concerns

### 1.1 Auth model (Provider-side)

- **Invite link**: signed JWT with 14-day TTL, single-use. Encodes `invite_id`, `partner_email`, `cohort_id`. Stored in `partner_invites` table with `consumed_at` timestamp.
- **Workspace creation**: occurs at Step 1 submit — generates `partner_id`, hashes password with argon2id (memory 64 MiB, time 3, parallelism 4), persists session cookie. From Step 1 onward, session-based auth (HttpOnly + Secure + SameSite=Lax cookie, 30-day rolling).
- **2FA**: opt-in after onboarding completion. TOTP-based (RFC 6238), enrolled via Profile → Security, 8 backup codes generated.
- **Sign-out**: clears session, redirects to `/login` (Provider variant).

### 1.2 Auto-save & resumption

- **Trigger**: every `Continue` press persists current step state to `partner_onboarding` table. Field-level edits also debounced-save after 800 ms idle.
- **Resumption**: any invite link click after Step 1 completion resolves to the highest-completed step. Partner can navigate backward to edit prior steps (footer Back is enabled on Steps 2-6).
- **Invite expiry**: invite JWT is 14 days. After expiry, Partner sees an "Invite expired" screen with a "Request new invite" CTA → triggers `POST /api/partner/invite/refresh` which generates a new invite (rate-limited to 1/24h per email).
- **Drop-off recovery**: if 24h passes without progress past Step 4 (Verification), Trust-Ops gets a Slack ping to nudge the Partner via email.

### 1.3 Document handling (Verification step)

- **Storage**: EU-region S3-compatible bucket (Hetzner Object Storage, Falkenstein DC) with AES-256 server-side encryption at rest.
- **Encryption keys**: managed via KMS, rotated quarterly.
- **Retention**: documents auto-deleted 90 days after `verified_at` or 90 days after `partner_id` deactivation, whichever is sooner.
- **Access**: only Trust-Ops role + audited admin can fetch. Partner can request re-download once via email (signed 15-min URL).
- **File constraints**: PDF, JPG, PNG. Max 10 MB per file. Virus scan via ClamAV on upload. Filename sanitized before storage.
- **Sharing**: never shared with third parties. Cross-reference to GDPR DPA Annex II.

### 1.4 Localization

- **MVP**: English only (UI strings). Headlines, body copy, validation messages.
- **Post-launch**: German + Turkish + French based on language picker in Step 2. Sub-licenses use locale-specific terms (e.g. "License #" → "Bestallungsnummer" for DE-licensed StB; "Vergi Numarası" for TR YMM).
- **Validation messages**: locale-aware (use `Accept-Language` header).

### 1.5 Currency & VAT

- **Invoicing currency**: EUR. Provider's local currency conversion shown on hover (FX-rate-of-billing-date), full EUR amount is the invoice line item.
- **VAT collection**: Stripe Invoicing handles VAT calculation based on `vat_id` collected in Step 2. Reverse-charge applies for B2B intra-EU transactions per VAT-ID validation via VIES.
- **VAT-ID validation**: Step 2 submit triggers async VIES lookup; failure marks `vat_id_status = unverified` and surfaces a warning at Step 5 (cannot connect Stripe with invalid VAT-ID for EU partners).

---

## 2. State machine — Partner record lifecycle

```
invited       — JWT sent, not yet clicked
↓
account_set   — Step 1 complete, password hashed, session active
↓
firm_profile  — Step 2 complete
↓
coverage_set  — Step 3 complete
↓
docs_uploaded — Step 4: all REQUIRED docs uploaded (license + ID + address-proof)
↓
in_review     — Step 6 submitted, Trust-Ops queue
↓
verified      — Trust-Ops marks all docs valid
↓
active        — Workspace live, profile visible in search, billable
─────
suspended     — Manual action (compliance breach, payment failure)
deactivated   — Partner requested or platform termination
```

Transitions are **monotonic** through `invited → active` (cannot skip states). After `verified`, edits to firm/coverage trigger `pending_reverify` for affected fields (e.g. adding a new market = 2-business-day re-verification of competence).

---

## 3. Step-by-step detail

### 3.1 Step 1 · Account · Set password

**Figma:** `1868:2` (Desktop) · `1877:2` (Mobile)

**Inputs**

| Field | Type | Validation |
|---|---|---|
| `email` | string (read-only) | pre-filled from invite JWT, masked-display only, never re-validated |
| `password` | string | min 12 chars · ≥1 upper · ≥1 lower · ≥1 number · ≥1 symbol · not in HIBP top-100k breach list (k-anonymity SHA-1 prefix lookup) |
| `password_confirm` | string | must equal `password` |

**Live state**: 5-rule check list updates per keystroke (debounced 100 ms).

**Side effects on submit**
- argon2id hash + salt persisted
- `partner_id` generated (UUID v4)
- session cookie issued
- audit log: `account_created` event with IP, UA, geo
- email: "Welcome to CompliHub Partner — your onboarding is in progress" sent to `email`

**API**
```http
POST /api/partner/onboarding/account
Authorization: Bearer <invite_jwt>
Content-Type: application/json
{
  "password": "<plaintext>",
  "password_confirm": "<plaintext>"
}
→ 200 OK
Set-Cookie: ch_session=<...>; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
{
  "partner_id": "ptr_8f24b1c...",
  "next_step": 2
}
→ 422 Unprocessable Entity (validation failures)
{ "errors": [{"field":"password","code":"too_short"}, ...] }
→ 401 invalid_invite (JWT expired/consumed/malformed)
```

**Edge cases**
- Invite already consumed → 401 with `code: "invite_consumed"`. UI shows: "This invite was already used. Sign in to continue."
- Password matches a leaked list → 422 `code: "password_breached"`. UI shows: "This password appeared in a known data breach. Pick something unique."
- Rate-limit: 5 attempts/15 min per `invite_id`, then 1h cooldown.

### 3.2 Step 2 · Firm Profile

**Figma:** `1840:3678` (Desktop) · `1877:72` (Mobile)

**Inputs**

| Field | Type | Validation |
|---|---|---|
| `legal_name` | string | 2-128 chars, no leading/trailing whitespace |
| `country` | ISO-3166-1 alpha-2 | enum from supported markets (initially `DE`, `AT`, `NL`, `FR`, `IT`, `ES`, `UK`, `CH`, `TR`, `US`) |
| `founded_year` | integer | 1900 ≤ year ≤ current year |
| `firm_type` | enum | `solo` · `boutique` (2-10) · `mid_sized` (11-50). Drives downstream pricing-tier and matching weights. |
| `license_number` | string | country-specific format validation (e.g. DE StB: `\d{2}/\d{5}` or BStBK number; TR YMM: `\d{6}`; US CPA: state-specific). |
| `vat_id` | string | EU-VAT format `[A-Z]{2}\d{8,12}`; TR `\d{10}`; non-EU optional |
| `languages` | string[] | ISO-639-1, min 1, max 12 |

**License-number cross-check (async)**

On submit, fire `POST /internal/license-check` to the per-country registry adapter:
- **DE**: BStBK XML feed (Bundessteuerberaterkammer registry)
- **AT**: KSW (Kammer der Steuerberater und Wirtschaftsprüfer)
- **NL**: NBA (Nederlandse Beroepsorganisatie van Accountants)
- **TR**: TÜRMOB (Türkiye Serbest Muhasebeci Mali Müşavirler ve Yeminli Mali Müşavirler Odaları Birliği)
- **UK**: ICAEW + ACCA + CIOT registries
- **US**: state CPA boards per first-2-letter prefix
- **Fallback**: manual flag set if no registry available; Trust-Ops verifies in Step 4

Status persisted as `license_check_status`: `pending` · `verified` · `not_found` · `mismatch`. Not blocking — Partner proceeds; flag surfaces in Step 6 Review and Trust-Ops dashboard.

**VAT-ID cross-check (async)**

VIES validation for EU. Async. Status persisted as `vat_id_status`: `pending` · `valid` · `invalid` · `unreachable` (VIES timeout). Re-tried 3× before settling on `unreachable`.

**API**
```http
POST /api/partner/onboarding/firm
Cookie: ch_session=<...>
{
  "legal_name": "Dahlmann CPA Steuerberatungs GmbH",
  "country": "DE",
  "founded_year": 2014,
  "firm_type": "boutique",
  "license_number": "StB-Nr. 14/12345",
  "vat_id": "DE123456789",
  "languages": ["de","en"]
}
→ 200 OK
{ "next_step": 3, "license_check_status": "pending", "vat_id_status": "pending" }
```

### 3.3 Step 3 · Coverage

**Figma:** `1870:2` (Desktop) · `1877:161` (Mobile)

**Inputs**

| Field | Type | Validation |
|---|---|---|
| `markets` | string[] | ≥1, ISO-3166-1 alpha-2 from supported list. `country` from Step 2 auto-included if not present. |
| `domains` | string[] | ≥1, enum: `VAT` · `EPR` · `CST` · `DAT` · `PSF` · `OTH`. If `OTH` selected, Step 4 free-text becomes REQUIRED. |
| `business_models` | string[] | ≥1, enum: `D2C` · `Marketplace` · `B2B` · `SaaS` · `Hybrid` |
| `service_depth` | string[] | ≥1, enum: `filing` · `advisory` · `audit` · `litigation` |

**Matching engine impact**: coverage is the **routing key**. Lead/engagement matching pipeline indexes on the cartesian product of `markets × domains × business_models × service_depth`. Re-indexed within 60 seconds of save.

**Hard rule**: if a Partner picks a market not in the supported list (currently `OTH` only), they cannot be matched as Verified-Partner for that market — but their note in Step 4 surfaces to Trust-Ops as a potential expansion signal.

**API**
```http
POST /api/partner/onboarding/coverage
Cookie: ch_session=<...>
{
  "markets": ["DE","AT"],
  "domains": ["VAT","EPR","DAT"],
  "business_models": ["D2C","Marketplace"],
  "service_depth": ["filing","advisory","audit"]
}
→ 200 OK
{ "next_step": 4, "matching_index_status": "queued" }
```

### 3.4 Step 4 · Verification

**Figma:** `1874:2` (Desktop) · `1878:2` (Mobile)

**Inputs**

| Document | Required | Constraints |
|---|---|---|
| `license_cert` | yes | PDF/JPG/PNG · max 10 MB · ClamAV pass · OCR pre-check for matching license # from Step 2 |
| `government_id` | yes | PDF/JPG/PNG · max 10 MB · ClamAV pass · liveness flag for ID-card both-sides |
| `address_proof` | yes | PDF/JPG/PNG · max 10 MB · ClamAV pass · OCR for issued-date < 3 months |
| `indemnity_insurance` | no | PDF/JPG/PNG · max 10 MB · ClamAV pass — boosts `trust_score` by +10 |
| `other_domains_notes` | conditional | required if Step 3 `domains` includes `OTH`; 50-2000 chars |

**Upload flow**
1. Client POSTs `POST /api/partner/onboarding/documents/upload-url` with `{ doc_type, filename, content_type, size }` → receives signed 15-min S3 PUT URL
2. Client uploads directly to S3 (browser → S3, bypasses backend)
3. Client POSTs `POST /api/partner/onboarding/documents/confirm` with `{ doc_type, s3_key, sha256 }` → backend records to `partner_documents` and queues ClamAV scan
4. Frontend polls `GET /api/partner/onboarding/documents` every 3s while a doc is `uploading | scanning`; backend pushes via SSE preferred for production

**Document states**
- `pending` — no upload yet
- `uploading` — signed URL issued, S3 PUT in flight
- `scanning` — ClamAV in progress (typical < 30s)
- `uploaded` — scan pass, awaiting Trust-Ops review
- `verifying` — Trust-Ops has it open
- `verified` — passed manual review
- `rejected` — Trust-Ops rejected (reason recorded); Partner must re-upload

UI maps:
- `pending` → "Drop / click" (border-only tile)
- `uploading | scanning` → "Verifying…" (amber spinner tile)
- `uploaded | verifying` → "Uploaded" (petrol-fill tile)
- `verified` → "Verified ✓" (petrol-fill + ✓)
- `rejected` → "Re-upload" (amber border + reason link)

**API**
```http
POST /api/partner/onboarding/documents/upload-url
{ "doc_type": "license_cert", "filename": "StB-Bestellung.pdf", "content_type": "application/pdf", "size": 2200000 }
→ 200 OK
{ "upload_url": "https://...s3.../partners/ptr_.../docs/...?X-Amz-...", "s3_key": "partners/...", "expires_at": "..." }

POST /api/partner/onboarding/documents/confirm
{ "doc_type": "license_cert", "s3_key": "...", "sha256": "..." }
→ 200 OK
{ "status": "scanning" }

GET /api/partner/onboarding/documents
→ 200 OK
{ "documents": [{"doc_type":"license_cert","status":"verified",...}, ...] }
```

### 3.5 Step 5 · Tooling

**Figma:** `1875:2` (Desktop) · `1878:73` (Mobile)

**Two connectors**

**5.1 Stripe Invoicing connect**
- OAuth Authorize Account flow against Stripe Connect (CompliHub platform → Partner standalone account)
- Scopes: `read_write` (limited to invoicing endpoints)
- On callback, persist `stripe_account_id` + `stripe_webhook_endpoint_id`
- Stripe webhook registered for `invoice.payment_succeeded` · `invoice.payment_failed` · `account.updated`
- Partner sees: "Connected · acct_1Mxxxx · Webhook live"
- Required before workspace can be `active` if Partner has any `domain × market` that triggers billable events

**5.2 Cal.com self-hosted connect**
- We host Cal.com ourselves at `cal.complihub360.com`. Partner signs in with their CompliHub credentials (SSO via OIDC, our IdP).
- Provisioning: on connect, create Cal.com user with matching email, link `cal_user_id` to `partner_id`.
- Partner sets their availability windows in Cal.com itself (we link out — no inline editor).
- Booking webhook → CompliHub: when a Customer books, `POST /webhook/cal/booking-created` updates `engagement_id.first_call_scheduled_at`.

**Defer policy**: Cal.com can be deferred past activation (Partner sees "Connect Cal.com later from Settings"). Stripe **cannot** be deferred — Step 5 cannot complete without Stripe connection (or explicit `defer_stripe = true` for non-billable cohort Partners, which is an admin override).

**API**
```http
POST /api/partner/onboarding/tooling/stripe/connect-url
Cookie: ch_session=<...>
→ 200 OK
{ "authorize_url": "https://connect.stripe.com/oauth/authorize?..." }

GET /api/partner/onboarding/tooling/stripe/callback
?code=ac_...&state=...
→ 302 → /onboarding/tooling?stripe=connected

POST /api/partner/onboarding/tooling/cal/connect
Cookie: ch_session=<...>
→ 200 OK
{ "cal_user_id": "u_...", "cal_workspace_url": "https://cal.complihub360.com/dahlmann-cpa", "next_step": 6 }
```

### 3.6 Step 6 · Review & Submit

**Figma:** `1876:2` (Desktop) · `1878:144` (Mobile)

**Render**: aggregated read-only summary of Steps 1-5 with Edit ↗ links. Status pill per section:
- `complete` — green/petrol, "Complete"
- `pending` — amber, "Pending verify" (currently only Step 4 typically)

**Submit action** transitions `partner.status` from `tooling_set` → `in_review`. Triggers:
- Trust-Ops Slack notification: `#trust-ops-queue` channel with `ptr_id` + summary card
- Email to Partner: "We've received your application — typical review 1-2 business days"
- Internal SLA timer starts (target 1 BD, hard cap 2 BD)

**Activation flow (asynchronous, after submit)**

1. Trust-Ops opens partner record in admin
2. Reviews each document (license, ID, address-proof, optional insurance) in audit-logged UI
3. For each doc: `verified` or `rejected` (with reason)
4. If all REQUIRED docs `verified` and `license_check_status ∈ {verified, manual_pass}`:
   - `partner.status` → `verified`
   - Workspace activated: `active = true`, search visibility on
   - Email: "You're live — Verified-Partner badge active"
   - Welcome-to-Partner-workspace email with dashboard URL
5. If any REQUIRED doc `rejected`:
   - Email Partner with rejection reason + re-upload link
   - `partner.status` stays `in_review` until re-upload + re-verify

**API**
```http
POST /api/partner/onboarding/submit
Cookie: ch_session=<...>
→ 200 OK
{ "status": "in_review", "submitted_at": "2026-05-17T14:32:00Z", "expected_decision_by": "2026-05-19T14:32:00Z" }

GET /api/partner/onboarding/status
→ 200 OK
{
  "partner_id": "ptr_...",
  "status": "in_review",
  "submitted_at": "...",
  "expected_decision_by": "...",
  "rejected_documents": []
}
```

---

## 4. API contract summary

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/partner/invite/refresh` | POST | invite_email | Generate new invite for expired link (rate-limit 1/24h) |
| `/api/partner/onboarding/account` | POST | invite JWT | Step 1 — create workspace |
| `/api/partner/onboarding/firm` | POST | session | Step 2 — firm profile |
| `/api/partner/onboarding/coverage` | POST | session | Step 3 — coverage |
| `/api/partner/onboarding/documents/upload-url` | POST | session | Step 4 — get signed S3 PUT URL |
| `/api/partner/onboarding/documents/confirm` | POST | session | Step 4 — record uploaded doc |
| `/api/partner/onboarding/documents` | GET | session | Step 4 — poll status |
| `/api/partner/onboarding/tooling/stripe/connect-url` | POST | session | Step 5 — start Stripe OAuth |
| `/api/partner/onboarding/tooling/stripe/callback` | GET | OAuth code | Step 5 — Stripe OAuth callback |
| `/api/partner/onboarding/tooling/cal/connect` | POST | session | Step 5 — provision Cal.com |
| `/api/partner/onboarding/submit` | POST | session | Step 6 — submit for activation |
| `/api/partner/onboarding/status` | GET | session | Step 6 — poll review status |

---

## 5. Webhook flows

### 5.1 Trust-Ops admin actions (internal → backend)

- `partner.document.verified` → emit `partner.status_check` (transition to `verified` if all REQUIRED docs pass)
- `partner.document.rejected` → email Partner with reason
- `partner.activate` → set `active = true`, fire `partner.activated` event for search indexing

### 5.2 Stripe webhooks (Stripe → backend)

- `account.updated` — sync Partner Stripe-connect status
- `invoice.payment_succeeded` — record billing event, no Partner action
- `invoice.payment_failed` — increment `failed_payment_count`. After 3 consecutive failures, transition `partner.status` → `suspended`, email Partner + Finance team

### 5.3 Cal.com webhooks (Cal.com → backend)

- `booking.created` — link to `engagement_id` if applicable, update `first_call_scheduled_at`
- `booking.cancelled` — update `engagement_id.notes`, no automatic refund (Partner-Customer handle separately)
- `booking.rescheduled` — update timestamps

### 5.4 ClamAV (async scanner → backend)

- `document.scan.clean` → transition document state `scanning → uploaded`
- `document.scan.infected` → quarantine, transition `scanning → rejected`, alert Trust-Ops

---

## 6. Error states & fallbacks

| Scenario | Behavior |
|---|---|
| Invite link clicked > 14 days after issue | "Invite expired" screen + "Request new invite" CTA |
| Invite link consumed already | Redirect to `/login?email=<masked>` with toast "Already onboarded — sign in" |
| Password breached (HIBP) | Inline 422 + "This password appeared in a known breach" message |
| ClamAV finds infected file | Document tile → "Rejected · contains malware" + re-upload prompt |
| VIES timeout 3× | `vat_id_status = unreachable`, warning at Step 5 Stripe connect, Trust-Ops manual verify |
| License registry returns `not_found` | `license_check_status = not_found`, surface as amber flag in Step 6 Review + Trust-Ops queue priority |
| Stripe OAuth declined by Partner | Step 5 stays incomplete, "Stripe required" amber strip persists, Continue blocked |
| Cal.com provisioning fails | Show inline error, allow defer (mark `cal_status = deferred`), continue to Step 6 |
| Trust-Ops takes > 2 BD | Auto-Slack escalation to Head of Trust-Ops; Partner receives status email "Still in review, typical 1-2 BD — yours is taking a bit longer, we're on it" |
| Doc upload fails mid-transfer | Resumable upload via S3 multipart (>5 MB) or retry full upload (<5 MB). Client retries 3× with exp backoff |

---

## 7. Tracking events

Emit to internal analytics (PostHog) on each step submit:

```js
posthog.capture('partner_onboarding_step_complete', {
  partner_id, step: 1|2|3|4|5|6,
  duration_seconds: <step open → submit>,
  step_attempts: <count of submits, including failed validations>,
  cohort_id, invite_age_days
})
```

Plus:
- `partner_onboarding_started` — first Step 1 GET after invite click
- `partner_onboarding_dropped` — no progress for 24h
- `partner_onboarding_resumed` — Partner returns after dropping
- `partner_onboarding_submitted` — Step 6 submit
- `partner_onboarding_activated` — Trust-Ops marks all docs verified, workspace goes live
- `partner_onboarding_doc_rejected` — Trust-Ops rejects a doc, with reason
- `partner_onboarding_doc_reuploaded` — Partner re-uploads after rejection

KPIs to monitor:
- **Step completion funnel** (1 → 2 → 3 → 4 → 5 → 6 → activated)
- **Time-to-activation** (invite click → `active = true`): target ≤ 3 BD p50
- **Doc rejection rate** by doc-type
- **Stripe-connect drop-off** at Step 5
- **License-check `not_found` rate** by country

---

## 8. Decisions log

1. **Full password auth from day 1, not magic-link** (Provider-Spec-Addendum §9 #7). Rationale: Partners need 2FA-eligible accounts for compliance posture; magic-link doesn't compose with TOTP cleanly.
2. **Beta cohort + waitlist** (§9 #2). Decision: any Partner outside `pilot_cohort_2026_q2` goes to waitlist; not all who apply get an invite.
3. **Hybrid pricing — €2/click + €92/accept + €0 subscription** (§9 #3). Drives Step 5 Tooling pricing strip.
4. **Cal.com self-hosted at `cal.complihub360.com`** (§9 #4). Decision: not using third-party Calendly. Hosts our own Cal.com instance for data sovereignty.
5. **Stripe Invoicing with full VAT** (§9 #5). Decision: Stripe Invoicing (not Stripe Checkout subscriptions), with proper VAT-ID-aware invoicing for B2B compliance.
6. **EU-only doc storage** (this doc §1.3). Hetzner Object Storage, AES-256 SSE, 90-day retention after activation. No US data residency for Partner docs.
7. **Manual verification, not automated** (this doc §3.4). Trust-Ops reviews each license/ID/address-proof. License-registry async cross-check is advisory, not blocking. Rationale: false negatives in automated KYC have high downside (Verified-Partner badge is platform credibility); manual 4-eye review is acceptable cost during beta.
8. **OTH domain free-text required when `domains` includes `OTH`** (§3.4). Forces Partners to declare what other-domain expertise they bring; surfaces to Trust-Ops as expansion signal.
9. **Auto-save with 14-day resumption window** (§1.2). Balances Partner flexibility against stale-data accumulation; expired invites can be refreshed once per 24h.

---

## 9. Implementation order recommendation

1. **Foundations** — `partner_invites` table + JWT issuance + auth middleware
2. **Step 1 endpoint** — password validation (HIBP + complexity) + argon2id hashing + session issuance
3. **Step 2-3 endpoints** — straightforward CRUD with async registry checks (DE first, others in parallel)
4. **Step 4 document pipeline** — S3 signed URLs + ClamAV + Trust-Ops admin UI for review
5. **Step 5 Stripe Connect** — OAuth flow + webhook handlers
6. **Step 5 Cal.com SSO provisioning** — IdP wiring + user-create endpoint
7. **Step 6 submit + Trust-Ops queue UI** — admin dashboard for Trust-Ops to review and decide
8. **Tracking events + observability** — PostHog wiring + funnel dashboards
9. **Edge cases** — invite-refresh, rejected re-upload, suspended/deactivated flows
10. **Localization** — string extraction + DE/TR/FR translations (post-MVP)

---

## File metadata

Canonical handoff for Provider Onboarding backend. Update in-place. When backend implementation begins, append a `## Execution log` section with PRs, decisions, and learned constraints. When fully shipped, archive to `docs/backlog/archive/`.

Pairs with: `wizard-dev-spec-complete.md` (Customer Wizard sibling spec) · `provider-spec-addendum.md` (provider-side overrides + open items) · `app-workspace-dark-tokens.md` (visual token map).
