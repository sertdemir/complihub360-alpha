# COMPLIHUB360 — Trademark Class Dossiers · Classes 35, 42 and 45

**Prepared:** 17 September 2026 · **Revision 2**
**Product baseline:** repository `complihub360-alpha`, branch `main`, commit `67efeb7b`.
**Prepared from:** the live CompliHub360 codebase and website, not from the existing trademark wording.
**Mark:** COMPLIHUB360 (word mark)
**Clearance context:** COMPLYHUB and COMPLY360 in related compliance-software fields. Class 42 carries the highest residual likelihood-of-confusion risk.
**Standing exclusion, retained throughout:** *none of the foregoing relating to compliance with regulations administered by the United States Food and Drug Administration.*

> **What this document is not.** It does not draft the application, does not broaden the business, and does not convert independent-provider services into CompliHub360 services. Where the product does not support a phrase in the advisor's current wording, this document says so.

---

## 0 · Founder decisions recorded in this revision

Two questions raised in revision 1 have been decided and are carried through every section below.

**Decision 1 — AI assistant: claim, but narrowly, under §1(b).**
The retrieval-augmented assistant is built and parked. It will be claimed in Class 42 as an *intent-to-use* item, described by the action it performs — retrieving and summarising regulatory information from a curated knowledge base — and **not** as "AI-powered compliance software". Rationale: the deterministic, source-traceable nature of the live engine is a distinguishing asset against the cited marks, and generic AI wording would blur it.

**Decision 2 — Regulatory-change alerts: Class 45 as information, with a narrow Class 42 notification clause.**
The alerting function will be claimed principally in Class 45 as *providing information regarding changes in regulatory requirements*, where the cited marks are not present. Any Class 42 counterpart stays tied to the user's own prior assessment — *software for notifying users of changes to obligations previously identified for them* — rather than being described as regulatory or compliance monitoring.

**Decision 3 — "Environmental compliance" is genuine and goes beyond packaging.**
The field stays in Classes 35, 42 and 45 as written. It is **not** to be narrowed to packaging and producer responsibility. Consequence: the part that reaches beyond packaging waste law — emissions, chemicals, waste beyond packaging, environmental permitting — is **not implemented today** and rests on intent, not on use. It also creates a named product gap: there is no standalone Environmental Compliance domain and no `environment` provider-category key anywhere in the codebase.

**Decision 4 — "Marketing" covers advertising-law specialists as well as marketing service providers.**
Both are intended provider categories. Consequence: routing to **advertising-law and consumer-protection specialists is implemented today** and is stated in the product copy; routing to **marketing service providers** is modelled (the `seo` category key exists) but nothing routes to them and no surface describes them, so that half rests on intent.

**Consequential product changes already made (17 September 2026):**
- Marketing copy that sold alerts in the present tense has been de-escalated across all four locales. The registration drawer no longer headlines "Real-time alerts, free"; alerts now appear as "in preparation" in the benefit lists, and the stale "Coming in WK3" ship label became "In preparation". **This strengthens rather than weakens the §1(b) position:** the feature remains publicly announced and specified, which is what evidences genuine intent, while no present-tense use is claimed.
- The `/api/v1/search` response no longer returns the string *"AI summary synthesized from knowledge chunks…"*. It now states what the payload actually is: obligations identified by the deterministic engine. The previous string asserted a synthesis the live system does not perform.

---

## 1 · Orientation — what the product actually is

CompliHub360 is a **curated matchmaking marketplace with a deterministic regulatory-obligation engine underneath it**. The system boundary is explicit in the product specification (`docs/backlog/user-flow-matchmaking-v2-spec.md` §1, §6): the platform's job ends when an appointment with an independent specialist is booked. After that only an SLA watchdog remains active.

```
Landing  ──▶  Wizard (Markets → Operations → Domains → Review)
                 │  produces a structured SearchProfile
                 ▼
         POST /api/v1/search
                 ├── compliance engine  → obligations, severities, statutes, penalties, deadlines
                 └── provider scoring   → anonymised, ranked provider list
                 ▼
         Risk Map (partial, guest-visible)
                 ▼
         Register gate  ──▶  Full risk map + anonymous provider listing (stage 1)
                 ▼
         Provider detail page (stage 2 — still anonymous, monetised open)
                 ▼
         Native scheduling  →  booking = paid lead = two-sided identity reveal (stage 3)
                 ▼
         Handoff to the independent provider · SLA watchdog + reviews continue
```

**Eight canonical domains** (`src/lib/domains.ts`): Tax & VAT · EPR & Packaging · Data & Privacy · Marketing Compliance · Corporate & Structure · Product Compliance · Logistics & Customs · Legal Advisory.

**Eight profiled markets** (`packages/compliance-engine/country-profile.ts`): DE, FR, UK, IT, ES, NL, TR, **US**. The assistant's jurisdiction corpus additionally carries AT.

**Four interface languages:** EN, DE, ES, TR.

**The boundary is stated on the site itself.** Homepage FAQ:

> "No. CompliHub maps obligations and surfaces what is likely to apply to your operation — it is not legal advice. When a matter needs a binding opinion, we connect you to a Verified Partner who can give one."

And in the code that generates AI answers (`services/compliance-api/src/assistant.ts`):

> "Answers are information, not legal/tax advice (RDG/StBerG), and must never reproduce licensed source text verbatim."

CompliHub360 therefore **does not** prepare or file VAT returns, register EPR schemes, clear customs, draft contracts, act as DPO, or perform any other regulated professional service.

---

# PART I — CLASS 35 DOSSIER

## Business information, professional-needs identification, referral and provider matching

### Main purpose

Class 35 covers the **intermediary layer**: CompliHub360 takes structured business information from a company, uses it to identify which *types* of professional assistance that company needs, presents a curated and searchable population of independent providers, ranks and compares them, and brings the two sides together in a booked appointment. It also covers the business services rendered **to the providers** — application intake, vetting, exposure, performance reporting and fee invoicing.

### Advisor's current starting wording (reference only)

> "Providing business information to assist businesses in identifying professional service needs; providing an online searchable database featuring business information and business contacts; providing online referrals and business matching services connecting businesses with independent professional service providers in the fields of tax and value-added tax, extended producer responsibility and packaging compliance, environmental compliance, data privacy and protection, marketing, corporate formation, structuring and compliance, product regulatory compliance, customs brokerage, logistics and legal services; none of the foregoing relating to compliance with regulations administered by the United States Food and Drug Administration."

---

### 35.1 — Professional-service-needs identification via the guided assessment

**Status:** CURRENTLY IMPLEMENTED
**Component:** `/:locale/wizard` and the embedded entry-door wizard — `src/components/home/AnimatedWizard.tsx`; backed by `POST /api/v1/search`.
**What the user does:** answers four steps — markets, operating model (D2C e-commerce / B2B wholesale / marketplace / SaaS / hybrid / other), the domains of concern, then reviews.
**What COMPLIHUB360 does:** converts the answers into a structured `SearchProfile` and runs it through the deterministic obligation engine, which returns the duties that plausibly apply, each with a severity band, its statute, a penalty range and a filing cadence.
**What the user receives:** a named list of professional-service needs — "VAT registration and filing in DE and NL", "EPR packaging registration (LUCID) in DE", "consent records under GDPR/TTDSG" — each labelled `confirmed` (user-selected domain) or `likely` (engine-selected).
**Provider categories:** all eight.
**What the independent provider ultimately does:** the identified work.
**Why Class 35:** "providing business information to assist businesses in identifying professional service needs". The output is a needs list, not the professional work.
**Boundary note:** the output states statutes, deadlines and penalty ranges — richer than bare "business information", and to be read with the Class 45 layer. It must not be characterised as an audit, an opinion or a determination.

---

### 35.2 — Prose-query entry to needs identification

**Status:** CURRENTLY IMPLEMENTED (page and route live; the substantive answer body is still a fixture pending the RAG wiring)
**Component:** `/:locale/search` — `src/pages/SearchResultPage.tsx`.
**What the user does:** types a free-text question, e.g. "Do I owe VAT in Italy if I sell through Amazon?"
**What COMPLIHUB360 does:** answers with sourced information and the relevant obligations, then bridges into the wizard. No provider list and no gate here by design.
**Why Class 35:** the second of two entry points into needs identification.

---

### 35.3 — Curated, searchable provider population with anonymous profiles

**Status:** CURRENTLY IMPLEMENTED
**Component:** provider strip on `/:locale/results`, fed by the `providers` payload of `POST /api/v1/search`.
**What COMPLIHUB360 does:** selects providers whose recorded coverage includes the user's country, scores them, and returns an **anonymised** profile for each: pseudonym label, region, year active since, specialisations, languages, rating, completed mandates, average response time, billing model, verified badge, match percentage.
**Why Class 35:** an online searchable database featuring business information about professional service providers.
**Boundary note — important:** the advisor's phrase **"business contacts"** is a poor fit. Contact details are *deliberately withheld* through stages 1 and 2 and released only after an appointment is booked. The database is one of business *capabilities and attributes*. Counsel may wish to re-phrase.

---

### 35.4 — Provider matching, ranking and comparison

**Status:** CURRENTLY IMPLEMENTED
**Component:** scoring block in the `/api/v1/search` handler.
**What COMPLIHUB360 does:** computes `Total = 0.6 · Relevance + 0.3 · Quality + 0.1 · Partner priority`, where Relevance = 0.6 · country coverage + 0.4 · share of the user's requested domains covered; Quality = 0.4 · rating + 0.3 · confirmation rate + 0.2 · responsiveness + 0.1 · absence of SLA breaches. Out-of-office providers are halved; watchdog-downgraded providers multiplied by 0.4. The user-facing **match percentage** is the normalised relevance component, banded high / strong / moderate.
**What the user receives:** a ranked shortlist plus a `match_basis` object decomposing the percentage — which country matched, which requested domains this provider covers and which it does not.
**Boundary note:** the ranking is **deterministic, not AI**, and the site states publicly that ranking is never for sale.

---

### 35.5 — Progressive disclosure: anonymous listing → paid detail open → identity reveal

**Status:** CURRENTLY IMPLEMENTED
**Component:** `/:locale/provider/:key` served by `GET /api/v1/provider/:key/detail`.
**What COMPLIHUB360 does:** serves the stage-2 payload — full pricing table, coverage, credentials, availability — never leaking name, logo, website or contact; records the monetised `provider_detail_opened` event, deduplicated server-side to once per (user, provider) per rolling 30 days.
**Why Class 35:** provider comparison and qualified referral; from the provider's side, paid business exposure.
**Gap note:** the **anonymity model is a distinguishing feature of the referral service** and is reflected nowhere in the current wording.

---

### 35.6 — Appointment booking as the referral moment

**Status:** CURRENTLY IMPLEMENTED (slot generation is business-hours based; live calendar synchronisation is planned — see 42.9)
**Component:** `/:locale/provider/:key/schedule` → `POST /api/v1/scheduling`.
**What COMPLIHUB360 does:** creates the booking, fires `scheduling_confirmed` and `provider_lead_charged`, and performs the **two-sided reveal** — the user sees the provider's identity and contact details; the provider receives the dossier.
**Why Class 35:** this is the referral itself, and arranging appointments for third parties is an ordinary Class 35 business function.
**Gap note — largest in this class:** the current wording says "referrals and business matching" but nothing about **arranging and scheduling appointments**, which is the actual conversion event and the billed moment of the business model.

---

### 35.7 — Provider application, intake and vetting

**Status:** CURRENTLY IMPLEMENTED (application form and token-gated intake live; vetting is a deliberate manual step)
**Component:** `/:locale/partner-apply` — `src/pages/PartnerApplyPage.tsx` (added 29 August 2026); `/:locale/provider-intake` → `POST /api/v1/provider/intake`.
**What the provider does:** a firm may **apply** through the public application form — name, website, countries, domains, admissions and certifications, i.e. the minimum the review needs. Separately, a recruited provider receives a token-gated intake link and submits the full package: firm data, certifications, specialisations, countries and languages, billing model, pricing table, pseudonym attributes and a statutes confirmation.
**What COMPLIHUB360 does:** stores the package at `partner_status = 'inactive'`, validates the submitted VAT identification number against the EU VIES service (`services/compliance-api/src/vies.ts`) and persists the verdict with its timestamp, then routes it to manual human review. Only an approved provider becomes `active` and therefore visible in any listing.
**Correction to revision 1:** revision 1 stated flatly that there is no self-registration. That is now too strong. A provider can **apply** on the public site; it still cannot **self-list**. The stated sequence is *application → review → personal access link → onboarding and listing*, and admission remains a human decision.
**Why Class 35:** business-information gathering and verification about commercial entities, and the curation that makes the referral service credible.
**Gap note:** **verification/vetting of providers** ("Verified Partner") appears nowhere in the current wording, yet it is the platform's central trust claim.

---

### 35.8 — Provider-side business administration

**Status:** CURRENTLY IMPLEMENTED
**Component:** `/:locale/partner-dashboard/*` — `requests`, `termine` (bookings/leads), `performance`, `coverage`, `billing`, `settings`, `notifications`.
**What COMPLIHUB360 does:** aggregates the provider's lead and performance data; publishes ranking transparency; records SLA targets; runs a monthly Stripe invoicing cycle for platform fees — lead fee €120 per booking, partner subscription €149/month or €1,490/year including one lead per month and unlimited detail opens, detail opens €3 for non-subscribers capped at €50/month, first two leads per provider free (`services/compliance-api/src/billing.ts`).
**Why Class 35:** business management and administration services rendered to third-party businesses, plus invoicing.
**Gap note:** none of this is reflected in the current wording.

---

### 35.9 — Verified two-sided reviews of providers

**Status:** CURRENTLY IMPLEMENTED
**Component:** `POST /api/v1/reviews`; review requests triggered by the watchdog (48-hour deadline).
**What COMPLIHUB360 does:** accepts reviews **only from real bookings**, marks them verified, recomputes the provider's aggregate rating, and feeds that rating into the quality component of the ranking. Provider→user reviews feed an internal lead-quality signal.
**Why Class 35:** providing evaluations and reviews of businesses and their services.
**Gap note:** not covered by the current wording.

---

### 35.10 — Post-referral SLA watchdog and routing

**Status:** CURRENTLY IMPLEMENTED
**Component:** `services/compliance-api/src/watchers.ts`.
**What COMPLIHUB360 does:** on a recurring tick it reminds a provider whose confirmation deadline is near, records an `sla_breach` and increments the breach counter when the deadline passes (downgrading visibility at the threshold), expires stale requests and burns their tokens, and requests reviews from both sides. The site promises "24–48h to first response, or we route to the next available partner — automatically."
**Why Class 35:** service-quality administration of the referral relationship.
**Wording note:** describe as monitoring **of provider responsiveness**, never as "compliance monitoring".

---

### 35.11 — Multi-market, multi-language reach

**Status:** CURRENTLY IMPLEMENTED
**Evidence:** eight profiled markets including the **United States**; four interface languages; provider records carry `countries_supported[]` and `languages[]`, both entering the relevance score.
**Why it matters:** the referral service is explicitly cross-border, and the US is live — directly relevant to the FDA exclusion (Part VI.D).

---

### Class 35 complete functional summary

CompliHub360's Class 35 activity is a closed loop with two customers on opposite sides of it.

On the **demand side**, a company arrives with a business situation rather than a legal question: it sells into three countries, it operates D2C, it ships physical goods. CompliHub360 collects that through a four-step guided assessment (or a free-text query) and converts it into a *named list of professional-service needs* — the specific obligations attaching to that combination of market, operating model and product, each tied to its statute, severity, penalty range and cadence. The company now knows what kind of help it needs, which is the thing it did not know when it arrived.

CompliHub360 then answers the second question: *who*. It maintains a curated population of independent specialist firms — recruited B2B or self-applying through the public application form, onboarded through a token-gated intake link, VAT-ID-verified against VIES, and admitted only after manual human vetting. Against the company's profile it scores that population on relevance, quality and partner status, and returns a ranked shortlist in which every firm is described by attribute and pseudonym rather than by name. The company can compare, open a fuller profile (still anonymous, with the complete pricing table), and finally book an appointment. The booking is the referral: at that instant the provider's identity and contact details are released to the company, the company's dossier is released to the provider, and CompliHub360's job is done.

On the **supply side**, CompliHub360 runs a business service for the providers: qualified exposure to businesses that have already articulated a need, a dashboard of bookings and performance KPIs, transparent ranking criteria, editable coverage and SLA targets, verified reviews, and a monthly invoice for platform fees. A watchdog holds providers to their response commitments and reroutes work away from those who miss them.

At no point does CompliHub360 perform the underlying professional service.

### Class 35 potential gaps

1. **Appointment arranging/scheduling** — the conversion and billing event, absent from the wording.
2. **Provider vetting and verification** — the central trust claim, absent.
3. **Verified reviews and ratings**, and their use in ranking — absent.
4. **Provider-side business administration and invoicing** — absent.
5. **The anonymity/progressive-disclosure model** — absent.
6. **"Business contacts"** — arguably *unsupported*; contact data is withheld by design until booking (Part VI.B).
7. **KYB / beneficial ownership / AML** — a genuine engine domain (AMLD5, German GwG/Transparenzregister), currently routed under Corporate & Structure and not named as a field.

---

# PART II — CLASS 42 DOSSIER

## SaaS, software and technology platform

### Main purpose

Class 42 covers the **software**: a hosted, multi-tenant web application that collects structured business information, runs a deterministic rules engine over it to identify, organise, source and prioritise obligations, resolves jurisdiction-specific values, powers a scored provider search and matching engine with server-enforced staged anonymisation, generates reports, and provides scheduling, notification, document-handling and workspace functionality to both sides of the marketplace.

### Advisor's current starting wording (reference only)

> "Software as a service (SAAS) services featuring software for identifying and organizing business and regulatory compliance needs and for searching for and matching businesses with independent professional service providers in the fields of … ; none of the foregoing relating to compliance with regulations administered by the United States Food and Drug Administration."

---

### 42.1 — Structured-input collection engine (the wizard)

**Status:** CURRENTLY IMPLEMENTED
**Component:** `src/components/home/AnimatedWizard.tsx`; route `/:locale/wizard`.
**User action:** four steps of card selections. Deep links are honoured: `?market=DE` suppresses the country question a market page already answered; `?refine=1` rehydrates the last saved profile and opens on Review.
**Software action:** builds a typed `SearchProfile { country, markets[], businessModel, categories[], riskSignals[], revenueBand, note }`, persists it against a guest key or user id, posts it to the search endpoint.
**Does COMPLIHUB360 perform the professional service?** No — it collects and structures inputs.
**Recommended clarification:** "collecting and structuring user-supplied business information", not "assessing compliance".

---

### 42.2 — Deterministic obligation-identification engine

**Status:** CURRENTLY IMPLEMENTED
**Component:** `packages/compliance-engine/` — `domain-schema.ts`, `country-profile.ts`, `business-modifier.ts`, `generator.ts`, `obligation-enrichment.ts`.
**Software action**, described precisely because it is the most technically specific thing the product does:
1. loads a per-country risk profile for each requested market — a weight 1–10 for each of eight domains, plus enforcement-intensity and strictness scores;
2. aggregates across markets (weights summed, strictness/enforcement taken as maximum);
3. applies an industry and business-model modifier to each domain score;
4. sorts domains by score and selects every domain the user explicitly chose, topped up from the ranking to a minimum of four;
5. expands each selected domain into its obligation templates, filtering by business model — except for domains the user chose explicitly, which are never filtered away;
6. enriches each obligation from a per-subdomain, per-country map with the governing statute, a penalty phrasing and euro upper bound, a filing cadence, a lead time in days, and an `appliesFrom` date where an act is adopted but not yet applicable;
7. attaches the CELEX identifier of the underlying EU act and a deep link to the authoritative text on EUR-Lex;
8. derives a severity band (critical / high / medium / low) from the risk weight;
9. sorts: user-selected domains first, then by risk weight.

**Output:** a ranked, sourced, severity-banded obligation set, each row marked `confirmed` or `likely`.
**Does COMPLIHUB360 perform the professional service?** No — it identifies and organises; it does not advise, file or certify.
**Why Class 42:** exactly "software for identifying and organizing business and regulatory compliance needs", and far more specific than that phrase suggests.
**Conflict-sensitive wording:** avoid "compliance management" and "compliance monitoring".
**Recommended clarification:** the engine is **rules-based and deterministic, not machine learning**, and its content is editorially verified against national statutes and EUR-Lex. Meaningful if the AI question arises.

---

### 42.3 — Jurisdiction-level resolution

**Status:** CURRENTLY IMPLEMENTED (landed 17 September 2026)
**Component:** `services/compliance-api/src/jurisdiction.ts`; migration `20260917000000_jurisdiction_levels.sql`.
**Software action:** `jurisdiction_facts` now carries rows at three levels — country (`US`), region (`US-CA`) and locality (`US-CA-08031`). The resolver walks the chain from coarse to fine and returns, per fact key, the row at the **most specific matching level**; rows on a different branch are discarded. Where the user's region is unknown, **only country-level rows apply** — deliberately, so a user is never shown the Californian threshold next to the Texan one and told both are ground truth.
**Why it exists:** there is no US-wide VAT rate and no US-wide nexus threshold. Without this, the product could not say anything correct about the United States.
**Why Class 42:** data-resolution software.
**Note for counsel:** this is the technical mechanism by which the product handles US content, and therefore relevant to how the FDA exclusion operates in practice.

---

### 42.4 — Risk-map generation, severity display and deadline arithmetic

**Status:** CURRENTLY IMPLEMENTED
**Component:** `/:locale/results` — `src/pages/ResultsRiskMap.tsx`.
**Software action:** renders the obligation set — severity · obligation · market · due date · state — computes days-until for each `appliesFrom`, and splits "what needs doing this quarter" from "on the radar" at a 365-day horizon so a 2030 duty does not distort the statistics. Computes headline figures: obligations identified, deadlines inside 30 days, median deadline, verified partners matched. Applies a four-step traffic-light risk colour system, deliberately distinct from the brand palette.
**Conflict-sensitive wording:** "risk map" and "risk assessment" edge toward generic compliance-software language; counsel may prefer "organising and presenting identified obligations".

---

### 42.5 — Obligation handling states (user-recorded progress)

**Status:** CURRENTLY IMPLEMENTED (landed September 2026)
**Component:** `GET /api/v1/session/:sessionId/obligations`, `PUT /api/v1/session/:sessionId/obligations/:obligationId`; client `src/api/obligations.ts`.
**Software action:** per saved session, the user may record a handling state against each obligation — `open`, `in_progress`, `done`, `not_applicable` — with an optional note. Keys are the engine template identifiers (`tax-vat-registration`, `prod-epr`, …), so a state survives a recalculation. Only deviations are stored; anything absent is `open`. The completion date is **set by the server**, not entered by the user.
**The distinction the code draws, verbatim from the module header:**
> "Two axes per obligation that must never merge: **applicability** — the system's business (does the duty apply at all?); **handling** — the user's business (have I done it?)."
**Does COMPLIHUB360 perform the professional service?** No. It records what the user says they have done. It does not verify, confirm or certify that anything was in fact done, and it does not assess compliance.
**Why Class 42:** software for organising identified needs and tracking the user's own handling of them.
**⚠ Conflict-sensitive — the most important addition in this revision.** This is the function that moves closest to compliance-management software and therefore to COMPLYHUB / COMPLY360. It is genuine and must not be hidden, but the wording should carry the applicability/handling distinction explicitly — *software enabling users to record their own handling status against obligations previously identified for them* — rather than anything resembling "compliance tracking" or "compliance management". See Part VI.D.

---

### 42.6 — Provider search, filtering, scoring and ranking engine

**Status:** CURRENTLY IMPLEMENTED
**Component:** the `/api/v1/search` handler.
**Software action:** filters the provider table to active or downgraded partners covering the requested country; maps the eight canonical domain slugs onto the legacy vocabulary stored on provider records so both match; computes the weighted score; applies availability and downgrade multipliers; sorts; strips the internal rank before serialisation.
**Recommended clarification:** search-and-rank software matching on country coverage and domain overlap weighted by measured service quality — not an advisory algorithm.

---

### 42.7 — Provider anonymisation and staged-disclosure engine

**Status:** CURRENTLY IMPLEMENTED
**Component:** serialisation layers of `/api/v1/search`, `/provider/:key/detail`, `/scheduling`, `/bookings`.
**Software action:** enforces, server-side at read time, a three-stage disclosure model. Stages 1 and 2 return pseudonym, region, attributes, ratings, billing model and pricing but **never** name, logo, website or contact; stage 3 releases identity to both sides. The provider's website outclick is routed through a counted redirect only a user who has already booked may follow.
**Why Class 42:** software for controlled, staged disclosure of business data — genuine and distinctive.
**Gap note:** entirely absent from the current wording.

---

### 42.8 — Accounts, guest sessions and session adoption

**Status:** CURRENTLY IMPLEMENTED
**Component:** `/login`, `/register`, `/verify-email`, `/auth/callback`, `/reset-password`; `POST /api/v1/session`, `GET /api/v1/sessions`, `POST /api/v1/auth/adopt`; `AuthGuard` with `user` / `partner` / `admin` roles; ES256 token support for the current Supabase signing keys.
**Software action:** lets a guest run the full assessment anonymously against a guest key, saves the session, and on registration adopts those guest sessions into the new account so the profile survives the gate.

---

### 42.9 — Persistent user workspace

**Status:** CURRENTLY IMPLEMENTED — and, unlike revision 1, **no longer fixture-backed**. The design-fixture fallback was removed from the workspace in September 2026 and the dashboard, sessions, session snapshot, domain cross-section and appointment surfaces read live data.
**Component:** `/:locale/dashboard` and children — `sessions`, `termine` (with Requests now a tab of that page rather than its own route), `workbench/:domain`, `notifications`, `saved-providers`, `exports`, `library`.
**Software action:** stores and re-opens saved assessments (rename, duplicate, archive); a per-domain view that cuts across all of a user's sessions; saved providers; a filterable knowledge library; generated export files with READY/GENERATING states; an answers drawer and a provider drawer with booking.
**Gap note:** **saved searches, saved providers, per-domain workspaces and stored assessments** are absent from the current wording.
**Status caveat:** the **knowledge library** has an implemented interface but **no content pipeline behind it** — it should not be described as live.

---

### 42.10 — Report generation and export

**Status:** CURRENTLY IMPLEMENTED
**Component:** `src/lib/riskMapPdf.ts`; surfaced at `/dashboard/exports`.
**Software action:** generates a branded PDF snapshot of the risk map with a strict PII policy in code — only whitelisted profile facts (markets, categories, business type) may reach the document; notes, e-mail addresses and names never do. Sources are resolved from each obligation's legal references and listed with their official origin. Localised, with severity chips meeting contrast requirements on paper.
**Gap note:** absent from the current wording.

---

### 42.11 — Native appointment-scheduling software

**Status:** CURRENTLY IMPLEMENTED for slot presentation and booking; live provider-calendar synchronisation is PLANNED / INTENT-TO-USE (decided 9 August 2026: aggregation layer, Nylas EU region; blocked only on account provisioning).
**Component:** `GET /api/v1/provider/:key/slots`, `POST /api/v1/scheduling`, `PATCH` for reschedule/cancel/complete/no-show.
**Software action:** presents bookable slots (today generated from business hours minus booked slots; on integration, read from the synchronised free/busy calendar); creates the booking; prevents double-booking; handles reschedules with provider notification e-mail; records outcome states; triggers the reveal and the lead event.
**Gap note:** absent from the current wording. A native scheduler exists rather than an external calendar link because an external link would break the anonymity model — it is structural, not incidental.

---

### 42.12 — Notification, event-feed and alert-preference infrastructure

**Status:** MIXED — the notification feed, read-state watermark and `alert-prefs` endpoint are CURRENTLY IMPLEMENTED. The **alert-preference drawer** (`src/components/user/ConfigureAlertsDrawer.tsx`) is built and wired to the live endpoint but **is not yet mounted in any route**.
**Component:** `GET /api/v1/notifications`, `/api/v1/reads`, `/api/v1/alert-prefs`; notification pages on both dashboards; transactional e-mail (`mailer.ts`) with single-use magic-link actions.
**Software action:** an aggregated, day-grouped event feed per role with a persisted read-state watermark, live filter counts, deep links into the underlying request or booking. The preference model already defines six alert types: threshold breach, threshold approach, deadlines, provider updates, rule changes, weekly digest.
**Note for counsel:** this is useful **§1(b) evidence for Decision 2** — the preference half of the alerting feature is specified and built against a live endpoint; the detection-and-delivery half does not exist yet.

---

### 42.13 — Document upload with automated PII redaction and an AI consent gate

**Status:** CURRENTLY IMPLEMENTED (backend pipeline complete and tested; the user-facing upload surface is limited)
**Component:** `POST /api/v1/document/upload`, `POST /api/v1/document/request-ai`; redaction library at `services/redaction/`.
**Software action:** runs every uploaded document through a strict redaction profile **before any persistence** — only sanitised content is stored, raw text is discarded. Produces a classification, a redaction report and a risk score. AI eligibility requires an explicit per-upload opt-in; absent that, the document is stored but never becomes AI-eligible. A second gate re-checks sanitisation, consent and eligibility when AI processing is requested, so a later consent withdrawal is honoured immediately; blocked attempts are logged.
**Why Class 42:** software for redacting and anonymising personal data in documents, and for controlling automated processing of it.
**Gap note:** absent from the current wording, and one of the more distinctive and defensible software functions in the product — it sits well away from the crowded compliance-software field.

---

### 42.14 — Provider-side SaaS

**Status:** CURRENTLY IMPLEMENTED
**Component:** `/:locale/partner-dashboard/*`.
**Software action:** coverage editor (markets, languages, domains, SLA targets, with a two-business-day re-verification recorded as an event when a market is added), availability and out-of-office state feeding directly into ranking, performance KPIs with ranking transparency, invoice list with hosted payment links and PDFs synchronised from Stripe on read, and profile settings including the e-mail-change confirmation flow.
**Gap note:** absent from the current wording.

---

### 42.15 — AI-assisted answering (retrieval-augmented generation)

**Status:** PLANNED / INTENT-TO-USE — **DECIDED (Decision 1): claim narrowly under §1(b).** The assistant is complete behind a feature flag (`?assistant=1`, persisted as `ch360_assistant`) and a subscription gate, returns `503 ASSISTANT_NOT_CONFIGURED` until an API key is supplied, and was parked as post-MVP by founder decision of 15 July 2026.
**Component:** `services/compliance-api/src/assistant.ts`; `POST /api/v1/assistant/chat|checkout|verify`; `src/components/user/AssistantWidget.tsx`.
**Software action:** retrieval-augmented generation over an internal knowledge corpus stored as 768-dimension vectors in PostgreSQL/pgvector, plus the structured `jurisdiction_facts` table resolved through the jurisdiction-level rules in 42.3; embeddings and generation via Gemini; free/subscriber daily quotas (5/day free, 200/day at $12 per month); jurisdictions DE, UK, NL, FR, IT, ES, US, TR, AT.
**Explicit in-code constraint:** "Answers are information, not legal/tax advice (RDG/StBerG), and must never reproduce licensed source text verbatim."
**Recommended wording per Decision 1:** describe the action — *software for retrieving and summarising regulatory information from a curated knowledge base* — and **not** "AI-powered compliance software", which is generic to the whole field including the cited marks.
**Product hygiene, now corrected:** the `/api/v1/search` response previously returned the literal string *"AI summary synthesized from knowledge chunks and deterministic engine rules"* while the vector lookup ran on a stub embedding. That string has been replaced with an accurate description of the payload. **What ships today is deterministic**; the AI claim rests on intent, not on current use.

---

### 42.16 — Source-provenance verification and drift detection

**Status:** CURRENTLY IMPLEMENTED (landed 17 September 2026)
**Component:** `scripts/tedb-vat-rates.mjs`; `.github/workflows/source-drift.yml`; migrations `20260917000000_jurisdiction_levels.sql`, `20260917000001_vat_rates_from_tedb.sql`.
**Software action:** the VAT rates in `jurisdiction_facts` previously came from a commercial guide — a snapshot with no citable public source. They are now reconciled against the **Taxes in Europe Database (DG TAXUD)**, which member states populate themselves and which is published under CC BY 4.0 (Decision 2011/833/EU). A scheduled weekly job re-reads the official rates and fails red when a member state has changed a rate the product still carries differently. The first run found two stale values — Spain's expired temporary 5% rate and Austria's new 4.9% rate effective 1 July 2026 — both since corrected.
**It writes nothing, by design.** From the workflow header: *"A tax figure that overwrites itself without human review is exactly the kind of automation that has no place in a compliance product."* The run reports; a human decides; the correction goes through a migration in a pull request.
**Coverage finding recorded in the same commit:** TEDB covers EU member states plus XI. Of the product's nine jurisdictions that is six (DE, NL, FR, IT, ES, AT). GB is outside post-Brexit and XI covers only Northern Ireland and only goods; the US has no VAT; TR is not a member state. For the UK, legislation.gov.uk / HMRC under OGL v3 would be the equivalent source.
**Why Class 42:** data-quality verification software.
**⚠ Conflict-sensitive wording:** internally this is called a "watcher" and the workflow is named *Source Drift*. It monitors **the product's own reference data against an official source** — not the user's compliance, and not regulatory change as a user-facing service. Any wording must make that distinction, or it reads as regulatory-monitoring software. See Part VI.D.

---

### 42.17 — Administrative control centre and audit infrastructure

**Status:** MIXED — Overview, Cockpit and Events CURRENTLY IMPLEMENTED against live endpoints; Providers, Security, Privacy, Alerts and Status are honest placeholders (PLANNED).
**Component:** `/:locale/admin`, `/admin/cockpit`, `/admin/events`; `GET /api/v1/admin/stats`, `/admin/cockpit`, `POST /api/v1/admin/watchers/tick`, `/admin/billing/run`.
**Software action:** operational KPI gauges across funnel, privacy and SLA; an SLA watchlist; a filterable audit stream over the `event_log` with inline payload snapshots. Every material action writes an event, which is also the watchdog's idempotency mechanism.
**Conflict-sensitive wording:** this is *platform* monitoring, not *regulatory-compliance* monitoring.

---

### 42.18 — Multi-language, accessibility and delivery infrastructure

**Status:** CURRENTLY IMPLEMENTED
**Software action:** four locales with namespace-level key parity and region auto-detection; locale-scoped routing with correct `lang` attributes; WCAG bypass blocks and skip-to-content; lazy-loaded role areas; centralised SEO metadata with canonical and hreflang generation. Probably not worth naming in the identification, but it evidences an operating platform.

---

### Class 42 complete functional summary

The CompliHub360 software has three technical centres of gravity.

The **first** is a deterministic regulatory-obligation engine. It holds per-country domain weights for eight markets, an obligation-template library across eight domains, and a per-obligation, per-country enrichment map carrying the governing statute, a penalty range with a euro upper bound, a filing cadence, a lead time and — where an act is adopted but not yet applicable — the date from which it bites. Given a structured business profile it aggregates country weights, applies industry and business-model modifiers, ranks and selects domains, expands them into obligations, filters by business model without ever discarding something the user explicitly asked about, enriches each row, derives a severity band and returns a sorted, citable obligation set with EUR-Lex deep links. Underneath it, a jurisdiction resolver picks the most specific applicable value across country, region and locality — and deliberately withholds regional figures when the user's region is unknown. Alongside it, a weekly job reconciles the product's tax figures against the official EU database and fails red on drift, without ever writing to the database itself. This is rules-based software; its output is reproducible and traceable to a named statute.

The **second** is a provider search, scoring and anonymisation engine. It filters providers by recorded country coverage, reconciles two domain vocabularies, scores each provider as a weighted combination of relevance, measured service quality and partner status, and ranks. Every serialisation layer enforces a three-stage disclosure model server-side: attributes and pricing are visible while identity is not, and identity is released only when an appointment has been booked. The match percentage is returned with a decomposition naming which of the user's own requested domains each provider actually covers.

The **third** is the surrounding SaaS: accounts with guest-session adoption; role-guarded workspaces for users, providers and administrators, now reading live data rather than fixtures; saved assessments and saved providers; per-domain views cutting across sessions; a user-recorded handling state per obligation that is carefully kept separate from the system's applicability judgement; PDF report generation with a hard PII whitelist; native appointment scheduling with double-booking prevention and reschedule handling; a day-grouped notification feed with persisted read state and a built-but-unmounted alert-preference model; a document pipeline that redacts personal data before storage and gates AI processing on explicit, revocable consent; transactional e-mail with single-use magic-link actions; a Stripe invoicing cycle; an append-only event log serving as both audit stream and job-idempotency key; and an autonomous SLA watchdog.

A retrieval-augmented assistant exists but is feature-flagged off and parked. What ships today is deterministic.

The software never performs a regulated professional service. It identifies and organises needs, lets the user record their own progress against them, finds and ranks the people qualified to help, and administers the meeting.

### Class 42 potential gaps

1. Native **appointment-scheduling software** (and, on integration, calendar synchronisation).
2. **Report generation and export** with an enforced PII whitelist.
3. **Document redaction / personal-data anonymisation software** and the consent-gated AI pipeline.
4. **Saved searches, saved assessments, saved providers and per-domain workspaces.**
5. **Obligation handling states** — user-recorded progress (see the wording caution in 42.5).
6. **Provider-side SaaS** — coverage, availability, SLA targets, performance reporting, invoice management.
7. **The staged-disclosure / anonymisation engine.**
8. **Notification and alert-preference infrastructure.**
9. **Verified-review capture** and its feedback into the ranking algorithm.
10. **Jurisdiction-level data resolution** and **source-provenance / drift verification**.
11. **AI/RAG functionality** — to be claimed narrowly under §1(b) per Decision 1.
12. **Audit-logging and administrative monitoring** of platform operations.

### Class 42 risk-sensitive functions (flagged, not removed)

| Function | Why it is sensitive | Handling |
|---|---|---|
| **Obligation handling states (42.5)** | Closest function in the product to compliance-management/tracking software | Carry the applicability/handling distinction in the wording: *users record their own handling status against obligations previously identified for them*. Never "compliance tracking". |
| **Source-drift watcher (42.16)** | Named a "watcher"; monitors regulatory source data | It monitors **our own reference data against an official source**, not the user's compliance. Say so. |
| Threshold panels in the domain views | Read as threshold monitoring | Frame as presenting thresholds relevant to identified needs |
| `ComplianceDomain.ONGOING_MONITORING` (KYB/AML) | The literal word "monitoring" in the engine taxonomy | It is KYB/beneficial-ownership *information*; consider renaming the enum in-product |
| Planned regulatory-change alerts | "Alerts when the rules change" is close to monitoring claims | **Decided:** Class 45 as information; any Class 42 clause stays tied to the user's prior assessment (Decision 2) |
| Admin cockpit / SLA watchlist | Contains "monitoring" and "alerts" | Platform-operations monitoring, not regulatory |
| `mktg-health-claims`, US row | **"FTC Act §5 / FDA labeling rules"** — a literal FDA reference in shipped product data | **Fixed in `c1e94fd4`** ("FTC Act §5 + FTC Health Products Compliance Guidance"), **pending merge into `main`**. See Part VI.D4.1 |
| `/markets` US card, focus chip | **"FDA/Labeling"** — advertised FDA coverage in marketing copy, all four locales; closer to the exclusion than the data row is | **Fixed in `c1e94fd4`** ("FTC Advertising Rules", de/es/tr localised), **pending merge into `main`**. See Part VI.D4.1 |
| Health-claims trigger tags `health`, `supplements`, `medical` | Pulls the obligation in for exactly the FDA-regulated sectors | See Part VI.D |
| US as a profiled market, now with region-level resolution | The exclusion is US-specific and the US is live | Confirm the exclusion covers the US market pages and US enrichment rows |

---

# PART III — CLASS 45 DOSSIER

## Regulatory compliance information provided by CompliHub360 itself

### Main purpose

Class 45 covers what CompliHub360 **tells the user in its own voice**: which obligations exist in which market, which statute each rests on, what the penalty exposure is, when it must be done, and when a not-yet-applicable act starts to bite.

The volume is larger than it may appear. The product refuses to publish anything it cannot trace to a named source — `/resources` was rebuilt in August 2026 specifically to delete fabricated case studies and guides — and the informational pages are generated from verified engine data, not from marketing prose.

### Advisor's current starting wording (reference only)

> "Providing regulatory compliance information via a website in the fields of taxation, value-added tax, extended producer responsibility, packaging, environmental protection, data privacy and protection, advertising and marketing, corporate formation and governance, product safety, customs, transportation and logistics; none of the foregoing relating to compliance with regulations administered by the United States Food and Drug Administration."

### The legal-advice boundary, stated up front

CompliHub360 is **not** a law firm, tax practice or regulated adviser, and says so on the site and in the footer ("Not a law firm. We orchestrate verified specialists."). Legal, tax and other regulated professionals are an independent provider category inside the marketplace.

---

### 45.1 — Compliance-area knowledge pages (eight areas)

**Status:** CURRENTLY IMPLEMENTED
**Component:** `/:locale/compliance` (hub) and `/:locale/compliance/:area` — data derived in `src/lib/areaProfiles.ts`.
**Information supplied:** for each area, switchable by market — every duty the engine carries with its named statute; a coverage note stating how many duties have a market-specific source versus an EU Regulation applying directly; an enforcement section naming who checks and the stated penalty ranges, with upper bounds labelled as upper bounds and not as expected cost; a timeline separating what applies now from what is settled law but not yet applicable; a cross-market comparison of how the eight markets weight the area; related areas sharing triggers; and a side-by-side matrix of all eight areas with risk, time-to-act, typical exposure and active markets.
**How the user receives it:** public, indexable web pages, four languages, no account required.
**Fields:** taxation and VAT; EPR and packaging; data privacy; advertising and marketing law; corporate formation, commercial register, beneficial ownership and KYB; product safety and product regulatory (GPSR/CE); customs and logistics; consumer and commercial law.
**Does an independent professional subsequently advise?** Yes if the user proceeds — but the content stands on its own and is fully usable without engaging a provider.
**Boundary:** the pages state what the law requires in general terms and cite the source. They do not apply the law to specific facts and do not render an opinion.

---

### 45.2 — Market/country knowledge pages (eight markets)

**Status:** CURRENTLY IMPLEMENTED
**Component:** `/:locale/markets` and `/:locale/markets/:code` — data derived in `src/lib/marketProfiles.ts`. The legacy `/countries` route redirects here.
**Information supplied:** per market, the duties the engine carries grouped by domain, each with its **national** statute — UStG §18/§18i for German VAT and OSS, UK VATA 1994 §3, CGI Art. 256/287, DPR 633/1972 Art. 35, Ley 37/1992 Art. 164, Wet OB 1968 Art. 14, KDV Kanunu No. 3065, and for the US state economic-nexus rules post-*Wayfair* — the penalty phrasing as that source states it, the filing cadence, the lead time, and where applicable the EUR-Lex link to the underlying EU act. German-language obligation texts were added in September 2026.
**Boundary:** derived, never authored. A market page shows only the duties the engine holds for it, says so where coverage is thin, and does **not** dress an EU-level fallback up as a national source.

---

### 45.3 — The generated risk map as an informational deliverable

**Status:** CURRENTLY IMPLEMENTED
**Component:** `/:locale/results`.
**Information supplied:** the personalised obligation set — for this company, in these markets, with this operating model: which duties apply, how severe each is, which statute it rests on, the penalty exposure, when it is due, how many days remain, and whether the duty is confirmed or likely. Adopted-but-not-yet-applicable duties are separated with their start dates.
**How the user receives it:** partially as a guest, in full after free registration.
**Boundary — the most important in this dossier:** the risk map says *what the law requires and what is likely to apply*. It does not say *what you must do in your case*, does not sign off, and does not accept responsibility. Counsel may wish to consider whether the personalisation changes the information/advice analysis.

---

### 45.4 — Downloadable risk-map report

**Status:** CURRENTLY IMPLEMENTED
**Component:** `src/lib/riskMapPdf.ts`; also at `/dashboard/exports`.
**Information supplied:** the same obligation information as a portable, sourced PDF, with every legal reference resolved and listed with its official origin.
**Why it matters:** the advisor's wording says "via a website"; a downloadable report is arguably a different channel.

---

### 45.5 — Official source provenance for tax figures

**Status:** CURRENTLY IMPLEMENTED (17 September 2026)
**Component:** `scripts/tedb-vat-rates.mjs`, `.github/workflows/source-drift.yml`, migration `20260917000001_vat_rates_from_tedb.sql`.
**Information supplied:** VAT rates now reconcile to the **Taxes in Europe Database (DG TAXUD)** — populated by the member states themselves, published under CC BY 4.0, and therefore a source the product can *show the user*, which the previous commercial-guide snapshot was not. Covers six of the product's nine jurisdictions (DE, NL, FR, IT, ES, AT); for the UK, legislation.gov.uk / HMRC under OGL v3 is the identified equivalent.
**Why Class 45:** it is the provenance of the regulatory information the platform supplies, and materially strengthens the claim that the information is verifiable rather than asserted.

---

### 45.6 — Prose-query answers

**Status:** IN DEVELOPMENT (page live, answer content still fixture-backed)
**Component:** `/:locale/search`.
**Information supplied:** a direct, source-cited answer to a free-text regulatory question, plus relevant obligations and follow-up guides.
**Note:** the substantive answer engine (RAG) is built but parked — see 42.15. Genuine intended use, not live.

---

### 45.7 — Explanatory and educational surfaces

**Status:** CURRENTLY IMPLEMENTED
**Component:** `/how-it-works` (the five stages — Understand, Assess, Decide, Match, Act — plus the explicit statements that the assessment is free, that ranking is never for sale, and that if nothing applies the platform says so); `/platform`; `/solutions`; `/pricing`; `/about`; `/resources`; `/contact`; the Trust Center; `/ai-governance`; the homepage domain atlas and FAQ.
**Information supplied:** how obligation identification works, what the eight domains cover and who they affect, what the engine can and cannot tell you, what happens to the user's data (EU hosting, anonymous until registration), and the platform's AI-governance posture.
**Why Class 45 (in part):** where these pages explain regulatory categories and obligations they are informational; where they describe the service they are ordinary marketing and belong to no class.

---

### 45.8 — In-workspace knowledge library and domain views

**Status:** MIXED — the **domain cross-section view** (a domain read across all of a user's sessions) is CURRENTLY IMPLEMENTED on live data. The **knowledge library** has an implemented interface but **no content pipeline behind it** (IN DEVELOPMENT).
**Component:** `/dashboard/workbench/:domain`; `/dashboard/library`.
**Note for counsel:** the August 2026 rebuild of `/resources` removed fabricated guides precisely because none existed. The library should not be described as live.

---

### 45.9 — Regulatory-change alerts

**Status:** PLANNED / INTENT-TO-USE — **DECIDED (Decision 2): claim principally in Class 45 as information.**
**Component:** `/dashboard/alerts` (placeholder, labelled "In preparation"); preference model built in `ConfigureAlertsDrawer.tsx` against the live `/api/v1/alert-prefs` endpoint but not yet mounted.
**Information supplied (intended):** notification to a registered user when an obligation relevant to their saved assessment changes, or when a deadline approaches. The preference model already specifies six types: threshold breach, threshold approach, deadlines, provider updates, rule changes, weekly digest.
**Evidence of genuine intent:** the feature is publicly announced on the site, specified down to its six alert types, and has a persisted preference model wired to a live endpoint. Marketing copy that previously sold it in the present tense has been corrected to "in preparation" — which removes a false use claim without removing the announcement.
**Recommended wording per Decision 2:** *providing information regarding changes in regulatory requirements* in Class 45. Any Class 42 counterpart stays narrow — *software for notifying users of changes to obligations previously identified for them* — and avoids "regulatory monitoring" or "compliance monitoring".

---

### 45.10 — Provider credential verification

**Status:** CURRENTLY IMPLEMENTED (VAT-ID validation automated; credential review manual)
**Component:** `POST /api/v1/provider/intake`; `services/compliance-api/src/vies.ts`.
**Information supplied:** the "Verified Partner" designation, resting on human review of certifications and statutes plus an automated, timestamped VIES check of the provider's VAT identification number.
**Why it is here:** verification of professional credentials may fall in Class 45 rather than Class 35. Listed in both dossiers deliberately, because the classification is counsel's call and the function must not fall between them.

---

### Class 45 complete functional summary

CompliHub360 publishes a substantial body of regulatory compliance information in its own voice, and the discipline behind it is worth stating: nothing on the informational surfaces is authored marketing prose. Every duty on a compliance-area page or a market page is generated from the same verified engine data that produces the risk map — a per-obligation, per-country map of statutes, penalty ranges, filing cadences and application dates, checked against the national texts and EUR-Lex when written. Where the engine holds no national source, the page says so and shows the EU-level instrument labelled as such. Where coverage is thin, the page states the count. As of September 2026 the tax figures additionally reconcile to an official, citable, openly licensed EU source, with a weekly job that fails red when a member state changes a rate the product still carries differently — and which deliberately writes nothing, because a tax figure that corrects itself without human review has no place in a compliance product.

That information reaches users through six channels. **Eight compliance-area pages** explain what each area requires, who enforces it, what it costs, what applies now versus what is settled but not yet applicable, and how the markets weight it differently. **Eight market pages** transpose the same data by country, naming national statutes. **The generated risk map** filters it to a specific company and is free and complete. **A downloadable PDF report** carries the same content with every source resolved. **A per-domain workspace view** reads one domain across all of a user's saved assessments. And **explanatory pages** describe the regulatory categories and what the platform can and cannot tell you.

Two further channels are genuinely planned rather than live: the in-account knowledge library, whose interface is built but which has no content pipeline; and regulatory-change alerts, announced on the site, specified to six alert types, with a preference model wired to a live endpoint and no detection or delivery behind it yet.

The boundary is drawn consistently and in the open. CompliHub360 states what the law requires and what is likely to apply to an operation of a given shape. It does not apply the law to specific facts, does not render an opinion, does not sign off, and does not accept responsibility. Where the user records that they have handled an obligation, the platform stores that statement as the user's own — it does not verify it. When a matter needs a binding opinion, the platform routes to an independent Verified Partner who gives it under their own contract.

### Class 45 potential gaps

1. **KYB, beneficial ownership and anti-money-laundering** — genuinely in the engine (AMLD5, German GwG, Transparenzregister) but not a named field.
2. **Consumer-protection and commercial-contract law** (Consumer Rights Directive; Rome I) — a live domain, not clearly covered by any field in the current list.
3. **Delivery channel:** the wording says "via a website". The same information is also delivered as a **downloadable PDF report** and through in-account surfaces.
4. **Regulatory-change alerts** — decided for this class (45.9), not yet in the wording.
5. **Provider credential verification** (45.10) — may belong here; currently in neither class's wording.
6. **"Environmental protection"** — in the current wording but without a standalone home in the product (Part VI.B).

---

# PART IV — THREE-CLASS COMPARISON MATRIX

| Function / feature | Status | Class 35 role | Class 42 role | Class 45 role | CH360 direct | Independent provider | Evidence | Advisor attention |
|---|---|---|---|---|---|---|---|---|
| Guided 4-step wizard | Implemented | Identifies which service is needed | Collects and structures inputs | — | Yes | — | `/wizard` | Core to all wording |
| Obligation engine | Implemented | Produces the needs list | Identifies, organises, prioritises, sources | Produces the regulatory content | Yes | — | `packages/compliance-engine/` | Deterministic, not AI |
| Jurisdiction-level resolution | Implemented | — | Data resolution (country/region/locality) | Correct US-level information | Yes | — | `jurisdiction.ts` | Relevant to the FDA/US analysis |
| Risk map | Implemented | Frames the need | Renders, computes deadlines, gates | Obligations, statutes, penalties, dates | Yes | — | `/results` | Personalised information — confirm boundary |
| Risk-map PDF | Implemented | — | Report generation with PII whitelist | Same information, second channel | Yes | — | `lib/riskMapPdf.ts` | Gap in 42 and 45 |
| **Obligation handling states** | **Implemented** | — | **User-recorded progress tracking** | — | Yes (records, does not verify) | — | `/api/v1/session/:id/obligations` | **Most conflict-sensitive addition** |
| Prose search page | In development | Second entry to needs identification | Query handling | Direct sourced answer | Yes | — | `/search` | Answer engine parked |
| Provider scoring / ranking | Implemented | Matching, comparison, recommendation | Search-and-rank engine | — | Yes | — | `/api/v1/search` | Core to 35 and 42 |
| Anonymous provider listing | Implemented | Searchable database of attributes | Serialisation and anonymisation | — | Yes | — | `ProviderMatchCard` | "Business contacts" mismatch |
| Provider detail (paid open) | Implemented | Comparison and qualified referral | Staged disclosure + billing event | — | Yes | — | `/provider/:key` | Anonymity model is a gap |
| Native scheduling | Implemented (sync planned) | The referral itself | Scheduling software | — | Yes | Attends and performs | `/provider/:key/schedule` | Gap in 35 and 42 |
| Identity reveal + dossier handover | Implemented | Completes the introduction | Access control at read time | — | Yes | Takes the matter | `/api/v1/scheduling` | — |
| Partner application | Implemented | Supply-side acquisition | Intake form | — | Yes | Applies | `/partner-apply` | Corrects rev. 1 "no self-registration" |
| Provider intake + vetting | Implemented (vetting manual) | Curation of the population | Intake and verification software | Credential verification | Yes | Supplies credentials | `/provider-intake`, `vies.ts` | Unclassified — discuss |
| Verified reviews | Implemented | Business reviews feeding ranking | Review capture and aggregation | — | Yes | Is reviewed | `/api/v1/reviews` | Gap in 35 and 42 |
| SLA watchdog | Implemented | Referral-quality administration | Scheduled job, event idempotency | — | Yes | Is measured | `watchers.ts` | Responsiveness, not compliance, monitoring |
| Provider dashboard | Implemented | Business administration for providers | Provider-side SaaS | — | Yes | Uses it | `/partner-dashboard/*` | Gap in 35 and 42 |
| Provider fee invoicing | Implemented | Invoicing as a business service | Billing software | — | Yes | Pays | `billing.ts` | Gap in 35 |
| User workspace, saved sessions/providers | Implemented (live data) | — | Saved searches, providers, workspaces | — | Yes | — | `/dashboard/*` | Gap in 42 |
| Domain cross-section view | Implemented | — | Per-domain workspace | Domain-specific regulatory information | Yes | — | `/dashboard/workbench/:domain` | — |
| Knowledge library | In development (no content pipeline) | — | Filterable content surface | Regulatory guides | Yes | — | `/dashboard/library` | Do not describe as live |
| Compliance-area pages ×8 | Implemented | Routes to the right category | Derives and renders | **Primary** — regulatory information | Yes | — | `/compliance/:area` | Strongest Class 45 evidence |
| Market pages ×8 | Implemented | Routes by market | Derives and renders | **Primary** — national statutes by name | Yes | — | `/markets/:code` | Strongest Class 45 evidence |
| Source-drift watcher | Implemented | — | Data-quality verification | Official source provenance | Yes | — | `source-drift.yml` | Conflict-sensitive naming |
| Document upload + redaction | Implemented | — | PII redaction, consent-gated AI | — | Yes | — | `/api/v1/document/*` | Notable gap in 42 |
| Notifications / read state | Implemented | — | Notification infrastructure | — | Yes | — | `/api/v1/notifications` | Gap in 42 |
| Alert preferences | Built, not mounted | — | Preference model | — | Intended | — | `ConfigureAlertsDrawer.tsx` | §1(b) evidence |
| **Regulatory-change alerts** | **Planned** | — | Narrow notification clause only | **Primary — decided** | Intended | — | `/dashboard/alerts` | **Decision 2 applied** |
| **AI assistant (RAG)** | **Built, parked** | — | **Narrow §1(b) — decided** | AI-assisted regulatory information | Intended | — | `assistant.ts` | **Decision 1 applied** |
| Admin cockpit / audit | Implemented | — | Platform monitoring and audit | — | Yes | — | `/admin/*` | Platform, not regulatory |

---

# PART V — PROVIDER-CATEGORY ANALYSIS

Common to all ten: matching works identically — the provider record carries `countries_supported[]`, `languages[]` and `categories[]`; the user's requested domain slugs are expanded to the stored vocabulary; relevance is 0.6 country coverage plus 0.4 domain overlap; quality and partner status complete the score.

## 1 · Tax and VAT

**Need identified:** cross-border VAT registration and filing, OSS eligibility, local registration triggered by holding stock, reverse charge on intra-EU B2B, corporate income tax, Intrastat thresholds.
**Information CompliHub360 supplies:** the duty and its national statute per market — UStG §18/§18i (OSS), UK VATA 1994 §3, CGI Art. 256/287, DPR 633/1972 Art. 35, Ley 37/1992 Art. 164, Wet OB 1968 Art. 14, KDV Kanunu No. 3065, and for the US state economic-nexus rules post-*Wayfair* — penalties as each source states them, cadence, lead time, and the EU VAT Directive 2006/112/EC with its EUR-Lex link. Rates now reconcile weekly to the DG TAXUD database.
**Software:** wizard capture; engine evaluation of tax weight per market; risk-map rows with deadline countdowns; jurisdiction-level resolution for US state values; a Tax & VAT domain view.
**Provider performs:** registration, filing, OSS returns, Intrastat, representation before the tax authority.
**Classes:** 35 · 42 · 45. **Status:** Implemented.

## 2 · EPR and packaging

**Need identified:** producer registration under national EPR schemes; packaging conformity; the staged PPWR duties.
**Information supplied:** VerpackG §9 (LUCID), penalties to €200,000 plus distribution ban; Code de l'environnement Art. L541-10 (AGEC); UK Packaging Waste Regulations 2023 §7 (PackUK), exposure to 4% of UK revenue. Plus the full PPWR set (Regulation (EU) 2025/40) as distinct obligations: conformity declaration and substance limits; minimum recycled content per plastic type from 2030; design-for-recycling grades A–C tightening to A–B in 2038; the 50% empty-space cap with filler counting as empty volume; the Annex V single-use bans; reusable-transport-packaging targets of 40% and 10%.
**Provider performs:** scheme registration, fee administration, reporting, packaging redesign advice.
**Classes:** 35 · 42 · 45 (deepest engine coverage in the product). **Status:** Implemented.

## 3 · Environmental compliance

**Founder decision (Decision 3): the field is genuine and reaches beyond packaging.** It stays in the wording and is not to be narrowed. What follows is therefore not a scoping objection but a split between what is in use and what rests on intent.

**In use today.** Environmental obligations are carried inside **EPR & Packaging** — PPWR (Regulation (EU) 2025/40), VerpackG §9 (LUCID), Code de l'environnement Art. L541-10 (AGEC), the UK Packaging Waste Regulations 2023 §7. That is genuine environmental law: producer responsibility, recyclate quotas, design for recycling, single-use format bans, packaging waste. Provider keys `epr`, `packaging`.

**Intended but not implemented.** General environmental compliance beyond packaging waste — emissions, chemicals, waste streams other than packaging, environmental permitting and reporting — has **no domain, no obligation templates, no enrichment entries and no provider-category key** in the product. `grep` for an `environment` key across the domain definitions, the provider-category mapping and the engine's template library returns nothing.

**Status:** CURRENTLY IMPLEMENTED for packaging and producer responsibility; **PLANNED / INTENT-TO-USE** for the remainder.

**Consequence for counsel — the filing basis, not the wording.** Because the founder confirms the broader field, the question is no longer whether to narrow it but on which basis it is filed. If a class is filed under §1(a), every service listed in it must be in use at filing, and a specimen must show it. "Environmental compliance" read broadly would not yet meet that for the non-packaging part. Counsel should decide whether to file the affected classes (or these services within them) under §1(b), or to phrase the field so that what is in use today plainly reads onto it.

**Consequence for the product.** This is now a named build item: a standalone Environmental Compliance domain with its own obligation templates, enrichment entries and provider-category key, so that the registration and the product agree before a Statement of Use is due.

## 4 · Data privacy and data protection

**Need identified:** privacy notices, lawful basis and consent, cookie and tracking consent, retention limits, erasure, DPIAs, data localisation, DPO requirement.
**Information supplied:** GDPR (Regulation (EU) 2016/679) with EUR-Lex link; ePrivacy Directive 2002/58/EC; German TTDSG §25; the specific articles at issue (Art. 5(1)(e), 6/7, 17, 35).
**Software:** risk signals for sensitive and health data escalate the severity band; a Data & Privacy domain view; and the platform's own document pipeline redacts personal data before storage and gates AI processing on explicit Art. 6(1)(a)/Art. 7 consent — privacy engineering, not privacy advice.
**Provider performs:** DPO services, DPIAs, audits, records of processing, representation before supervisory authorities.
**Classes:** 35 · 42 · 45. **Status:** Implemented.

## 5 · Marketing

**Scoping note.** The domain is **Marketing *Compliance*** — advertising and marketing *law* — not marketing services. Content: direct-marketing consent under the ePrivacy Directive, and health and medical advertising claims under Regulation (EC) 1924/2006. Provider keys `marketing`, `seo`.
**Provider performs:** advertising-law review, claim substantiation, campaign clearance — or, if intended, marketing agency services.
**Classes:** 35 · 42 · 45. **Status:** Implemented as marketing compliance.
**Founder decision (Decision 4): both are intended.** Advertising-law specialists *and* marketing service providers are genuine provider categories. The unqualified word "marketing" in the current wording is therefore correct rather than loose — but the two halves stand differently against the product:

- **Advertising-law and consumer-protection specialists — IMPLEMENTED.** The area page states it in terms: "Routes to specialists in advertising law and consumer protection." The enforcement authorities named are the advertising and unfair-competition regulators — Wettbewerbszentrale, DGCCRF, ASA, AGCM, FTC. The substantive content is advertising law: medical and health claims, comparative advertising, sustainability statements, influencer rules, DSA duties.
- **Marketing service providers (agencies, SEO, paid media) — PLANNED / INTENT-TO-USE.** The provider-category vocabulary already carries `seo` alongside `marketing`, so the category is modelled in the matching layer. But no surface describes routing to an agency, and agencies currently appear in the copy as a **customer** persona ("Agencies … answer for their clients' campaigns across borders"), not as a provider category. Nothing routes to them today.

**Consequence for counsel:** the same basis question as Decision 3 — the agency half rests on intent, the advertising-law half on use.

**⚠ Unchanged flag: this is the FDA-sensitive domain** — Part VI.D.

## 6 · Corporate formation, structuring and compliance

**Need identified:** commercial-register filing on incorporation or branch establishment; beneficial-ownership registration and updates; ongoing KYB verification of business partners.
**Information supplied:** national commercial-register requirements; German GwG §20(1), penalties €1,000–5,000; AMLD5 (Directive (EU) 2018/843) behind KYB.
**Provider performs:** incorporation, notarial filings, register submissions, corporate secretarial work, AML/KYB programmes.
**Classes:** 35 · 42 · 45. **Status:** Implemented.
**Gap flag:** **KYB / beneficial ownership / AML** is a distinct field carried in the engine but named in neither the Class 35 nor the Class 45 wording.

## 7 · Product compliance and product regulatory

**Need identified:** consumer product safety and mandatory labelling.
**Information supplied:** the EU General Product Safety Regulation (Regulation (EU) 2023/988) with EUR-Lex link, carrying the highest baseline risk weight in the library (9 of 10); CE marking and conformity documentation; national market-surveillance enforcement.
**Provider performs:** conformity assessment, technical documentation, testing coordination, CE declaration support.
**Classes:** 35 · 42 · 45. **Status:** Implemented.
**⚠ FDA boundary:** this domain is **EU/UK product safety and CE conformity**. It is *not* FDA. The exclusion must not swallow it. The only FDA-adjacent data sits in the **marketing** domain — Part VI.D.

## 8 · Customs brokerage

**Need identified:** EORI registration; tariff classification and origin declarations.
**Information supplied:** the Union Customs Code (Regulation (EU) 952/2013) with EUR-Lex link, behind both EORI registration and HS-code classification.
**Software:** engine domain LOGISTICS, product slug Logistics & Customs; keys `logistics`, `customs`; post-Brexit weighting raises customs to a first-class risk for the UK.
**Provider performs:** customs declarations, brokerage, classification rulings, origin determinations, representation before customs authorities.
**Classes:** 35 · 42 · 45. **Status:** Implemented.

## 9 · Logistics

**Need identified:** Intrastat statistical reporting above national thresholds; through PPWR, reusable transport packaging.
**Information supplied:** Regulation (EU) 2019/2152 for Intrastat; the Union Customs Code; PPWR transport-packaging reuse targets.
**Provider performs:** Intrastat filing, freight and transport arrangement, warehousing compliance.
**Classes:** 35 · 42 · 45. **Status:** Implemented.
**Note:** logistics and customs are **one domain** in the product. The wording lists them separately, which is fine, but counsel should know.

## 10 · Legal advisory and legal services

**Need identified:** mandatory terms and conditions content, withdrawal rights and consumer information duties; supplier, distribution and platform agreements.
**Information supplied:** Consumer Rights Directive 2011/83/EU; Rome I (Regulation (EC) 593/2008) — both with EUR-Lex links.
**Provider performs:** contract drafting and review, legal opinions, representation — **CompliHub360 performs none of this and is not a law firm.**
**Classes:** 35 · 42 · 45 (as information). **Status:** Implemented.
**Boundary — the sharpest in the product:** the homepage FAQ states it is not legal advice and that a binding opinion comes from a Verified Partner; the footer states "Not a law firm"; the assistant code carries the same constraint with an explicit reference to the German legal-services and tax-advice acts.

## 11 · Additional genuine categories in the product

| Category | Where | Status | Note |
|---|---|---|---|
| **KYB / beneficial ownership / AML** | `ONGOING_MONITORING` → `monitor-kyb`; AMLD5, GwG, Transparenzregister | Implemented | Distinct field; routed under Corporate & Structure; unnamed in any wording |
| **Consumer protection / e-commerce law** | `legal-consumer-terms`; Consumer Rights Directive | Implemented | Distinct from "legal services" as a practice field |
| **Data localisation / cloud hosting** | `data-hosting`; SaaS-specific | Implemented | Sits within data privacy |

---

# PART VI — GAPS AND RISKS

## A. Genuine CompliHub360 functions missing from the current trademark wording

| # | Function | Status | Class(es) | Why it matters |
|---|---|---|---|---|
| A1 | **Arranging and scheduling appointments** | Implemented (sync planned) | 35, 42 | The conversion event *and* the billing event of the business model. Largest single gap. |
| A2 | **Provider vetting, verification, "Verified Partner"** | Implemented | 35 and/or 45 | The central trust claim of the brand. |
| A3 | **Verified reviews and ratings feeding the ranking** | Implemented | 35, 42 | A distinct Class 35 service and Class 42 function. |
| A4 | **Provider-side business administration and fee invoicing** | Implemented | 35, 42 | The supply side of the marketplace is entirely absent. |
| A5 | **Staged-disclosure / anonymisation engine** | Implemented | 42 (35 as a characteristic) | Distinctive, and structurally why a native scheduler exists. |
| A6 | **Document redaction and consent-gated AI pipeline** | Implemented | 42 | Distinctive and sits well away from the crowded compliance-software field. |
| A7 | **Report generation and export** | Implemented | 42, 45 | Class 45 says "via a website"; this is a second channel. |
| A8 | **Saved assessments, searches, providers, per-domain workspaces** | Implemented (live data) | 42 | Standard SaaS functions, none claimed. |
| A9 | **Obligation handling states** | Implemented | 42 | New since revision 1. Genuine — and the most conflict-sensitive function in the product. |
| A10 | **Jurisdiction-level data resolution** | Implemented | 42 (45 for the output) | How the product says anything correct about the US. |
| A11 | **Source-provenance verification / drift detection** | Implemented | 42, 45 | Materially strengthens the Class 45 provenance claim. |
| A12 | **SLA monitoring of provider responsiveness with rerouting** | Implemented | 35 | Contractually promised on the site. |
| A13 | **Notification and alert-preference infrastructure** | Implemented (drawer not mounted) | 42 | — |
| A14 | **Partner application intake** | Implemented | 35 | New since revision 1; corrects the "no self-registration" statement. |
| A15 | **KYB / beneficial ownership / AML** as a field | Implemented | 35, 45 | Distinct field; may or may not be read into "corporate compliance/governance". |
| A16 | **Consumer-protection and commercial-contract law** as a field | Implemented | 45 | Not clearly covered by any field in the current list. |
| A17 | **Regulatory-change alerts** | Planned | **45 (decided)** | Decision 2 applied. |
| A18 | **AI/RAG regulatory answering** | Built, parked | **42 §1(b) (decided)** | Decision 1 applied. |
| A19 | **Multi-market (8) and multi-language (4) scope, including the US** | Implemented | all | Relevant to the FDA exclusion. |
| A20 | **Environmental compliance beyond packaging** | Planned (Decision 3) | 35, 42, 45 | Field confirmed genuine; no domain, templates or category key exist yet. Basis question, plus a named build item. |
| A21 | **Marketing service providers (agencies, SEO, paid media)** | Planned (Decision 4) | 35, 42 | Category key `seo` exists; nothing routes to agencies and no surface describes them. |

## B. Current wording not clearly supported by the product

| # | Wording | Finding | Recommendation |
|---|---|---|---|
| B1 | Class 35: "…database featuring business information and **business contacts**" | **Not supported as written.** Contact details are withheld through stages 1 and 2 and released only after booking. | Re-phrase toward "business information about professional service providers". |
| B2 | Classes 35/42: "**environmental compliance**" | **Confirmed genuine (Decision 3); partly not yet in use.** Packaging and producer responsibility are implemented; emissions, chemicals, non-packaging waste and permitting are not, and no `environment` category key exists. | Keep the field. Treat the non-packaging part as §1(b) and build the domain before a Statement of Use is due. |
| B3 | Class 45: "**environmental protection**" | As B2. | As B2. |
| B4 | Classes 35/42: "**marketing**" unqualified | **Confirmed genuine (Decision 4).** Advertising-law and consumer-protection specialists are implemented and named in the copy; marketing service providers are modelled (`seo` key) but nothing routes to them. | Keep the field unqualified. Treat the agency half as §1(b). |
| B5 | Classes 35/42: "customs brokerage" and "logistics" as separate fields | Supported, but the product treats them as **one** domain. | No change needed; noted for accuracy. |
| B6 | "Product regulatory compliance" / "product safety" | Fully supported — GPSR, CE, labelling. **Must not be narrowed by the FDA exclusion.** | Draft the exclusion so it removes FDA-administered matters only. |

## C. Language that could mischaracterise partner services as CompliHub360 services

Never to appear as CompliHub360 services: preparing or filing **VAT or tax returns**, OSS registration, representation before a tax authority; **EPR scheme registration**, fee administration or packaging reporting; **customs declarations, brokerage, classification rulings, origin determinations**; **freight, transport or warehousing**; acting as **DPO**, conducting DPIAs, regulated privacy consulting; **product certification, conformity assessment, testing**, issuing CE declarations; **legal advice, opinions, contract drafting, representation**; **accounting, bookkeeping, audit**; **incorporation, notarial or corporate secretarial** filings; **advertising clearance or claim substantiation** opinions.

Specific phrases deserving a second look:

1. **"Every engagement is contractual. Partners accept responsibility for the matter, not just the advice."** — accurate and helpful. Keep.
2. **"Verified Partners are vetted advisors who accept shared responsibility for your matter."** — *shared* responsibility could be read as CompliHub360 sharing professional responsibility. Worth reviewing independently of the trademark question.
3. **"24–48h to first response… The clock is part of the contract, not a promise."** — a service level about responsiveness, not about the professional work. Keep the distinction visible.
4. **Obligation handling states (42.5)** — the user records that they have done something; the platform does not verify it. Any wording, in product or in the identification, must not imply confirmation or sign-off.
5. The risk map states **penalty figures and deadlines**. As information with named sources this is defensible; the current framing ("upper bounds as written, not an expected cost") is the right one.
6. **"Compliance. Simplified."** — simplification of information, not performance of compliance. Do not let the identification drift toward "compliance services".

## D. Conflict-sensitive Class 42 language (COMPLYHUB, COMPLY360, FDA)

### D1 — Distance from the cited marks

Both live in **generic compliance-management and compliance-monitoring software**. CompliHub360's centre of gravity is a **professional-service matching platform** whose obligation engine exists to identify *which specialist a business needs*. The distinguishing facts, all verifiable:

- the engine's output is a **needs list that terminates in a referral**, not a compliance workflow;
- there is **no remediation, task-assignment, evidence-collection, control-testing or audit-preparation** functionality anywhere in the product;
- the declared system boundary ends at the booked appointment;
- provider search, scoring, anonymisation and scheduling have no counterpart in compliance-management software;
- where the product does touch progress (42.5), it records **the user's own statement** and is architecturally separated from the system's applicability judgement.

**Prefer:** "identifying and organizing business and regulatory compliance needs **and for searching for and matching businesses with independent professional service providers**" — the matching clause creates the distance and should stay prominent.
**Avoid:** "compliance management", "compliance monitoring", "compliance tracking", "regulatory change management", "compliance platform", "GRC".

### D2 — Functions that could be mistaken for compliance-monitoring software

| Function | Where | Handling |
|---|---|---|
| **Obligation handling states** | `/api/v1/session/:id/obligations` | Carry the applicability/handling distinction into the wording |
| **Source-drift watcher** | `.github/workflows/source-drift.yml` | Monitors our reference data against an official source, not the user's compliance |
| Threshold panels in domain views | `/dashboard/workbench/:domain` | Present thresholds relevant to identified needs |
| `ComplianceDomain.ONGOING_MONITORING` | `domain-schema.ts` | KYB/AML *information*; consider renaming the enum |
| SLA watchdog | `watchers.ts` | Monitoring of **provider responsiveness** |
| Admin cockpit, SLA watchlist | `/admin/*` | **Platform-operations** monitoring |
| Regulatory-change alerts | `/dashboard/alerts` | **Decided:** Class 45 as information (Decision 2) |

### D3 — The alerts decision (closed)

**Decided.** Regulatory-change alerts are claimed principally in **Class 45** as *providing information regarding changes in regulatory requirements*, where the cited marks are not present. Any Class 42 counterpart stays narrow and tied to the user's own prior assessment: *software for notifying users of changes to obligations previously identified for them*. Marketing copy that sold the feature in the present tense has been corrected to "in preparation" across all four locales, which removes a false use claim while keeping the public announcement that evidences genuine intent.

### D4 — FDA exclusion: what the product actually contains

The exclusion must be retained. Three findings:

**D4.1 — Both literal FDA references are replaced in commit `c1e94fd4` (17 September 2026), which awaits merge into `main`.** There were two, not one, and the second was the more exposed of the pair. In `packages/compliance-engine/obligation-enrichment.ts`, the `mktg-health-claims` obligation carried a US row sourced to *"FTC Act §5 / FDA labeling rules"*. That row now reads:

> `US: { source: 'FTC Act §5 + FTC Health Products Compliance Guidance', penalty: 'FTC injunctions + consumer redress', … }`

The substitute is more precise, not merely shorter. The FTC's *Health Products Compliance Guidance* (December 2022, superseding the 1998 *Dietary Supplements: An Advertising Guide for Industry*) is the Commission's own statement of how the §5 deception and substantiation standard applies to health and supplement claims — the working authority a US health-claims duty actually rests on, and FTC throughout, with no FDA component. Product Compliance (GPSR, CE) was not touched.

**Correction to this finding as originally written:** the statement that the enrichment row was the *only* literal FDA reference was wrong. The second sat in **marketing copy**, not in the engine. The `/markets` page renders a per-region focus list, and the third chip on the "USA & Canada" card read **"FDA/Labeling"** — key `markets.regions.items.us.focus[2]`, present in all four locale files (`en`, `de`, `es`, `tr`) and rendered at `apps/vs1-demo/ui/src/pages/MarketsPage.tsx:304`.

That reference sat **closer to the exclusion than the data row ever did.** The enrichment row is a citation inside a duty record — a statement about what the law is. The chip was an **advertised statement of what the service covers in the United States**, i.e. exactly the kind of claim a services identification and its exclusion speak to.

It is replaced in the same commit with **"FTC Advertising Rules"**, localised in keeping with the existing convention on that card (acronym kept, descriptor translated): `FTC-Werberegeln` (de), `Normas publicitarias de la FTC` (es), `FTC Reklam Kuralları` (tr). The claim stays accurate — the FTC is the agency that polices advertising claims — and carries no FDA reference.

**Status — committed, not yet merged.** Commit `c1e94fd4` on branch `claude/interesting-kapitsa-6e7679`: five files, five lines. Verified rendering in the running application across `/markets`, `/markets/us` and the Marketing Compliance area page with the United States selected, and a search of the entire shipped source and copy at that commit returns **no occurrence of "FDA" at all**. It is **not on `main`**, so the released product still carries both references until the merge lands. This note should be deleted once `main` carries the change.

**D4.2 — The health-claims obligation targets exactly the FDA-regulated sectors.** Trigger tags `health`, `supplements`, `medical`; applicable model D2C; the highest risk weight in the library (10 of 10). At EU level it rests on Regulation (EC) 1924/2006, which is not FDA. The sector overlap is real.

**D4.3 — The United States is a live, profiled market — and now more so.** It has a full country risk profile, US-specific enrichment across tax (state economic-nexus rules post-*Wayfair*), corporate (IRC §11 and state franchise tax) and marketing, and since 17 September 2026 a region- and locality-level jurisdiction model built specifically because there is no US-wide rate or threshold. The exclusion operates against content the product actively serves.

### D5 — What the exclusion must NOT remove

The exclusion is about the **regulator**, not the subject. The Product Compliance domain is **EU and UK product safety and CE conformity** — GPSR (EU) 2023/988, CE marking, technical documentation, labelling — enforced by national market-surveillance authorities. EPR and packaging rest on PPWR and national packaging acts. All of this is genuine non-FDA product-regulatory activity and should survive intact.

---

# PART VII — STANDALONE ADVISOR DOSSIERS

# TRADEMARK ADVISOR DOSSIER — CLASS 35

**1 · Main purpose.** Protects CompliHub360's intermediary business: taking business information from a company, identifying which categories of independent professional assistance it needs, maintaining and presenting a curated searchable population of vetted providers, ranking and comparing them, arranging the appointment that constitutes the referral, and administering the marketplace on both sides.

**2 · Detailed description.** A company completes a four-step guided assessment (markets, operating model, domains) or asks a free-text question. CompliHub360 converts the answers into a named list of professional-service needs, each tied to a statute, severity, penalty range and cadence. It filters a curated provider population to those covering the company's country and scores each on relevance (country coverage 0.6, coverage of requested domains 0.4), measured quality (rating, confirmation rate, responsiveness, absence of SLA breaches) and partner status, returning a ranked shortlist. Every provider is presented anonymously — pseudonym, region, years active, specialisations, languages, rating, completed mandates, response time, billing model, verified badge, and a match percentage with a decomposition naming which requested domains are covered. The company may open a fuller, still-anonymous profile with the complete pricing table (a billed event, deduplicated once per provider per user per 30 days), then book an appointment. **The booking is the referral:** identity and contact are released to the company, the company's dossier to the provider, and the platform's task ends. On the supply side, providers are recruited B2B or apply through the public application form, onboard through a token-gated intake link, are VAT-ID-validated against VIES and admitted only after manual human vetting; they receive a dashboard for bookings, performance KPIs, ranking transparency, coverage and SLA settings; verified two-sided reviews feed the ranking; an automated watchdog reminds, penalises and reroutes on missed response commitments; platform fees are invoiced monthly.

**3 · Current vs. in development vs. planned.** *Implemented:* wizard, needs identification, provider database, scoring and ranking, anonymous listing, paid detail open, appointment booking and identity reveal, partner application, provider intake with VIES validation, manual vetting, verified reviews, SLA watchdog with rerouting, fee invoicing, provider dashboards on live data. *In development:* the prose-answer engine. *Planned:* live calendar synchronisation (vendor selected, blocked on account provisioning); affiliate outclick monetisation (tracking hook built, not monetised).

**4 · Relevant provider categories.** Tax and VAT · EPR and packaging · data privacy and protection · advertising and marketing compliance · corporate formation, structuring, KYB and beneficial ownership · product compliance and product safety (non-FDA) · customs · logistics · legal advisory. See Part V for the **environmental compliance** and **marketing** scoping questions.

**5 · What CompliHub360 itself does.** Collects business information; identifies and names service needs; curates, vets and verifies providers; maintains a searchable attribute database; scores, ranks, compares; arranges the appointment; administers the marketplace, reviews, service levels and fee invoicing.

**6 · What independent providers do.** All specialist work — registrations, filings, declarations, opinions, contracts, certifications, representation.

**7 · Evidence.** `/:locale/wizard` · `/results` · `/provider/:key` · `/provider/:key/schedule` · `/partner-apply` · `/provider-intake` · `/partner-dashboard/*` · `POST /api/v1/search`, `/provider/:key/detail`, `/scheduling`, `/provider/intake`, `/reviews` · `watchers.ts`, `billing.ts`, `vies.ts`.

**8 · Limitations.** FDA exclusion retained. No regulated professional service is performed by CompliHub360. Contact data is withheld by design until booking.

**9 · Gaps in the current wording.** Appointment arranging/scheduling · provider vetting and verification · verified reviews and ratings · provider-side business administration and invoicing · the anonymity model · partner application intake · KYB/AML as a field. Possibly **unsupported**: "business contacts".

**10 · Open questions.** (a) *Answered — Decision 3:* "environmental compliance" is intended beyond packaging; the non-packaging part is not yet in use, so the filing basis needs deciding. (b) *Answered — Decision 4:* "marketing" covers advertising-law specialists (in use) and marketing service providers (intended); the field stays unqualified. (c) Should the identification cover the provider-facing side of the marketplace? (d) Does provider verification belong in Class 35 or Class 45?

---

# TRADEMARK ADVISOR DOSSIER — CLASS 42

**1 · Main purpose.** Protects the software: a hosted, multi-tenant web application that collects structured business information, runs a deterministic rules engine over it to identify, organise, source and prioritise obligations, resolves jurisdiction-specific values, powers a scored provider search and matching engine with server-enforced staged anonymisation, and provides scheduling, reporting, document-redaction, notification and workspace functionality to both sides of the marketplace.

**2 · Detailed description.** The **obligation engine** holds per-country domain weights for eight markets, an obligation-template library across eight domains, and a per-obligation, per-country map of the governing statute, penalty range with a euro upper bound, filing cadence, lead time and — where an act is adopted but not yet applicable — its start date. Given a business profile it aggregates country weights, applies industry and business-model modifiers, ranks and selects domains, expands them into obligations without discarding anything the user explicitly asked about, enriches each row, attaches the CELEX identifier and an EUR-Lex deep link, derives a severity band and returns a sorted, citable obligation set with deadline arithmetic. **It is rules-based and deterministic, not machine learning.** A **jurisdiction resolver** returns, per fact, the value at the most specific matching level across country, region and locality, and withholds regional figures entirely when the user's region is unknown. A **weekly source-drift job** reconciles the product's tax figures against the official EU database and fails red on divergence, writing nothing itself. The **matching engine** filters providers by recorded coverage, reconciles two domain vocabularies, scores relevance, measured quality and partner status, and ranks; every serialisation layer enforces a **three-stage disclosure model server-side**. Around these: accounts with guest-session adoption; role-guarded workspaces on live data; saved assessments and saved providers; per-domain views cutting across sessions; **user-recorded handling states per obligation**, architecturally separated from the system's applicability judgement; **PDF report generation with an enforced PII whitelist**; **native appointment scheduling** with double-booking prevention and reschedule handling; a notification feed with persisted read state and a built-but-unmounted alert-preference model; a **document pipeline that redacts personal data before any storage and gates AI processing on explicit, revocable consent**; transactional e-mail with single-use magic links; Stripe invoicing; an append-only audit log; and an autonomous SLA watchdog.

**3 · Current vs. in development vs. planned.** *Implemented:* everything above. *In development:* the prose-answer engine. *Planned / §1(b):* the retrieval-augmented assistant (built, feature-flagged off, parked 15 July 2026 — **to be claimed narrowly per Decision 1**); live provider-calendar synchronisation; mounting the alert-preference drawer; remaining admin surfaces.

**4 · Relevant provider categories.** As Class 35.

**5 · What CompliHub360 itself does.** Provides the software. It does not perform any regulated professional service through it. Where a user records that an obligation is handled, the platform stores that statement; it does not verify or confirm it.

**6 · What independent providers do.** All specialist work, outside the software.

**7 · Evidence.** `packages/compliance-engine/` · `services/compliance-api/src/` (`index.ts`, `jurisdiction.ts`, `assistant.ts`, `watchers.ts`, `billing.ts`, `vies.ts`) · `services/redaction/` · `.github/workflows/source-drift.yml` · `apps/vs1-demo/ui/src/` (wizard, results, provider pages, dashboards, PDF export, `api/obligations.ts`).

**8 · Limitations and conflict handling.** FDA exclusion retained. Avoid "compliance management", "compliance monitoring", "compliance tracking", "GRC". Per Decision 1, describe AI by its action — *retrieving and summarising regulatory information from a curated knowledge base* — not as "AI-powered compliance software". Per Decision 2, any alerting clause stays tied to the user's prior assessment. Do not let the exclusion remove non-FDA product safety (GPSR, CE) or packaging law.

**9 · Gaps in the current wording.** Scheduling software · report generation and export · document redaction and consent-gated AI processing · saved searches, providers and workspaces · obligation handling states · provider-side SaaS · the staged-disclosure engine · notification and alert-preference infrastructure · review capture feeding the ranking · jurisdiction-level resolution · source-provenance/drift verification · audit logging · AI/RAG functionality.

**10 · Open questions.** (a) **Answered, pending merge.** Both literal FDA references — the enrichment source string and the `/markets` US focus chip — are replaced in commit `c1e94fd4`, which has not yet merged into `main` (Part VI.D4.1). Until it lands, the released product still names the FDA in both places. (b) How far should the identification go in naming the obligation-handling-state function, given it is the closest point of contact with the cited marks? (c) Should the document-redaction pipeline be named explicitly, as a distinctive function far from the crowded field?

---

# TRADEMARK ADVISOR DOSSIER — CLASS 45

**1 · Main purpose.** Protects the regulatory compliance information CompliHub360 publishes in its own voice — what the law requires in a given market and area, which statute it rests on, the exposure, the deadline, and when a not-yet-applicable act starts to apply.

**2 · Detailed description.** Nothing on the informational surfaces is authored marketing prose; everything is generated from a verified obligation map checked against national texts and EUR-Lex, and the pages state where coverage is thin. **Eight compliance-area pages** give, per area and switchable by market, every duty with its named statute; a coverage note distinguishing market-specific sources from directly applicable EU Regulations; who enforces and the stated penalty ranges, with upper bounds labelled as such; a timeline separating what applies now from what is settled but not yet applicable; how the markets weight the area; and related areas sharing triggers. **Eight market pages** transpose the data by country, naming national statutes — UStG §18/§18i, UK VATA 1994 §3, CGI Art. 256/287, DPR 633/1972, Ley 37/1992, Wet OB 1968, KDV Kanunu 3065, VerpackG §9 (LUCID), Code env. L541-10 (AGEC), UK Packaging Waste Regs 2023 §7, GwG §20(1); for the US, state economic-nexus rules post-*Wayfair* and IRC §11 — with German-language obligation texts added in September 2026. **The generated risk map** filters the corpus to one company and is free and complete. **A downloadable PDF report** carries it with every source resolved. **A per-domain workspace view** reads one domain across all of a user's saved assessments. **Explanatory pages** describe the regulatory categories and what the platform can and cannot tell you. Since 17 September 2026 the VAT figures reconcile weekly to the **Taxes in Europe Database (DG TAXUD)** — populated by member states, published under CC BY 4.0 — with a watcher that fails red on divergence and, by design, writes nothing.

**3 · Current vs. in development vs. planned.** *Implemented:* area pages, market pages, risk map, PDF report, per-domain view, explanatory pages, official source provenance. *In development:* the in-account knowledge library (interface built, **no content pipeline**) and the prose-answer engine. *Planned / §1(b):* regulatory-change alerts — announced on the site, specified to six alert types, with a preference model wired to a live endpoint (**to be claimed in this class per Decision 2**).

**4 · Fields.** Taxation and VAT · EPR, packaging and producer-responsibility environmental law · data privacy and protection · advertising and marketing law including health claims · corporate formation, commercial register, beneficial ownership and KYB/AML · product safety and product regulatory (GPSR, CE — **non-FDA**) · customs · transportation and logistics · consumer-protection and commercial-contract law.

**5 · What CompliHub360 itself does.** States what the law requires, cites the source, quantifies stated exposure, gives the cadence and deadline, says where its own coverage is thin, and now shows a citable official source for its tax figures.

**6 · What independent providers do.** Apply the law to specific facts, give binding opinions, take responsibility for the matter.

**7 · Evidence.** `/compliance` and `/compliance/:area` (×8) · `/markets` and `/markets/:code` (×8) · `/results` · `/dashboard/workbench/:domain` · `/how-it-works` · `/resources` · `src/lib/areaProfiles.ts`, `marketProfiles.ts`, `riskMapPdf.ts` · `packages/compliance-engine/obligation-enrichment.ts` · `scripts/tedb-vat-rates.mjs`.

**8 · Limitations.** FDA exclusion retained. CompliHub360 is **not** a law firm, tax practice or regulated adviser and must not be described as providing legal advice or representation; the site, the footer and the code all state this, the last with an explicit reference to the German legal-services and tax-advice acts. Both literal FDA references — the marketing enrichment source string and the `/markets` US focus chip — are replaced in commit `c1e94fd4` of 17 September 2026, which awaits merge into `main`; until then both remain live in the released product (Part VI.D4.1).

**9 · Gaps in the current wording.** KYB/beneficial ownership/AML as a named field · consumer-protection and commercial-contract law as a named field · delivery as a **downloadable report** and through in-account surfaces, where the wording says "via a website" · regulatory-change alerts (decided for this class) · provider credential verification. Possibly **over-broad**: "environmental protection".

**10 · Open questions.** (a) Does the personalised risk map change the information/advice analysis in counsel's view? (b) Should the wording extend beyond "via a website" to cover the PDF report and in-account delivery? (c) Does provider credential verification belong in this class?

---
---

# COMPLIHUB360 TRADEMARK ADVISOR SUMMARY

*Prepared for trademark counsel · 17 September 2026 · Revision 2 · Based on the live product at commit `67efeb7b`, not on the existing draft wording.*

**What CompliHub360 is.** A technology-enabled platform that (1) collects structured business information through a guided assessment, (2) runs a deterministic rules engine over it to identify and organise the regulatory obligations that plausibly apply, (3) publishes the underlying regulatory information itself, and (4) matches the business with curated, vetted, independent professional service providers and arranges the appointment. **The platform's declared system boundary ends when the appointment is booked.** CompliHub360 performs no regulated professional service. Eight domains, eight markets (DE, FR, UK, IT, ES, NL, TR, **US**), four languages.

**Two founder decisions are already reflected below.** The AI assistant will be claimed in Class 42 **narrowly, under §1(b)**, by the action it performs rather than as "AI-powered compliance software". Regulatory-change alerts will be claimed **principally in Class 45 as information**, with any Class 42 counterpart tied to the user's own prior assessment.

---

## 1 · CLASS 35 — the intermediary layer

**Purpose:** business-needs identification, provider discovery, comparison, referral and matching, plus administration of both sides of the marketplace.

**What the platform does.** A four-step wizard, or a free-text query, produces a structured business profile, which CompliHub360 converts into a named list of professional-service needs. It filters a curated provider population to those covering the user's country and scores each — relevance 0.6 (country coverage 0.6 + share of requested domains 0.4), measured quality 0.3 (rating, confirmation rate, responsiveness, SLA breaches), partner priority 0.1 — returning a ranked shortlist in which every provider is **anonymous**: pseudonym, region, years active, specialisations, languages, rating, completed mandates, response time, billing model, verified badge, and a match percentage returned with a decomposition of its basis. The user may open a fuller, still-anonymous profile with the complete pricing table (a billed, deduplicated event), then **book an appointment — which is the referral**: identity and contact go to the user, the user's dossier to the provider, and the platform is out. On the supply side: providers are recruited B2B or apply through a public application form, onboard via a token-gated intake link, are VAT-ID-validated against VIES, and admitted only after manual human vetting; they get a dashboard for bookings, KPIs, ranking transparency, coverage and SLA settings; verified two-sided reviews feed the ranking; an automated watchdog reminds, penalises and reroutes on missed response commitments; platform fees are invoiced monthly.

**Provider categories:** tax and VAT · EPR and packaging · data privacy · advertising and marketing compliance · corporate formation, structuring, KYB and beneficial ownership · product compliance and product safety (non-FDA) · customs · logistics · legal advisory.

**The division of labour.** CompliHub360 identifies the need, curates and vets the providers, ranks and compares them, and arranges the meeting. The independent provider performs the VAT filing, the EPR registration, the customs declaration, the DPIA, the CE conformity work, the contract, the opinion.

**Limitations.** FDA exclusion retained. No regulated professional service is performed by CompliHub360. Provider contact details are deliberately withheld until the appointment is booked.

**Missing from the current Class 35 wording:** appointment arranging and scheduling (the conversion *and* billing event) · provider vetting and the "Verified Partner" designation · verified reviews and ratings feeding the ranking · provider-side business administration and fee invoicing · the anonymity/progressive-disclosure model · partner application intake · KYB/AML as a field. **Possibly unsupported:** "business contacts".

---

## 2 · CLASS 42 — the technology layer

**Purpose:** the SaaS itself. Highest residual conflict risk against COMPLYHUB and COMPLY360, so precision matters most here.

**What the software does.** The **obligation engine** holds per-country domain weights for eight markets, an obligation-template library across eight domains, and a per-obligation, per-country map of statute, penalty range with a euro upper bound, filing cadence, lead time and, where an act is adopted but not yet applicable, its start date. Given a business profile it aggregates, modifies by industry and business model, ranks and selects domains, expands them into obligations without discarding anything the user explicitly asked about, enriches each row, attaches the CELEX identifier and an EUR-Lex link, derives a severity band, and returns a sorted, citable set with deadline arithmetic. **It is rules-based and deterministic, not machine learning.** A **jurisdiction resolver** returns the value at the most specific matching level across country, region and locality — and withholds regional figures entirely when the user's region is unknown, so a user is never shown two contradictory state thresholds as ground truth. A **weekly source-drift job** reconciles the tax figures against the official EU database and fails red on divergence, writing nothing itself. The **matching engine** scores and ranks providers, and every serialisation layer enforces a **three-stage disclosure model server-side**. Around these: accounts with guest-session adoption; role-guarded workspaces on live data; saved assessments and saved providers; per-domain views across sessions; **user-recorded handling states per obligation**; **PDF report generation with an enforced PII whitelist**; **native appointment scheduling**; a notification feed with persisted read state and a built alert-preference model; a **document pipeline that redacts personal data before any storage and gates AI processing on explicit, revocable consent**; transactional e-mail with single-use magic links; Stripe invoicing; an append-only audit log; and an autonomous SLA watchdog.

**Status.** All of the above implemented, on live data. The AI/RAG assistant is built but feature-flagged off and parked — claimed under §1(b) per Decision 1. Live calendar synchronisation and regulatory-change alerting are genuinely planned.

**The division of labour.** The software identifies and organises needs and finds and ranks providers. No professional service is performed through it. Where a user records that an obligation is handled, the platform stores that statement — it does not verify, confirm or certify it.

**Limitations and conflict handling.** FDA exclusion retained. **Avoid** "compliance management", "compliance monitoring", "compliance tracking", "GRC". **Keep prominent** the matching clause, which creates the distance: the product has **no** remediation, task-assignment, evidence-collection, control-testing or audit-preparation functionality, and its declared boundary ends at the booked appointment. Per Decision 1, describe AI by its action, not as a technology category — what ships today is deterministic.

**One function needs deliberate wording.** Users can now record a handling state (`open` / `in_progress` / `done` / `not_applicable`) against each obligation in a saved assessment. The code draws the distinction explicitly: *applicability* is the system's business, *handling* is the user's. This is the product's closest point of contact with the cited marks and should be worded with that distinction visible — *software enabling users to record their own handling status against obligations previously identified for them* — rather than as compliance tracking.

**Missing from the current Class 42 wording:** scheduling software · report generation and export · document redaction and consent-gated AI processing · saved searches, providers and workspaces · obligation handling states · provider-side SaaS · the staged-disclosure engine · notification and alert-preference infrastructure · review capture feeding the ranking · jurisdiction-level resolution · source-provenance and drift verification · audit logging · AI/RAG functionality.

---

## 3 · CLASS 45 — the regulatory-information layer

**Purpose:** the regulatory compliance information CompliHub360 publishes in its own voice.

**What the platform provides.** Nothing on these surfaces is authored marketing prose; it is generated from a verified obligation map checked against national texts and EUR-Lex, and the pages state where coverage is thin rather than padding it. **Eight compliance-area pages** give, per area and switchable by market, every duty with its named statute; a coverage note distinguishing market-specific sources from directly applicable EU Regulations; who enforces and the stated penalty ranges, with upper bounds labelled as such; a timeline separating what applies now from what is settled but not yet applicable; how the eight markets weight the area; and related areas sharing triggers. **Eight market pages** transpose the data by country, naming national statutes (UStG §18/§18i, UK VATA 1994 §3, CGI Art. 256/287, DPR 633/1972, Ley 37/1992, Wet OB 1968, KDV Kanunu 3065, VerpackG §9/LUCID, Code env. L541-10/AGEC, UK Packaging Waste Regs 2023 §7, GwG §20(1); for the US, state economic-nexus rules post-*Wayfair* and IRC §11). **The generated risk map** filters the corpus to one company and is free and complete. **A downloadable PDF report** carries it with every source resolved. **A per-domain workspace view** reads one domain across all of a user's saved assessments. Since 17 September 2026 the VAT figures reconcile weekly to the **Taxes in Europe Database (DG TAXUD)** — member-state populated, CC BY 4.0, and therefore a source the product can show the user — with a watcher that fails red on divergence and deliberately writes nothing, because a tax figure that corrects itself without human review has no place in a compliance product. Planned: an in-account knowledge library (interface built, no content pipeline) and regulatory-change alerts.

**Fields:** taxation and VAT · EPR, packaging and producer-responsibility environmental law · data privacy · advertising and marketing law including health claims · corporate formation, commercial register, beneficial ownership and KYB/AML · product safety and product regulatory (GPSR, CE — **non-FDA**) · customs · transportation and logistics · consumer-protection and commercial-contract law.

**The division of labour — the sharpest boundary in the product.** CompliHub360 states what the law requires and cites the source. It does not apply the law to specific facts, does not give an opinion, and does not accept responsibility. Its own FAQ: *"CompliHub maps obligations and surfaces what is likely to apply to your operation — it is not legal advice. When a matter needs a binding opinion, we connect you to a Verified Partner who can give one."* The footer states "Not a law firm." The assistant code carries the same constraint with an explicit reference to the German legal-services and tax-advice acts.

**Limitations.** FDA exclusion retained.

**Missing from the current Class 45 wording:** KYB/beneficial ownership/AML as a named field · consumer-protection and commercial-contract law as a named field · delivery as a downloadable report and through in-account surfaces (the wording says "via a website") · regulatory-change alerts (now decided for this class) · provider credential verification. **Possibly over-broad:** "environmental protection".

---

## 4 · Real functionality NOT captured by the advisor's current descriptions

**Yes — the following are genuine, verifiable functions the current draft wording does not appear to reach.** Ranked by priority.

| # | Function | Status | Class | Why it needs discussion |
|---|---|---|---|---|
| 1 | **Arranging and scheduling appointments** between businesses and providers | Implemented (calendar sync planned) | 35, 42 | The conversion event *and* the billing event of the entire business model. Nothing in the current wording reaches it. Largest single gap. |
| 2 | **Obligation handling states** — users record their own progress against identified obligations | Implemented | 42 | New since revision 1. Genuine, and the product's **closest point of contact with COMPLYHUB / COMPLY360** — needs deliberate wording, not omission. |
| 3 | **Provider vetting, verification, "Verified Partner"** | Implemented | 35 and/or 45 | The central trust claim of the brand, and it is not obvious which class it belongs in. |
| 4 | **Document upload with automated PII redaction and a consent-gated AI pipeline** | Implemented | 42 | Technically distinctive and sits *well away* from the crowded compliance-software field — useful for distinguishing, not just for coverage. |
| 5 | **Staged anonymisation / progressive-disclosure engine** | Implemented | 42 (35 as a characteristic) | Server-enforced, structural, distinctive. Unclaimed. |
| 6 | **Verified two-sided reviews feeding the ranking** | Implemented | 35, 42 | A distinct Class 35 service and a distinct Class 42 function; neither is covered. |
| 7 | **Provider-side business administration and fee invoicing** | Implemented | 35, 42 | The entire supply side of the marketplace is absent. |
| 8 | **Jurisdiction-level data resolution** (country / region / locality) | Implemented | 42, 45 | How the product says anything correct about the US — directly relevant to how the FDA exclusion operates. |
| 9 | **Source-provenance verification and drift detection** against the official EU database | Implemented | 42, 45 | Materially strengthens the Class 45 claim that the information is verifiable rather than asserted. Name it carefully — internally it is a "watcher". |
| 10 | **Report generation and export** — a sourced PDF with an enforced PII whitelist | Implemented | 42, 45 | Class 45 says "via a website"; this is a second channel. |
| 11 | **Saved assessments, searches, providers, per-domain workspaces** | Implemented (live data) | 42 | Standard SaaS functions, none claimed. |
| 12 | **SLA monitoring of provider responsiveness with automatic rerouting** | Implemented | 35 | Contractually promised on the site. Word as *responsiveness*, never *compliance*, monitoring. |
| 13 | **Partner application intake** | Implemented | 35 | Corrects revision 1: providers may now **apply** publicly; they still cannot self-list. |
| 14 | **KYB / beneficial ownership / AML** as a regulatory field | Implemented | 35, 45 | A distinct field, routed under corporate structure; may or may not be read into "corporate compliance / governance". |
| 15 | **Consumer-protection and commercial-contract law** as a regulatory field | Implemented | 45 | Not clearly covered by any field in the current Class 45 list. |
| 16 | **Notification and alert-preference infrastructure** | Implemented (drawer not yet mounted) | 42 | — |
| 17 | **Regulatory-change alerts** | Planned | **45 — decided** | Announced on the site, specified to six alert types, preference model wired to a live endpoint. Present-tense marketing claims have been corrected to "in preparation". |
| 18 | **AI/RAG regulatory answering** | Built, parked | **42 §1(b) — decided** | To be claimed by its action, not as "AI-powered compliance software". |

### Three points counsel should see before signing the exclusion

**(a) Two literal FDA references exist in the released product. Both are replaced in commit `c1e94fd4`, which awaits merge into `main`.** The first is in the obligation-enrichment map: the health-claims US row was sourced to *"FTC Act §5 / FDA labeling rules"* and now reads *"FTC Act §5 + FTC Health Products Compliance Guidance"* — the Commission's own 2022 guidance on how §5 applies to health claims, FTC authority throughout, no FDA component.

What was *not* right in an earlier draft of this note is the word "one". The second reference is in **marketing copy**: the `/markets` page advertises **"FDA/Labeling"** as a US focus area, in all four languages (`markets.regions.items.us.focus[2]`, rendered at `MarketsPage.tsx:304`). Unlike a citation inside a duty record, that is a statement of **what the service covers** — which is what an identification and its exclusion govern, so it sits **closer to the exclusion than the data row does**. The same commit replaces it with **"FTC Advertising Rules"** (localised de/es/tr).

**Net position for counsel.** Commit `c1e94fd4` is proven — verified rendering across `/markets`, `/markets/us` and the Marketing Compliance area page with the United States selected, and a search of the entire shipped source and copy at that commit returns no occurrence of "FDA". It is **not yet on `main`**, so counsel should treat both references as present in the released product until the merge lands.

The surrounding facts are unaffected: the health-claims obligation's trigger tags are `health`, `supplements`, `medical`, and the **United States is one of eight live profiled markets** — now with a region- and locality-level data model built specifically for it. The exclusion operates against content the product actively serves.

**(b) The exclusion must not swallow product compliance generally.** The Product Compliance domain is EU/UK product safety and CE conformity — GPSR (Regulation (EU) 2023/988), CE marking, technical documentation, labelling — enforced by national market-surveillance authorities, not the FDA. EPR and packaging rest on PPWR and national packaging acts. All of this is genuine non-FDA product-regulatory activity and should survive intact.

**(c) Two fields are confirmed genuine but are only partly in use — this is a basis question, not a wording question.** The founder has confirmed both, so neither should be narrowed:

- *"Environmental compliance" / "environmental protection"* (Decision 3) — intended to reach beyond packaging. **In use today:** producer responsibility and packaging waste law (PPWR, VerpackG/LUCID, AGEC, UK Packaging Waste Regs). **Not in use:** emissions, chemicals, non-packaging waste, environmental permitting — there is no standalone environmental domain, no obligation templates and no `environment` provider-category key.
- *"Marketing"* (Decision 4) — intended to cover both. **In use today:** advertising-law and consumer-protection specialists; the area page states "Routes to specialists in advertising law and consumer protection" and names the advertising regulators (Wettbewerbszentrale, DGCCRF, ASA, AGCM, FTC). **Not in use:** marketing service providers — the `seo` category key exists in the matching vocabulary, but nothing routes to agencies and the copy currently addresses agencies as customers, not as providers.

For both, the question counsel should settle is the **filing basis**: services listed under §1(a) must be in use at filing and shown by a specimen. Counsel may prefer §1(b) for these services, or a phrasing under which what is in use today plainly reads onto the field. Both also stand as named product build items, so that the registration and the product agree before a Statement of Use falls due.

---

*This document describes the product as built at commit `67efeb7b`. The final USPTO identifications remain counsel's decision.*
