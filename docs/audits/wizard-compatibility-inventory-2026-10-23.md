# Wizard Compatibility Inventory

| | |
|---|---|
| Requested by | Information Request v1.0, 15 October 2026 ([source](../wizard/CompliHub360_Wizard_Compatibility_and_Information_Request_v1.0_2026-10-15.md)) |
| Question design audited | Approved Question Bank v1.0, 20 October 2026 ([source](../wizard/CompliHub360_Wizard_Question_Bank_v1.0_2026-10-20.json)), 10 groups, 134 cards |
| Repository | `sertdemir/complihub360-alpha` |
| Branch / commit | `main` at `cbde79ff` (2026-10-22); report added on `claude/amazing-brahmagupta-h0olxs` |
| Audit date | 2026-10-23 |
| Baseline | Inventory commit `6cb20049`, 55 commits earlier. The inventory documents S1 (`wizard-inventar-2026-10-15.md`) and P1 (`wizard-compatibility-inventory-2026-10-16.md`) are **not in the repository** and were not accessible. Their findings B1–B15 were re-checked from code, not taken over. |
| Mode | Read-only. No code, migration, deployment, Provider catalogue or legal text was changed. No live data, booking, message or chargeable action. |

## How to read the evidence

- **Static** = established by reading code at `cbde79ff`. Every finding names a file and line or symbol.
- **[ENGINE-RUN]** = the compliance engine (`packages/compliance-engine/*.ts`) was executed from a scratch copy with only import specifiers changed, using Node's type stripping. Outputs are quoted.
- **Tests executed:** `services/compliance-api` `searchCoverage.test.ts` (8/8 passed). All other suites could not run because workspace dependencies are not installed in the audit container (`ERR_MODULE_NOT_FOUND`). Tests cited from other suites were **read, not executed**.
- **Live Provider data:** not queried. Every statement about populated values rests on seed scripts and fixtures and is marked **Unverified** for production.
- A static finding is a prediction of runtime behaviour, not a passed or failed scenario.

Path abbreviations: `UI/` = `apps/vs1-demo/ui/src/`, `API` = `services/compliance-api/src/index.ts`, `ENG/` = `packages/compliance-engine/`, `MIG/` = `supabase/migrations/`.

---

## 1 Current implementation summary

**One wizard, three card steps plus Review.**
- The only live wizard is `UI/components/home/AnimatedWizard.tsx`. Its steps are Markets (8 country cards plus an "Others" drawer with 12 more countries stored by **name**), Operations (6 sales-model cards) and Domains (9 categories), followed by Review.
- The full page (`/:locale/wizard`, `UI/App.tsx:84 WizardRoutes`), the workspace drawer (`UI/components/user/WizardDrawer.tsx`) and the home demo (`EntryDoorDemo.tsx`, autoplay) all mount this one component.
- `UI/components/wizard/WizardContext.tsx` contributes only the `SearchProfile` type; its reducer and provider have no callers. `UI/components/wizard-screens/*` are static mock-ups used by stories and the non-live `HomeHero`.

**Answers are selection-only today, but thin.**
- The wizard fills 5 of 12 `SearchProfile` fields (`country`, `markets`, `categories`, `businessType`, `businessTypeNote`) and derives `marketScope`. The other six fields are hard-coded empty or `false` (`AnimatedWizard.tsx:152-165`).
- There is no validation. Next and Generate always proceed, so an empty run is possible (`:317-325`).

**Nothing persists before Review.** Persistence starts on `/results` (`UI/pages/ResultsRiskMap.tsx:392-401`):
- `localStorage.ch360_last_profile`;
- `POST /api/v1/session` with top-level `country/markets/categories` plus the whole profile in `sessions.answers` (jsonb, `MIG/20260711000000_sessions.sql:5-17`).

**Only three answers are consumed.**
- **Engine** (`ENG/generator.ts`): `markets` (filtered to 8 known codes) and `categories` (focus domains).
- **Provider matching** (`API` ~3424-3596): `country` (= first market, defaulted to `DE`) as a hard filter, and `categories` as a ranking share (`catOverlap`), **not** as a filter.
- `businessType` reaches no backend consumer. The API reads `industry`/`businessModel`, which the wizard never sends (`API:3387-3388`).

**Provider release is locked.**
- After booking, the Provider receives `shared_snapshot`, which a DB CHECK restricts to `email`, `company_name`, `message`, `topic{area_code, countries}` (`MIG/20261011000000_booking_shared_snapshot.sql`, ack v2 `MIG/20261020000000_booking_ack_v2.sql`).
- No other wizard answer reaches a Provider, and no Provider "assessment summary" exists in code.

**Commercial neutrality holds in ranking.**
- The score is `0.6·relevance + 0.3·quality + 0.1·verification depth` and reads no plan or subscription data (`API:3501-3541`). The migration headers (`MIG/20260923000000_provider_pricing_v2.sql`) state the rule.
- A neutrality test suite exists (`api.test.ts:2209-2265`, read, not executed).

### Changes since `6cb20049` that matter here

- **Unchanged:** `AnimatedWizard.tsx`, `WizardContext.tsx`, `WizardDrawer.tsx`, `ENG/generator.ts`, `ENG/business-modifier.ts`, `ENG/domain-schema.ts`, the session migrations, `SLUG_TO_ENGINE`.
- **`/search`:** gained `laws_status` / `correlationId`; an engine failure is now reported as failed instead of "nothing found" (#338). The EY tutorial corpus was removed. The legacy `POST /api/v1/engagement` was removed (#354).
- **Results:** added no-Provider-match and coverage-request cards plus a limited-coverage card for guests (`UI/components/results/MarketRequest.tsx`, new).
- **`AnswersDrawer`:** validation for missing markets and areas; still single-select for Operations.
- **`RegisterPage`:** urgency field removed; field-level errors.
- **`MarketsDrawer`:** email field error added; the unconditional success state (B7a) remains.
- **Engine:** `isKnownCountry` hardened (#355).
- **Booking:** acknowledgement v2 and `shared_snapshot` contract (`20261011…`, `20261020…`).

---

## 2 Canonical catalogues and contracts

### 2.1 Categories: nine, in three places that must stay in sync

| Wizard id | Wizard label (`AnimatedWizard.tsx:114-119`) | DB `service_categories.label_en` (`MIG/20260920000000_provider_data_model.sql:128-138`) | Engine domain (`dashboard.ts:29-39 SLUG_TO_ENGINE`) | Seeded subcategories (`…:144-202`) |
|---|---|---|---|---|
| `tax-vat` | Tax & VAT | Tax and VAT | TAX | registrations, returns, oss-ioss, fiscal-representation, deregistration, transaction-review, threshold-monitoring |
| `product-packaging` | EPR & Packaging | EPR and Packaging | **PRODUCT** | packaging, reporting, take-back, eco-fees, authorized-rep |
| `data-privacy` | Data & Privacy | Data and Privacy | DATA | assessments, notices, ropa, dpia, dpa, transfers, rights-requests, breach-support |
| `marketing-seo` | Marketing Compliance | Marketing Compliance | MARKETING | cookies, consent, email-sms, advertising-claims, influencer-affiliate, suppression |
| `corporate-structure` | Corporate & Structure | Company Setup and Filings | CORPORATE | formation, qualification, annual-filings, ownership-filings, registered-agent, restructuring, closure |
| `product-compliance` | Product Compliance | Product Compliance | **PRODUCT** | gpsr, ce-marking, testing, documentation, labeling, responsible-person, recalls |
| `logistics-customs` | Logistics & Customs | Logistics and Customs | LOGISTICS | customs-registration, classification, declarations, broker, import-export, 3pl, warehousing |
| `legal-advisory` | Legal Advisory | Legal Support | LEGAL | **none** |
| `environment` | Environmental Compliance | Environment and Substances | ENVIRONMENT | weee, batteries, reach |

- **The three places:** the DB table, `UI/lib/domains.ts:9-41` and `SLUG_TO_ENGINE`. The engine has a tenth domain, `ONGOING_MONITORING`, with no slug (`ENG/domain-schema.ts:1-16`).
- **B13:** the comment "Canonical final 8 domains" (`WizardContext.tsx:3`) and the test name "kennt nur die acht Bereiche" (`api.test.ts:2789`) are stale. The DB migration itself notes that Spec §11 lists 8 areas against 9 in code (`…:104-108`).
- **Label drift:** the wizard still says "Corporate & Structure" and "Legal Advisory" where the DB says "Company Setup and Filings" and "Legal Support". The Question Bank S12 uses the DB labels.
- **Missing service codes** for the Question Bank: SEO/GEO, notary and authentication, IP, employment and every Legal Support service, assessment-only services, and ESG/emissions (the Question Bank itself excludes the last).

### 2.2 Countries

| Where | Values | Ref |
|---|---|---|
| Wizard cards | DE, UK, NL, FR, IT, ES, US, TR | `AnimatedWizard.tsx:110-113` |
| Wizard "Others" drawer | 12 **names** (Switzerland, Austria, …), stored as names | `MarketsDrawer.tsx:71-72` |
| Engine | `DE`,`FR`,`US`,`UK`,`IT`,`ES`,`NL`,`TR`; EU members DE, FR, IT, ES, NL (`isEuMember` unused by the generator) | `ENG/country-profile.ts:3,14` |
| Provider coverage | any 2-letter code (`/^[A-Z]{2}$/`), plus optional `jurisdiction_code` (never read by search) | `providerApplication.ts:72`; `MIG/20260920…:365-381` |
| Registration | lowercase list incl. at, ch, pl, se, `eu`; no TR | `UI/pages/auth/RegisterPage.tsx:67-71` |
| Policy engine (unrelated) | DE, EU, UK, US, CA, AU, ROW | `packages/policy-engine/src/countryMatrix.ts:1` |

- The UK is `UK` throughout wizard, engine and seed, not ISO `GB`. A Provider approved for `GB` in the dashboard would not match a UK request (predicted).
- There is **no region grouping, no territory list, no state/region level and no ISO catalogue.** The Question Bank's "six regions, countries or territories" selector has no backing catalogue.

### 2.3 Languages, company types, product groups

- **Languages:** no catalogue. The only list is the UI locale switcher (`UI/components/layout/LanguageMenu.tsx:29`). Provider `providers.languages` is free text, comma-separated in the dashboard (`ApplicationPage.tsx:341`).
- **Company types:** no catalogue, verified or otherwise.
- **Product groups and battery uses:** no catalogue on either side.

### 2.4 `SearchProfile` (`UI/components/wizard/WizardContext.tsx:35-48`)

| Field | Type / values | Populated by wizard | Validated | Consumed |
|---|---|---|---|---|
| `country` | string; wizard emits the 8 codes or a drawer name | `markets[0] ?? ''` (`AnimatedWizard.tsx:153`) | no (PATCH: `typeof string`) | Engine countries; **matching hard filter**; coverage; booking `deriveOpportunity` (`API:1932-1942`); dashboard |
| `markets` | string[] | card codes + drawer names (`:146-149`) | PATCH: strings, max 40 | Engine; coverage. **Matching ignores all but `country`** |
| `categories` | 9 slugs + `''` | yes (`:150`) | no; unknown slugs dropped silently (`API:3380`) | Engine focus → `confirmed`; matching rank; coverage; price range |
| `businessType` | `ecommerce`/`marketplace`/`saas`/`agency`/`other`/`''` | first selected Operations card **in card order** | no | **none in backend**; Review, PDF, Provider dossier display list |
| `businessTypeNote` | free string; actually holds the English card id | yes | no | display only; misleading name |
| `marketScope` | `local`/`eu`/`global`/`''` | `>1 market → 'eu'` | no | **none**; obsolete (B8) |
| `riskSignals`, `revenueBand`, `intent`, `urgency`, `note` | declared enums/strings | always empty | — | none |
| `existingProvider` | boolean | always `false` (an invented **No**, not unknown) | — | none |
| *(not in type)* `industry`, `businessModel` | engine enums (`ENG/business-modifier.ts:3-16`) | **never** | — | read at `API:3387-3388`, always `undefined` |

### 2.5 Endpoints

| Endpoint | Handler | Accepts | Notes |
|---|---|---|---|
| `POST /api/v1/search` (public) | `API:3342-3700` | `{country?, domains?, structured_answers?}` | Returns `{overview_summary, laws_status, correlationId?, providers[], coverage{markets,areas,covered}, laws[]}`. OpenAPI (`docs/api/openapi.yaml:25-44`) is stale: requires an unused `query`, omits `domains`/`laws` |
| `POST /api/v1/session` (public) | `API:2874-2905` | `{guest_key \| user_id, country?, markets?, categories?, answers?, risk_summary?}` | **`user_id` taken from the unauthenticated body**; the client sends only `guest_key` (`UI/api/sessions.ts:74-86`). See F3 |
| `GET /api/v1/sessions` | `API:2906-2928` | JWT user beats `guest_key` | newest 20 |
| `PATCH /api/v1/session/:id` | `API:826-874` | `{label?, status?, answers?}` | replaces `answers`; re-derives columns only when types fit; owner only |
| `POST /api/v1/session/:id/duplicate` | `API:967-1006` | `{label?}` | copies columns + `answers` + `risk_summary`; owner only |
| Reopen | *(no endpoint)* | — | UI calls `runSearch({country: s.country ?? 'DE', markets, categories})` (`ResultsRiskMap.tsx:327-338`); **`answers` are not used** |

Session endpoints are not in the OpenAPI file.

### 2.6 Status and priority keys (`/search` → Risk Map)

| Key | Meaning in code | Evidence behind it |
|---|---|---|
| `state:'confirmed'` (`API:3674`, `ENG/generator.ts:159`) | the user **selected the domain** | only the category click; no business fact. Rendered "Confirmed / Bestätigt" (`public/locales/{en,de}/results.json:51`) |
| `state:'likely'` | domain added by top-up to ≥4 domains from summed country weights | country risk matrix (`ENG/country-profile.ts:24ff`); business modifiers inert (inputs always undefined) |
| UI `kind:'answer'` ("Answer N questions") | open questions | never produced from live data (`ResultsRiskMap.tsx:185` maps only confirmed/likely); control opens account dialog (B9) |
| `severity` critical/high/medium/low | static template `riskWeight` ≥9/≥7/≥5 (`ENG/domain-schema.ts:21-26`) | not user-specific |
| priority immediate/high/medium/low | display relabel of severity (`UI/lib/priority.ts:17-25`) | same |
| groups `now` / `radar` | `applies_from` beyond horizon → radar | enrichment `appliesFrom` |
| `laws_status` ok/failed | engine ran or threw (`API:3384-3405`) | try/catch |
| `source_scope` eu/national-pending/placeholder | certainty of cited source (`ENG/obligation-enrichment.ts:192`) | editorial map |
| obligation progress open/in_progress/done/not_applicable | user's own tracking (`API:917`) | user input |

Treatment of missing input:
- **Empty result** occurs only when no engine-known market was requested; `laws_status` still says `ok` with "Obligations identified…", and the UI infers `marketUnavailable` (`MarketRequest.tsx:41-45`).
- **Unknown markets** are dropped silently by the API (`API:3373-3374`); the UI names them (`partialMarketsOf`).
- **No backend concept** exists for unknown, not applicable or not yet, and there is no guided-discovery mode.

---

## 3 Question mapping

### 3.1 Legend

**Status.**
- All 134 cards are **approved** as question design in Question Bank v1.0, which is still marked "production dependencies remain open".
- Exceptions:
  - S01 "Personal matter" is **on hold** (scope).
  - S15 is an **approved exception** to selection-only, which conflicts with the 15 October request (see §6 Q3).
  - The 15 October request still lists the S04–S06 subjects as "to develop later" and the market wording as "proposed". The 20 October bank supersedes that.

**Persistence classes.**
- **P-A**: an existing top-level session column (`country`, `markets`, `categories`).
  - Survives create, refresh (via `ch360_last_profile`), duplicate, PATCH and reopen.
  - Reopen and the dashboard read the columns.
- **P-B**: a key inside `sessions.answers` only.
  - Survives create, duplicate and PATCH (full replace). `answers` accepts any object; no server validation.
  - Is **ignored on reopen** (`ResultsRiskMap.tsx:335`) and cannot be edited in `AnswersDrawer`, which knows only the current three steps.
  - **Not restored** on the anonymous "Edit answers" path, which opens a fresh `/wizard` (`ResultsRiskMap.tsx:495`).
- **Every new Question Bank answer is P-B unless noted.** Nothing persists mid-wizard (no draft storage; B7b).
- Authentication return: the magic link lands on `/results` and rebuilds only from a **completed** `ch360_last_profile`.

**Verdicts** (request §8):
- **Wizard only supported**: the stated purpose is reachable with existing fields, or the answer only branches the wizard or adds user-side context.
- **Requires a change elsewhere**: names the dependency.
- **Unsupported**: conflicts with a fixed constraint.
- **Unverified**: not determinable statically.
- No new answer improves ranking or reaches a Provider without a dependency. Context-only answers are labelled as such.

**Dependencies.**

| Code | Dependency (outside the wizard) | Evidence |
|---|---|---|
| D1 | Engine must accept business facts. Today `industry`/`businessModel` are read but never sent; `businessType` is ignored. The engine also turns a category click into `confirmed`. | `API:3387-3388`, `:3674`; `ENG/generator.ts:143,159` |
| D2 | Matching below area level (service codes / subcategories) plus Provider input for them. Search rolls services up to `area_code`; the dashboard takes the service code as free text. | `API:3509-3516`; `ApplicationPage.tsx:471` |
| D3 | Multi-country matching. Only `country` (= first market) is a hard filter. | `API:3441-3445` |
| D4 | New Provider capability fields: client type, founder/personal, channels, hours, deadline or capacity filter, product groups, assessment service. Schema has none, or only unused free text. | `MIG/20260920…:286-309` |
| D5 | Booking and information-release contract. `shared_snapshot` CHECK allows only email, company_name, message, topic{area_code, countries}. | `MIG/20261011000000…`, `20261020000000…` |
| D6 | Country catalogue: ISO codes, regions, territories, state/region; read `jurisdiction_code`; resolve `UK`/`GB`. | §2.2 |
| D7 | Language catalogue plus coded Provider languages (and a filter if languages are to matter). | §2.3 |
| D8 | Verified company-type catalogue per country/state. | §2.3 |
| D9 | Session contract: `answers` authoritative on reopen, editable in `AnswersDrawer`, current vs planned and per-route/per-row structures, unknown ≠ no. | §2.5 |
| D10 | Free-text processing: deterministic redaction before any AI, a privacy-policy basis, retention. No wizard text path exists today. | `.agents/rules/`; `@complihub360/redaction` used only for Provider messages (`API:3167`) |
| D11 | Founder scope decision on personal matters plus Terms alignment. | §6 Q1 |
| D12 | Engine split of EPR vs Product Compliance (both → PRODUCT) and per-market statute attribution. | §5 F5, F6 |
| D13 | A Provider-side assessment summary, which does not exist in code. | §5 F9 |
| D14 | Guided discovery ("Help me identify / Not sure — guide me"), which does not exist. | §2.6 |

### 3.2 Card-by-card mapping


### Shared questions (`shared`, 17 cards)

| ID | Wording (exact) | Mode | Path (when) | Existing representation | Actual downstream use | Verdict | Deps |
|---|---|---|---|---|---|---|---|
| S01 | **Which best describes your situation?** — Existing business / self-employed / Starting a business / Personal matter / Not sure | Choose one | First card. | none; no stage/situation field. No personal route anywhere (UI, routes, Register, Provider schema) | none | Requires a change elsewhere | D11, D4 (client type), D14 |
| S02 | **What brings you here today?** — Business, product or service launch / Expansion / Compliance check / Ongoing support / Changing or adding a Provider / Problem, notice or deadline / Not sure | Choose all that apply | Once per relevant project. | `SearchProfile.intent` (`self-check`/`expert`/`full-service`) declared, always `''`; different meaning | none (`intent` never read) | Requires a change elsewhere (to drive needs or fit); Wizard only as branching | D1, D9 |
| S03 | **Where is your business established?** — Country selector / Not established yet / Not sure | Choose countries | Existing business, or formation status is relevant. | none; `country` = `markets[0]` is a target market, not establishment | `country` is the matching hard filter, so a misused field would mis-match | Requires a change elsewhere | D6, D9, D3 |
| S04 | **What do you sell or provide?** — Physical products / Digital products / software / Services / Still deciding / Not sure | Choose all that apply | Business activity is relevant. | `businessType` single value (`ecommerce`/`marketplace`/`saas`/`agency`/`other`) | none in backend (B2); display only | Requires a change elsewhere | D1, D9 |
| S05 | **Who do you sell to?** — Consumers for personal use / Businesses or organisations / Both / Still deciding / Not sure | Choose one | Sales context affects the selected work. | none (B2B/B2C only implicit in Operations card labels) | none | Requires a change elsewhere for fit; Wizard only as branching | D1, D4 |
| S06 | **How do you sell or provide your offering?** — Own website / app / Selling on marketplaces / Operating a marketplace / Direct / wholesale / Physical stores / Still deciding / Not sure | Choose all that apply | Channel affects the selected work. | `businessType` single value; one `Marketplace` card (= operator wording) | none (B2) | Requires a change elsewhere | D1, D4, D9 |
| S07 | **Which countries do you sell to?** — Country selector / Not selling yet / Not sure | Choose countries | Markets affect the selected work. | `markets` string[] (8 card codes + 12 drawer *names*); no current/planned split | engine countries; coverage matrix; matching uses only `markets[0]` | Requires a change elsewhere | D3, D6, D9 |
| S08 | **Where do you hold stock?** — Country selector / No stock held / Not sure | Choose countries | Physical products and stock location affects the selected work. | none | none | Requires a change elsewhere (only useful once engine/matching read it) | D1, D6 |
| S09 | **How is this work currently handled?** — No arrangements yet / Internally / External Provider / Internally and a Provider / Different arrangements — choose separately / Not sure | Choose one | Existing arrangements for the selected work are unknown. | `existingProvider` boolean, always `false` (invented No) | none | Requires a change elsewhere for transfer matching; Wizard only as branching | D2, D9 |
| S10 | **Which languages are you comfortable using for support?** — Language selector / No preference | Choose languages | Once; reuse across categories unless the user changes it. | none on user side; Provider `providers.languages` free-text text[] | Provider languages displayed only, not filtered/ranked | Requires a change elsewhere | D7, D4 |
| S11 | **How would you prefer to communicate?** — Email / Phone / Video call / WhatsApp / WeChat / No preference | Choose all that apply | Once; optional preference. | none; Provider side has no channel field (`work_mode` free text) | none | Unsupported as matching input; Wizard only as user-side preference | D4 |
| S12 | **What do you need help with?** — Tax/VAT / EPR & Packaging / Data & Privacy / Marketing Compliance / Company Setup & Filings / Product Compliance / Logistics & Customs / Legal Support / Environmental / Chemical & Substance Compliance / Help me identify what I need | Choose all that apply | Once after enough context to route; do not force irrelevant shared facts first. | `categories` — 9 stable slugs (`WizardCategory`) | engine focus → state `confirmed` (DNA conflict F1); matching ranking `catOverlap` (not a filter); coverage | Wizard only supported for the 9 categories; 'Help me identify' requires change elsewhere | D14, D1 (confirmed semantics) |
| S13 | **Is there a deadline for this work?** — Choose a date / No fixed deadline / Not sure | Choose one | A selected issue or service has a material date. | `urgency` enum declared, always `''`; no date field | none; Provider has no deadline/capacity filter | Requires a change elsewhere | D4, D9 |
| S14 | **What support do you need for this work?** — Start or add support / Change Provider / take over existing work / Resolve an issue / Not sure | Choose all that apply | The service branch needs an intent and it is not already clear. | none (see S09) | none | Requires a change elsewhere for transfer/issue fit | D2, D4 |
| S15 | **Anything not covered by these choices?** — Continue with my selections / Add a short explanation | Choose one | Optional, after a short predefined clarification or an unlisted company type. | `note` string declared, always `''`; no free-text input exists | none; no deterministic redaction path for wizard text | Unsupported under the request's selection-only rule (conflict, see §6 Q3) | D10, scope decision |
| S16 | **Would you like a Provider to assess this need?** — Find a Provider to assess this need / Keep this need unconfirmed | Choose one | At review, a relevant need is still unresolved after short clarification. | none; no assessment-service code; open-question control opens account dialog (B9) | none | Requires a change elsewhere | D2, D13 |
| S17 | **Review your request** — Edit a section / See my results | Review and continue | Once after all selected category branches. | Review step exists (`AnimatedWizard` step 3) and `AnswersDrawer` (3 steps, single-select Operations) | Review shows markets/activities/categories only | Wizard only supported for display/editing of stored answers; dependent-answer clearing is new wizard logic | D9 (reopen must use answers) |

### Tax/VAT (`tax-vat`, 10 cards)

Area slug `tax-vat` exists in all three canonical places. Unless a row says otherwise: existing representation = none below area `tax-vat`; Provider subcategories exist (`tax-vat.registrations`, `.returns`, `.oss-ioss`, `.fiscal-representation`, `.deregistration`, `.transaction-review`, `.threshold-monitoring`); downstream use = none — matching stops at area slug; persistence = class **P-B**.

| ID | Wording (exact) | Mode | Path (when) | Existing representation | Actual downstream use | Verdict | Deps |
|---|---|---|---|---|---|---|---|
| T01 | **What Tax/VAT support do you need?** — Tax registration / Returns & ongoing support / Review & advice / Notice or existing issue / Update or close a registration / Not sure | Choose all that apply | Tax/VAT selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| T02 | **Which countries do you need Tax/VAT support in?** — Country selector / Need guidance on the countries / Not sure | Choose countries | Requested service countries not confirmed. | none per service; only global `markets` | matching uses first country only; engine knows 8 countries | Requires a change elsewhere | D3, D6 |
| T03 | **Which taxes do you need help with?** — VAT / GST / Sales tax / Business income tax / Payroll taxes / Not sure | Choose all that apply | Ask only when relevant and not already confirmed for the same work. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| T04 | **What is the registration status?** — Registered / In progress / Not registered / Different statuses — choose separately / Not sure | Choose one per tax and country | Registration status changes the selected work. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| T05 | **Which returns need support?** — Upcoming returns / Overdue returns / Correcting past returns / Not sure | Choose all that apply | Returns selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| T06 | **What kind of Tax/VAT issue is it?** — Authority notice / Audit or investigation / Penalty or payment issue / Registration or filing issue / Delayed refund / Not sure | Choose all that apply | Issue selected; not a routine takeover. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| T07 | **What would you like reviewed?** — Registration requirements / Tax on sales or purchases / Existing setup / Business change or expansion / Tax planning / Not sure | Choose all that apply | Review & advice selected and the purpose is not already clear. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| T08 | **What needs updating?** — Business details / Tax/VAT scheme or status / Close a registration / Not sure | Choose all that apply | Update or close selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| T09 | **Where do your employees work?** — Country selector / No employees yet / Not sure | Choose countries | Payroll support selected and work locations are unknown. | none | none | Requires a change elsewhere | D6 |
| T10 | **What is the business structure?** — Company / LLC / Sole trader / Partnership / Another structure / Not sure | Choose one | Business income tax selected and structure is not already known. | none; no company-type catalogue | none | Requires a change elsewhere | D8 |

### EPR and Packaging with WEEE and Batteries (`product-packaging`, 13 cards)

Area slug `product-packaging` exists in all three canonical places. Unless a row says otherwise: existing representation = none below area; subcategories `product-packaging.packaging`, `.reporting`, `.take-back`, `.eco-fees`, `.authorized-rep`; WEEE/batteries under `environment.weee`/`.batteries`; downstream use = none — area slug only; engine maps to shared PRODUCT; persistence = class **P-B**.

| ID | Wording (exact) | Mode | Path (when) | Existing representation | Actual downstream use | Verdict | Deps |
|---|---|---|---|---|---|---|---|
| E01 | **Which products do you sell or plan to sell?** — Electrical or electronic products / Batteries sold separately / Other physical products / Not sure | Choose all that apply | Product facts not already confirmed for this work. | none (Operations card is a sales model, not a product group) | none | Wizard only supported as branching; reuse across branches needs a shared answers key | D9 |
| E02 | **Do any of these products contain or come with batteries?** — Yes / No / Not sure | Choose one | Inline with product choice for electronics or other physical products. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| E03 | **Which packaging activities apply?** — Sell already packaged products / Pack or repack products / Add shipping packaging / Make or sell empty packaging / No packaging / Not sure | Choose all that apply | Packaging may be relevant. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| E04 | **How are you involved with these products?** — Sell other brands / Sell under our own brand / Manufacture products / Source products from another country / Not sure | Choose all that apply | Role facts are missing. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| E05 | **Which countries do you need support in?** — Country selector / Not sure | Choose countries | Not already confirmed for the exact topic. | none per service; only global `markets` | matching uses first country only; engine knows 8 countries | Requires a change elsewhere | D3, D6 |
| E06 | **What support do you need?** — Check requirements / Register, update or close / Reporting & fees / Take-back or recycling / Authorised representative / Notice or existing issue / Not sure | Choose all that apply | EPR, WEEE or battery topic selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| E07 | **What is the registration status?** — Registered / In progress / Not registered / Different statuses — choose separately / Not sure | Choose one per topic and country | Status affects requested work. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| E08 | **What registration support do you need?** — Start or complete a registration / Update a registration / Close a registration / Not sure | Choose all that apply | Register, update or close selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| E09 | **Which reporting or fee support do you need?** — Upcoming reporting / Overdue reporting / Correct past reporting / Calculate quantities or fees / Not sure | Choose all that apply | Reporting & fees selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| E10 | **What kind of issue is it?** — Registration / Reporting / Fees or penalties / Take-back or recycling / Not sure | Choose all that apply | Issue explicitly selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| E11 | **What are the batteries used in?** — Phones, laptops or everyday products / E-bikes or scooters / Electric or hybrid vehicles / Vehicle starting or ignition / Industrial equipment or energy storage / Other uses / Not sure | Choose all that apply | Battery support selected and this detail changes capability fit. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| E12 | **Which electrical or electronic products are involved?** — Phones, computers & accessories / Home appliances / Lighting / Tools or industrial equipment / Toys or leisure products / Medical or specialist equipment / Other products / Not sure | Choose all that apply | WEEE support selected and product groups are unknown. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| E13 | **Which packaging materials are involved?** — Paper / cardboard / Plastic / Glass / Metal / Wood / Other materials / Not sure | Choose all that apply | Packaging service requires material detail; otherwise skip. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |

### Data and Privacy (`data-privacy`, 12 cards)

Area slug `data-privacy` exists in all three canonical places. Unless a row says otherwise: existing representation = none below area; subcategories `data-privacy.assessments`, `.notices`, `.ropa`, `.dpia`, `.dpa`, `.transfers`, `.rights-requests`, `.breach-support`; downstream use = none — area slug only; persistence = class **P-B**.

| ID | Wording (exact) | Mode | Path (when) | Existing representation | Actual downstream use | Verdict | Deps |
|---|---|---|---|---|---|---|---|
| D01 | **What privacy support do you need?** — Privacy review & advice / Policies & agreements / Ongoing privacy support / Request, complaint or authority notice / Data breach or suspected incident / Not sure — guide me | Choose all that apply | Data & Privacy selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| D02 | **Whose personal information does your business handle?** — Customers or potential customers / Website or app users / Employees or job applicants / Business contacts or suppliers / People whose information we handle for clients / Other people / Not sure | Choose all that apply | Only if it affects the service and is not already known. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| D03 | **Does this include information about anyone under 18?** — Yes / No / Not sure | Choose one | Inline with relevant people groups; only when material. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| D04 | **Where are these people located?** — Country selector / Not sure | Choose countries | Needed to scope this privacy service. | none (people locations ≠ markets) | none | Requires a change elsewhere | D6 |
| D05 | **What do you use personal information for?** — Sales or customer service / Staff or recruitment / Marketing or advertising / Website or app analytics / Client services / Other activities / Not sure | Choose all that apply | Only if relevant to this selected privacy task. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| D06 | **Who decides why and how the information is used?** — Our business / Our clients / Jointly with another organisation / Not sure | Choose all that apply | Client services or mixed arrangements make this material. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| D07 | **Which documents need support?** — Website or app privacy notice / Staff or recruitment privacy notice / Client or supplier data agreements / Internal privacy policies / Not sure | Choose all that apply | Policies & agreements selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| D08 | **What would you like done with these documents?** — Create new documents / Review existing documents / Update existing documents / Not sure — guide me | Choose all that apply | Policies & agreements; skip when the task is already clear. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| D09 | **Which ongoing support do you need?** — Day-to-day privacy advice / Privacy officer / DPO support / Review & maintain policies and records / Staff training / Not sure | Choose all that apply | Ongoing privacy support selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| D10 | **What needs a response?** — Request from an individual / Privacy complaint / Authority notice / Not sure | Choose all that apply | Request, complaint or authority notice selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| D11 | **What incident support do you need?** — Assess a suspected incident / Respond to an incident / Review a past incident / Not sure | Choose all that apply | Data breach or suspected incident selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| D12 | **What would you like reviewed?** — Understand privacy requirements / Review current privacy practices / Sharing data with other organisations / Using data across countries / New product or project / Not sure | Choose all that apply | Review & advice selected and purpose is not already clear. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |

### Marketing Compliance (`marketing-seo`, 11 cards)

Area slug `marketing-seo` exists in all three canonical places. Unless a row says otherwise: existing representation = none below area; subcategories `marketing-seo.cookies`, `.consent`, `.email-sms`, `.advertising-claims`, `.influencer-affiliate`, `.suppression` — **no SEO/GEO code**; downstream use = none — area slug only; persistence = class **P-B**.

| ID | Wording (exact) | Mode | Path (when) | Existing representation | Actual downstream use | Verdict | Deps |
|---|---|---|---|---|---|---|---|
| M01 | **What marketing support do you need?** — Cookies & tracking / Email / SMS marketing / Advertising & product claims / Influencers, affiliates & reviews / Consent & opt-out processes / Search & AI visibility (SEO / GEO) / Notice or existing issue / Not sure — guide me | Choose all that apply | Marketing Compliance selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| M02 | **What would you like a Provider to help with?** — Review & advice / Setup & improvements / Ongoing support / Issue or notice / Not sure | Choose all that apply | Action is not already clear. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| M03 | **Which countries do you need support in?** — Country selector / Not sure | Choose countries | Service countries not confirmed. | none per service; only global `markets` | matching uses first country only; engine knows 8 countries | Requires a change elsewhere | D3, D6 |
| M04 | **Where do you need cookies or tracking support?** — Website / App / Both / Not sure | Choose one | Cookies & tracking selected and environment is unknown. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| M05 | **Which messaging channels need support?** — Email / SMS / text messages / Both / Not sure | Choose one | Email / SMS marketing selected and channel is unknown. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| M06 | **What needs checking?** — Ads & social media content / Claims about your products / Prices, discounts & offers / Not sure | Choose all that apply | Advertising & product claims selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| M07 | **Which activities need support?** — Influencer promotions / Affiliate marketing / Customer reviews or testimonials / Not sure | Choose all that apply | Influencers, affiliates & reviews selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| M08 | **Which consent or opt-out processes need support?** — Collecting consent / Recording or managing consent choices / Unsubscribes or opt-outs / Not sure | Choose all that apply | Consent & opt-out processes selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| M09 | **What kind of marketing issue is it?** — Authority notice / Complaint or legal demand / Platform warning or restriction / Another marketing issue / Not sure | Choose all that apply | Notice or issue selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| M10 | **Where do you want better visibility?** — Search engines — SEO / AI answers — GEO / Both / Not sure | Choose one | Search & AI visibility selected. | none; no SEO/GEO service code in `service_categories` | none | Requires a change elsewhere (catalogue + Provider capability) | D2, D4 |
| M11 | **Which content languages do you need help with?** — Language selector / Not sure | Choose languages | SEO / GEO work needs content-language expertise and it is unknown. | none; no language catalogue | none | Requires a change elsewhere | D7, D4 |

### Company Setup and Filings (`corporate-structure`, 15 cards)

Area slug `corporate-structure` exists in all three canonical places. Unless a row says otherwise: existing representation = none below area; subcategories `corporate-structure.formation`, `.qualification`, `.annual-filings`, `.ownership-filings`, `.registered-agent`, `.restructuring`, `.closure`; downstream use = none — area slug only; persistence = class **P-B**.

| ID | Wording (exact) | Mode | Path (when) | Existing representation | Actual downstream use | Verdict | Deps |
|---|---|---|---|---|---|---|---|
| C01 | **What company support do you need?** — New company formation / Register an existing company in another location / Update company details or structure / Company filings & ongoing support / Close a company / Not sure — guide me | Choose all that apply | Company Setup & Filings selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| C02 | **Where would you like to form your company?** — Choose a location / Need advice on where to establish / Not decided yet | Choose one | New company formation selected. | none; country only, no state/region | none | Requires a change elsewhere | D6, D2 |
| C03 | **Which company type do you need?** — Verified local company types with short English descriptions / More company types / My company type isn’t listed / Need advice on company type / Not decided yet | Choose one | Formation country is known; inline after location. | none; no verified company-type catalogue | none | Requires a change elsewhere | D8 |
| C04 | **Where will you mainly run the business from?** — Country selector / Multiple countries / Not decided yet | Choose countries | Location is undecided and this fact is needed and missing. | none | none | Requires a change elsewhere | D6 |
| C05 | **Who will own the new company?** — Individuals — one or more people / Companies or organisations / Both individuals and organisations / Not decided yet | Choose one | New company formation selected and it affects the requested service. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| C06 | **Will any owners be based outside the formation country?** — Yes / No / Not sure | Choose one | New formation only; owner type and formation country are known. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| C07 | **Where do you need registration support?** — Choose a location / Need advice on where to register / Not decided yet | Choose one | Register an existing company elsewhere selected. | none; `provider_service_coverage.jurisdiction_code` exists but is never read | none | Requires a change elsewhere | D6, D2 |
| C08 | **What stage is the registration at?** — Not started / In progress / Already registered / Not sure | Choose one | Existing-company registration selected; skip advice-only request. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| C09 | **What needs changing?** — Registered name or address / Ownership or shares / Directors or management / Company type or structure / Other company details / Not sure | Choose all that apply | Update company details or structure selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| C10 | **Which ongoing support do you need?** — Ongoing filings / Company records or registers / Registered address or agent services / Company administration / secretarial support / Not sure | Choose all that apply | Company filings & ongoing support selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| C11 | **What filing support do you need?** — Start or add filing support / Change Provider / take over filings / Resolve a filing issue / Not sure | Choose all that apply | Ongoing filings selected and intent is unknown. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| C12 | **What filing issue needs support?** — Late or missed filing / Incorrect or rejected filing / Notice or penalty / Not sure | Choose all that apply | Resolve a filing issue selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| C13 | **Which registered service do you need?** — Registered address / Registered agent / Both / Not sure | Choose one | Registered address or agent services selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| C14 | **What would you like to close?** — A company / A branch or local registration / Not sure — need advice | Choose one | Close a company selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| C15 | **Is the company having difficulty paying its debts?** — Yes / No / Not sure | Choose one | Closing a company; skip branch-only closure. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |

### Product Compliance (`product-compliance`, 16 cards)

Area slug `product-compliance` exists in all three canonical places. Unless a row says otherwise: existing representation = none below area; subcategories `product-compliance.gpsr`, `.ce-marking`, `.testing`, `.documentation`, `.labeling`, `.responsible-person`, `.recalls`; downstream use = none — area slug only; engine maps to shared PRODUCT; persistence = class **P-B**.

| ID | Wording (exact) | Mode | Path (when) | Existing representation | Actual downstream use | Verdict | Deps |
|---|---|---|---|---|---|---|---|
| R01 | **What product compliance support do you need?** — Review & advice / Testing, certification & approvals / Product registrations & compliance documents / Labels, warnings & instructions / Responsible person / local representative / Product issue, notice or recall / Not sure — guide me | Choose all that apply | Product Compliance selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| R02 | **Which products need support?** — Electrical or electronic products / Batteries / Toys or children’s products / Cosmetics or personal care / Food, drinks or supplements / Clothing, textiles or footwear / More product types / Not sure | Choose all that apply | Product groups for this work are unknown. | none (product groups) | none | Wizard only as branching; product-group fit requires change elsewhere | D4 |
| R03 | **Which countries do these products need support in?** — Country selector / Not sure | Choose countries | Product service countries not confirmed. | none per service; only global `markets` | matching uses first country only; engine knows 8 countries | Requires a change elsewhere | D3, D6 |
| R04 | **How are you involved with these products?** — Sell other brands / Sell under our own brand / Manufacture products / Source products from another country / Not sure | Choose all that apply | Same-group activity not already confirmed. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| R05 | **Are these products already being sold?** — All of them / Some of them / None of them / Not sure | Choose one | Sales stage changes the work and is not known. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| R06 | **Which testing or approval support do you need?** — Identify required tests or approvals / Arrange or carry out testing / Review existing reports or certificates / Certification or approval applications / Not sure | Choose all that apply | Testing, certification & approvals selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| R07 | **Which registration or document support do you need?** — New product registrations / Update or renew registrations / Create compliance documents / Review or update documents / Change Provider / take over existing work / Resolve an issue / Not sure | Choose all that apply | Product registrations & compliance documents selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| R08 | **What label or instruction support do you need?** — Create new labels or instructions / Review or update existing ones / Translate or adapt for another market / Not sure | Choose all that apply | Labels, warnings & instructions selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| R09 | **What representative support do you need?** — Check whether one is needed / Appoint a new representative / Change an existing representative / Review current arrangements / Not sure | Choose all that apply | Responsible person / local representative selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| R10 | **What kind of product issue is it?** — Safety concern or reported incident / Authority notice or investigation / Marketplace compliance request or restriction / Withdrawal or recall / Another product issue / Not sure | Choose all that apply | Product issue, notice or recall selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| R11 | **What would you like reviewed?** — Understand requirements / Review current compliance / Assess product or material changes / Prepare for another market / Not sure | Choose all that apply | Review & advice selected and purpose is unknown. | ↑ group default | ↑ group default | Requires a change elsewhere | D2, D12 |
| R12 | **Which medical or healthcare products are involved?** — Medical devices or equipment / Tests or diagnostic kits / Medical software or apps / Medicines or pharmaceuticals / Protective equipment / Other healthcare products / Not sure | Choose all that apply | Medical or healthcare group selected and subtype changes fit. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| R13 | **Which food or feed products are involved?** — General food or drinks / Food / dietary supplements / Infant foods or specialist nutrition / Pet food or animal feed / Other food or feed products / Not sure | Choose all that apply | Food, drinks or supplements selected and subtype changes fit. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| R14 | **Do any selected products make these claims?** — Sun protection / SPF / Treating or preventing a condition / Neither / Not sure | Choose all that apply | Cosmetics or personal care selected and this affects fit. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| R15 | **Which children’s products are involved?** — Toys or games / Baby-care or nursery products / Children’s furniture or equipment / Children’s clothing or accessories / Other children’s products / Not sure | Choose all that apply | Toys or children’s products selected and subtype changes fit. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| R16 | **Do any of these products have wireless or radio functions?** — Yes / No / Not sure | Choose one | Relevant product group and feature not already confirmed. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |

### Logistics and Customs (`logistics-customs`, 12 cards)

Area slug `logistics-customs` exists in all three canonical places. Unless a row says otherwise: existing representation = none below area; subcategories `logistics-customs.customs-registration`, `.classification`, `.declarations`, `.broker`, `.import-export`, `.3pl`, `.warehousing`; downstream use = none — area slug only; persistence = class **P-B**.

| ID | Wording (exact) | Mode | Path (when) | Existing representation | Actual downstream use | Verdict | Deps |
|---|---|---|---|---|---|---|---|
| G01 | **What logistics or customs support do you need?** — Customs clearance / Import / export review & advice / Duties, product classification or origin / Shipping / freight / Warehousing / fulfilment / Shipment or customs issue / Not sure | Choose all that apply | Logistics & Customs selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| G02 | **Where are the goods moving from and to?** — Departure country / Destination country / Not sure for either end / Add another route | Paired country selections | Clearance, freight, route advice or shipment issue selected. | none; no route pairs | none | Requires a change elsewhere | D6, D9 |
| G03 | **Is this for a one-off shipment or recurring shipments?** — One-off shipment / Recurring shipments / Both / Not sure | Choose one | Customs clearance or shipping selected and recurrence is unknown. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| G04 | **What kind of shipping do you need?** — Parcel / courier / Freight / Both / Not sure | Choose one | Shipping selected and type is unknown. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| G05 | **Which transport modes do you need?** — Air / Sea / Ground / Rail / Need advice on transport | Choose all that apply | Freight selected and modes are unknown. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| G06 | **Which warehouse or fulfilment services do you need?** — Storage / Order fulfilment / Marketplace preparation / Returns handling / Not sure | Choose all that apply | Warehousing / fulfilment selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| G07 | **Where do you need warehouse or fulfilment support?** — Country selector / Not sure | Choose countries | Warehouse or fulfilment selected and requested location is unknown. | none per service; only global `markets` | matching uses first country only; engine knows 8 countries | Requires a change elsewhere | D3, D6 |
| G08 | **Do the goods need any of this handling?** — Batteries or battery-powered products / Chemicals, aerosols or flammable liquids / Temperature-controlled handling / Oversized or heavy goods / None of these / Not sure | Choose all that apply | Shipping or storage work needs handling capability. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| G09 | **Where do you need customs clearance support?** — Departure country — export / Destination country — import / Both / Not sure | Choose one per route | Customs clearance selected. | none | none | Requires a change elsewhere | D6, D9 |
| G10 | **Which duties or classification topics need support?** — Customs product codes — HS codes / Customs duties & import Tax/VAT / Customs value / Origin or trade agreements / Duty relief or refunds / Not sure | Choose all that apply | Duties, product classification or origin selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| G11 | **Which import or export topics need support?** — Requirements / Registrations, licences or permits / Documents or processes / Local importer / exporter support / Review current arrangements / Not sure | Choose all that apply | Import / export review & advice selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| G12 | **What kind of shipment or customs issue is it?** — Shipment delayed or held / Missing or rejected documents / Disputed duties or charges / Customs notice, inspection or penalty / Lost or damaged goods / Another issue / Not sure | Choose all that apply | Shipment or customs issue selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |

### Legal Support (`legal-advisory`, 16 cards)

Area slug `legal-advisory` exists in all three canonical places. Unless a row says otherwise: existing representation = none; **no seeded subcategories** for `legal-advisory`; downstream use = none — area slug only; lead fees disabled for Legal; persistence = class **P-B**.

| ID | Wording (exact) | Mode | Path (when) | Existing representation | Actual downstream use | Verdict | Deps |
|---|---|---|---|---|---|---|---|
| J01 | **What legal support do you need?** — Trademarks & intellectual property / Contracts & agreements / Employment / workplace / Business disputes or claims / Company transactions or ownership / Commercial property or leases / Regulatory advice or authority notices / Notary services & document authentication / Not sure | Choose all that apply | Legal Support selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 (catalogue must first be created) |
| J02 | **Which countries do you need legal support in?** — Country selector / Not sure | Choose countries | Legal service jurisdictions are not already confirmed. | none per service; only global `markets` | matching uses first country only; engine knows 8 countries | Requires a change elsewhere | D3, D6 |
| J03 | **What would you like a Provider to do?** — Advice or review / Prepare or update documents / Applications or registrations / Help with a dispute or proceeding / Ongoing legal support / Change Provider / take over existing work / Not sure | Choose all that apply | Action is not already clear. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 (catalogue must first be created) |
| J04 | **Which intellectual property needs support?** — Trademarks — names, logos or brands / Patents — inventions / Design rights — product appearance / Copyright — content or software / Trade secrets — confidential know-how / Other intellectual property / Not sure | Choose all that apply | Trademarks & intellectual property selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 (catalogue must first be created) |
| J05 | **What stage is the IP application or right at?** — New application / Application in progress / Existing registration or granted right / Different stages — choose separately / Not sure | Choose one per right and country | An application or registration service is relevant. | none | none | Requires a change elsewhere | D2, D9 |
| J06 | **Which contracts or agreements need support?** — Customer or supplier / Employment or contractor / Distribution, agency or franchise / Confidentiality or intellectual property / Company ownership or investment / Website or app terms / Other agreements / Not sure | Choose all that apply | Contracts & agreements selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 (catalogue must first be created) |
| J07 | **Which workplace topics need support?** — Contracts or policies / Employee or contractor arrangements / Dismissal or restructuring / Workplace complaints or disputes / Cross-border or remote work / Not sure | Choose all that apply | Employment / workplace selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 (catalogue must first be created) |
| J08 | **What stage is the dispute at?** — Discussions or negotiations / Formal demand or complaint / Mediation or arbitration / Court or tribunal proceedings / No steps taken yet / Not sure | Choose all that apply | Dispute or proceeding selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 (catalogue must first be created) |
| J09 | **What do you need help doing?** — Pursue a claim / Respond to a claim / Both / Not sure | Choose one | A dispute or claim needs this detail. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| J10 | **Which company legal work needs support?** — Buy or sell a business / Investment or fundraising / Shareholder or owner arrangements / Restructure or reorganise / Directors’ responsibilities or company decisions / Not sure | Choose all that apply | Company transactions or ownership selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 (catalogue must first be created) |
| J11 | **Which commercial property work needs support?** — Lease or rent premises / Buy or sell property / Development or permitted use / Property dispute / Other commercial property work / Not sure | Choose all that apply | Commercial property or leases selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 (catalogue must first be created) |
| J12 | **Which regulatory support do you need?** — Understand or review requirements / Licences, permits or authorisations / Authority notice / Inspection or investigation / Enforcement or appeal / Not sure | Choose all that apply | Regulatory advice or authority notices selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 (catalogue must first be created) |
| J13 | **Which notary or authentication services do you need?** — Notarise signatures or documents / Certify copies / Notarial deeds or transactions / Apostille or legalisation support / Not sure — need advice | Choose all that apply | Notary services & document authentication selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 (catalogue must first be created) |
| J14 | **Where are the documents from and where will they be used?** — Document origin country / Country or countries of use / Not sure for either / Add another document group | Paired country selections | Apostille or legalisation support selected. | none; no paired country selection | none | Requires a change elsewhere | D6, D9 |
| J15 | **How would you prefer the notary appointment?** — In person / Online where available / No preference | Choose one | An appointment-based notary service selected. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| J16 | **Where will the person signing be located during the online appointment?** — Country selector / Not sure yet | Choose countries | Online notary appointment requested and a signing act is involved. | none | none | Requires a change elsewhere | D6, D4 |

### Environmental Chemical and Substance Compliance (`environment`, 12 cards)

Area slug `environment` exists in all three canonical places. Unless a row says otherwise: existing representation = none below area; subcategories `environment.weee`, `.batteries`, `.reach` only; downstream use = none — area slug only; persistence = class **P-B**.

| ID | Wording (exact) | Mode | Path (when) | Existing representation | Actual downstream use | Verdict | Deps |
|---|---|---|---|---|---|---|---|
| H01 | **Which products or materials need support?** — Chemicals or raw materials / Formulated products / Finished products or components / Not sure | Choose all that apply | Chemical or substance support selected; same-group facts unknown. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| H02 | **Which countries do you need support in?** — Country selector / Not sure | Choose countries | After products/materials; service countries not confirmed. | none per service; only global `markets` | matching uses first country only; engine knows 8 countries | Requires a change elsewhere | D3, D6 |
| H03 | **What chemical or substance support do you need?** — Review & advice / Registrations or notifications / Substance restrictions or product checks / Safety data sheets / hazard labels / Local representative / Ongoing reporting or updates / Authority notice or existing issue / Not sure | Choose all that apply | After relevant product/material and country context. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| H04 | **How are you involved with these products or materials?** — Produce chemicals or raw materials / Blend or formulate products / Make finished products or components / Source from another country / Sell or distribute / Use in our own operations / Not sure | Choose all that apply | Only when activity changes the requested service. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| H05 | **Which registration or notification support do you need?** — New filing / Continue work in progress / Update or maintain a filing / Change Provider / take over existing work / Resolve an issue / Not sure | Choose all that apply | Registrations or notifications selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| H06 | **Which restriction or product checks do you need?** — Check applicable restrictions / Review supplier documents or declarations / Arrange testing or review results / Assess product or material changes / Not sure | Choose all that apply | Substance restrictions or product checks selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| H07 | **Which materials need support?** — Safety data sheets / Hazard labels / Both / Not sure | Choose one | Safety data sheets / hazard labels selected. | none | none | Wizard only supported as branching/context; matching effect requires change elsewhere | D4 (only if used for fit) |
| H08 | **What safety data sheet or hazard-label support do you need?** — Create new materials / Review or update existing materials / Translate or adapt for another market / Not sure | Choose all that apply | Inline with the document-type choice; action is unknown. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| H09 | **What local representative support do you need?** — Check whether one is needed / Appoint a new representative / Change an existing representative / Review current arrangements / Not sure | Choose all that apply | Local representative selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| H10 | **Which ongoing support do you need?** — Filings or reporting / Registration updates / Safety data sheet or label updates / Supplier or customer compliance requests / Monitor rule changes or ongoing advice / Not sure | Choose all that apply | Ongoing reporting or updates selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| H11 | **What kind of chemical or substance issue is it?** — Registration or reporting / Safety data sheet or label / Restricted-substance concern / Authority notice, inspection or investigation / Product or shipment restriction / Another chemical issue / Not sure | Choose all that apply | Authority notice or issue selected. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |
| H12 | **What would you like reviewed?** — Understand requirements / Review current arrangements / New or changed product or material / New market / Not sure | Choose all that apply | Review & advice selected and purpose unknown. | ↑ group default | ↑ group default | Requires a change elsewhere | D2 |

### 3.3 Compatibility at a glance

| Verdict | Cards |
|---|---|
| Wizard only supported (full purpose) | **S12** for the nine categories; **S17** for Review and editing of stored answers |
| Wizard only supported as branching / user-side context; matching effect needs a change elsewhere | S02, S05, S09, S11 and the product, role and stage facts (E01, E02, E04, R02, R04, R05, R12–R16, D02, D03, D05, D06, C05, C06, C15, G03, G04, G08, H01, H04, H07, J09, J15, E11–E13) |
| Requires a change elsewhere | every service-intent and sub-service card (all `T`, `E`, `D`, `M`, `C`, `R`, `G`, `J`, `H` service cards → D2); every country card (→ D3/D6); S03, S04, S06, S07, S08, S10, S13, S14, S16; C02, C03, C07, T09, T10, G02, G09, J05, J14, J16, M10, M11 |
| Unsupported under current constraints | **S15** (free text against the request's selection-only rule); **S01 "Personal matter"** until the scope decision |
| Unverified | none at card level. Live Provider field population is Unverified throughout (§4) |

**Bottom line.**
- **The question design is far ahead of the system.** Within the wizard, every card can be shown, branched and stored (P-B) without touching anything else.
- **But storage is all you get today.** Outside the 9 categories and the first market, **no answer changes the assessment, the Provider list or what a Provider sees.**
- **The leverage is in two places:**
  - **D2:** match on the service codes that already exist in `service_categories`.
  - **D9:** make `answers` authoritative.
- Those two unlock the most cards. **D1** (business facts into the engine) must come with the F1 fix, not before it.

---

## 4 Provider matching and compatibility evidence

| Capability | Schema | Provider dashboard input | Consumed | Missing data | Verdict |
|---|---|---|---|---|---|
| Main category | `service_categories` roots; `provider_services.service_code` FK | free text (`ApplicationPage.tsx:471`), server rejects unknown codes (`providerApplication.ts:543-546`) | **ranking only** (`catOverlap`, `API:3509-3515`); card; booking area (`leadCharge.ts:77-90`) | no approved area → not listed | Partial — **not a filter** (F2) |
| Subcategory / service code | `service_categories` children | same free-text field | **not consumed**; rolled up to `area_code`; shown as `specializations` | — | Schema only |
| Countries | `provider_service_coverage.country_code` | 2-letter input (`ApplicationPage.tsx:677`) | **hard filter** on request `country` (`API:3441-3445`) | no request country → `countryMatch=0`; UI forces `DE` | Implemented (one country) |
| Jurisdiction (state/region) | `provider_service_coverage.jurisdiction_code` | none (display only) | ignored; a state-only approval matches the whole country | — | Schema only |
| Approval per service × country | coverage `status/approved_at/expires_at`; view `matchable_provider_services` (`MIG/20260920…:650-688`, `20260921000000_matchable_area_code.sql`) | reviewer side (`providerReview.ts`); new rows `pending` | **eligibility** | pending, rejected, expired → excluded | Implemented |
| Exclusions / prerequisites | `provider_services.exclusions`, `prerequisites`, `required_user_documents`; `providers.excluded_services` | API only | provider-level exclusions shown in detail drawer (`PartnerDrawer.tsx:499`); rest not consumed | — | Display / schema only |
| Client type, founder, personal, practice | **none** (closest: `company_size_bands`, `business_models` free text) | API only | none | — | Not implemented |
| Industries / B2B-B2C / channels / marketplaces | `provider_services.industries`, `business_models` | API only | none | — | Schema only |
| Response time / completion | `response_time_hours`, `completion_days_estimate`; legacy `providers.avg_response_hours` | TermsEditor | card shows **legacy** response hours; service values not output | null | Display (legacy) only |
| Capacity | `capacity_status` open/limited/full | display only | **not filtered** (`full` stays listed) | default `open` | Schema only |
| Availability | `providers.availability`, `ooo_until`; hours, time zone, `booking_paused_at` | Availability panel, Settings | `ooo` → **excluded** (`API:3468`); hours and time zone gate booking slots only | default schedule; Europe/Berlin | Implemented (booking side) |
| Deadline restrictions | none | — | — | — | Not implemented |
| Languages | `providers.languages` text[] | free text, comma-separated (`ApplicationPage.tsx:341`) | card + drawer display; `languages[0]` = mail locale; **no filter, no rank** | `[]` | Display only |
| Support channels / hours / before-after engagement | none (`work_mode` free text, legacy intake) | — | `work_mode` in drawer | — | Not implemented |
| Price basis / currency / range | `pricing_model`, `price_min/max`, `currency`, `pricing_basis` (CHECK: currency + basis required with a price, `MIG/20260920…:298-331`) | UI edits only min/max; **no UI for currency/basis** | `price_range` on card (one currency only, `searchCoverage.ts:66`); booking `price_snapshot` | null → "Pricing on request" | Display only |
| Minimum engagement / pass-through costs | `min_engagement`, `additional_costs` | API only | none | — | Schema only |
| One-time vs recurring | `pricing_model` (no recurring); provider `billing_model` | `billing_model` in Settings | card display; `opp.recurring` hard-coded `null` (`leadCharge.ts:115`) | — | Display only |

**Eligibility.**
- **Hard exclusions:**
  - not in the view (lifecycle, service status or coverage);
  - coverage country ≠ request country;
  - `availability='ooo'`.
- **Not exclusions:** `billing_ready` and `booking_paused_at`. They block booking only.

**Ranking.**
- **Relevance:** `0.6·countryMatch + 0.4·catOverlap`.
- **Quality:** rating, completion and incidents, each neutral below the sample threshold (`performance.ts:178-191`).
- **Priority:** verification depth (`anonymity.ts:252`).
- **What the card shows:**
  - `match` is relevance only.
  - `match_tier` is high ≥90, strong ≥75, else moderate.
  - Fit explanation comes from `match_basis` and `rank_basis` (`API:3584-3593`).

**Information release.**

| Stage | What leaves the user side | Ref |
|---|---|---|
| Anonymous card | nothing about the user | `API:3557-3606`; `anonymity.ts:72` |
| Detail (logged in) | nothing about the user; opening is logged `billable:true` | `API:1006-1115` |
| Identity release | Provider identity to the user, only with a booking | `API:2040`, `:1053` |
| After booking (to Provider) | `shared_snapshot` = email, company_name, message, topic{area_code, countries}; DB CHECK forbids other keys | `sharedSnapshot.ts`; ack v2 |
| Provider assessment summary | **does not exist** | — |
| Legacy engagement path | `engagementForProvider` would forward **all** `structured_answers` minus an identity denylist; no current writer since `POST /engagement` was removed (#354) | `API:427-434` |

- **Structured wizard answers releasable to a Provider without changes elsewhere: none.** Any release needs D5: a migration, `sharedSnapshot.ts`, new acknowledgement text and the Provider leads view.
- Recommendation: delete the dormant legacy path (`API:427-434`) before adding answers. As written, any revival would release every new answer by default.

**Commercial boundaries.**
- **Ranking: no plan influence.** Static evidence above; test cited, not executed.
- **Existing commercial effects outside ranking.** These need a decision, not a fix in this audit:
  - The plan caps how many main categories a Provider may list: Essential 1, Growth 5, Global unlimited (`providerApplication.ts:529-557`, `verificationRules.ts:349`). The plan therefore limits eligibility breadth.
  - Without billing there is no booking button, but the Provider is still listed.
  - Quality rises above neutral only through bookings and reviews, and only billing-ready Providers are bookable. An unsubscribed Provider therefore cannot rise above neutral quality. Observation; not verified in data.
  - **Wizard answers can change fees later.** The lead fee band reads `opp.countries` = session markets ∩ offered (`leadCharge.ts:91-117`). Once `lead_band_rules` gain `min_countries`, **adding markets in the wizard silently changes the lead fee.** `lead_band_rules` is empty today, so every lead is Band 1. Legal Support fees are disabled.

**Live data.** Unverified. The beta seed (`scripts/beta/seed-test-providers.mjs`, 25 Providers):
- **fills:** price, currency, basis, response, completion, capacity, languages, time zone, hours;
- **leaves empty:** exclusions, prerequisites, industries, business models, size bands, jurisdiction.

Legacy-migrated services carry only the area code (`MIG/20260920…:763-789`).

---

## 5 Findings

### 5.1 Reported issues B1–B15

| ID | Status | Evidence (current) | Repair inside the wizard boundary? |
|---|---|---|---|
| B1 | **Confirmed** | Operations is multi-toggle (`AnimatedWizard.tsx:310-316`), Review lists every pick (`:400`), `buildProfile` keeps the first **in card order** (`.find`, `:151`); `AnswersDrawer` is single-select (`:107-111`) | Partly: the UI can become an honest single choice. Keeping several activities needs D9; no backend reads `businessType` anyway |
| B2 | **Confirmed** | `API:3387-3388` and `dashboard.ts:80-81` read `industry`/`businessModel`; the wizard sends `businessType`. **[ENGINE-RUN]** the effect would be material: DE, no focus → 15 rows; `AGENCY` → 2; `SAAS_SUBSCRIPTION` → 5. Passing the raw wizard value (`businessModel:'ecommerce'`) returns **0 obligations** (`ENG/generator.ts:143`) | Partly: a mapped value could be sent without API change, but B2B / Hybrid / Other and seller vs operator have no engine value. Needs D1 and a DNA review |
| B3 | **Confirmed, not live** | "Full Coverage" and 6 domains, hard-coded English (`wizard-screens/DomainsStep.tsx:79-83`, `HeroWizardVisual.tsx:19`, `public/img/hero-wizard-mobile.png`); rendered only by `HomeHero` (stories). The live home uses `HomeHeroWorld` (`pages/HomePage.tsx:63`). The live demo shows 6 of 9 domains (`AnimatedWizard.tsx:389`) | Yes (hero and demo components only) |
| B4 | **Confirmed** | EN FAQ limits to "the {{markets}} we cover today" (`en/home.json:1229`); DE says the wizard asks all markets (`de/home.json:1201`); es/tr follow DE. Also "Sechs Märkte" (`de/home.json:858`) vs `en/home.json:872`, and "acht" hard-coded (`de/common.json:829`) vs `{{markets}}` | No: locale FAQ and copy, outside the wizard |
| B5 | **Confirmed** | Drawer ids are names (`MarketsDrawer.tsx:71-72`), stored as is (`AnimatedWizard.tsx:148`), can become `country` (`:153`); the engine drops them (`API:3373-3374`); the market request is sent with the name (`MarketRequest.tsx:57`) | Partly: name → code conversion fits in the wizard; real coverage needs engine work (D6) |
| B6 | **Confirmed** | Demo Domains footer "Skip & route" (`AnimatedWizard.tsx:101,645`; `en/home.json:287`); interactive mode shows Next/Generate only (`:633`), yet the `skipHint` promise "route based on your business model" (`en/home.json:298`) still shows in interactive mode (`:606-610`) — a promise the backend does not keep (B2) | Yes |
| B7a | **Confirmed** | `signInWithOtp` returns `{error}` and does not throw; `setSent(true)` runs unconditionally, also without Supabase (`MarketsDrawer.tsx:358-367`); copy "Your progress is safe." (`en/home.json:529`). `LoginPage.tsx:252-253` handles the same call correctly | Yes |
| B7b | **Confirmed** (static) | Wizard "Save progress" stores nothing; state is memory-only. The magic link returns to `/results`, which can rebuild only from an earlier **completed** profile; with none it searches DE with no categories (`ResultsRiskMap.tsx:326`, `UI/api/search.ts:153`) | Mostly yes (draft persistence is wizard-local; the `/results` fallback is not) |
| B8 | **Confirmed**, no functional consumer | `markets.length > 1 ? 'eu'` (`AnimatedWizard.tsx:158`), so US+TR → `eu`. No API or engine reader; listed only in the Provider dossier display list (`ProviderMagicActionPage.tsx:29-32`) | Yes: stop deriving it |
| B9 | **Confirmed (wiring); currently unreachable** | "Answer N questions" → `setSaveOpen(true)` → `FreeAccountDrawer` (`ResultsRiskMap.tsx:941,1076`); live rows never produce the `answer` state (`:185`) | No: needs a follow-up question source (D14) |
| B10 | **Confirmed** | Register asks markets (different list, `RegisterPage.tsx:67-71`), industry (`:63`) and domains (`:77`) again, with no prefill. `intent` goes only to Supabase user metadata (`:252-261`). Urgency was removed (`:497-499`). Wizard `intent`/`urgency` are always `''` | No: registration and backend |
| B11 | **Confirmed** | Stored and consumed: `country`, `markets`, `categories`. Stored, display only: `businessType`, `businessTypeNote`, `marketScope`. Never filled: `riskSignals`, `revenueBand`, `intent`, `urgency`, `note`, `existingProvider`. Read but never sent: `industry`, `businessModel`. Dead: `WizardContext` reducer/provider, `UI/services/resultsService.ts`, `wizard-screens/OperationsStep.tsx` | Yes for removal; consumption needs D1/D9 |
| B12 | **Confirmed** | Defaults to DE at `UI/api/search.ts:153`, `API:3373`, `RiskMapState.tsx:116`, `ResultsRiskMap.tsx:335`, `dashboard.ts:63`, `providerContext.ts:92,126`. **[ENGINE-RUN]**:<br>• empty input → 15 "Likely" DE/EU rows;<br>• category-only `product-compliance` → DE + 8 "Confirmed" + 7 "Likely";<br>• only `BR` → no laws, UI shows market unavailable;<br>• DE+BR → DE only, BR named by UI | Partly: the wizard can require a market and drop the client default; server, dashboard and reopen defaults are outside |
| B13 | **Confirmed** | §2.1 | Yes (comment and test name only) |
| B14 | **Confirmed** | `UI/lib/analytics.ts` exposes `track()`; only scroll depth calls it (`App.tsx:4`). No wizard start, step, completion or abandonment event; server logs `session_saved` only after `/results`. `services/tracking-service` is empty | Yes (client events via existing `track()`) |
| B15 | **Confirmed** | Drawer uses `spacious` + `showHeader={false}` (`WizardDrawer.tsx:57-59`); the step rail renders only in the header when spacious (`AnimatedWizard.tsx:436-440`) and in the body only when not spacious (`:458`) | Yes. With conditional branching, a step count must become a section indicator |

### 5.2 Additional checks from the data-flow review

| Check | Status | Evidence |
|---|---|---|
| Saved-answer edits overridden by stale top-level fields | **Not reproduced in normal use; latent** | PATCH re-derives columns from `answers` when the types fit (`API:848-857`), and `AnswersDrawer` sends a full profile. A partial or malformed `answers` leaves stale columns that every consumer prefers (reopen, dashboard, booking). Separately, `AnswersDrawer` claims to keep note/urgency/revenueBand (`:140-141`) but overwrites them with empty values |
| Selected categories become confirmed requirements | **Confirmed** — see F1 | `API:3674`, `ENG/generator.ts:159` |
| EPR and Product services lose distinctions through PRODUCT | **Confirmed in the Risk Map; distinct in matching** | `SLUG_TO_ENGINE` maps both to PRODUCT (`dashboard.ts:31-32`); **[ENGINE-RUN]** either choice gives identical output (prod-safety, prod-epr and six PPWR rows, all Confirmed). Matching keeps the area slugs apart but ignores subcategories, so packaging registration vs product testing is never matched (D2) |

### 5.3 New findings (not in B1–B15)

| ID | Finding | Status | Evidence | Boundary |
|---|---|---|---|---|
| **F1** | **Category interest is shown as "Confirmed".** Selecting a category marks every obligation of that engine domain `confirmed`, with no business fact. "Product Compliance" alone confirms EPR and PPWR packaging duties | **Confirmed** (static + ENGINE-RUN) | `API:3674`; `ENG/generator.ts:159`; `results.json:51` | Outside (engine/API/Risk Map). **DNA conflict, escalated in §6** |
| **F2** | **Category is not a hard filter in Provider search.** A Provider with none of the requested areas is listed at 60 % ("moderate") | **Confirmed** (static) | `eligible` filters on any approved area + not paused (`API:3467-3468`); `catOverlap=0` → relevance 0.6 (`:3505-3516`); no client filter (`DomainProviders.tsx`, `ProviderStates.tsx`) | Outside. DNA / fair-matching review, §6 |
| **F3** | **Sessions created while signed in are lost to the account.** The client sends only `guest_key`; the server takes `user_id` from the body (`null`); adoption runs once per account (`UI/api/adoption.ts:18`); `GET /sessions` with a JWT filters by `user_id`. Any later session never appears in the workspace and cannot be edited or duplicated | **Confirmed** (static; no test covers it) | `UI/api/sessions.ts:74-86`; `API:2887-2888`, `:2921`; `adoption.ts:15-35` | Outside (API). **Security note:** `POST /session` accepts any `user_id` from an unauthenticated body, so anyone can place sessions into another account |
| **F4** | **Reopening a saved session posts the stale local profile as a new session.** On `/results?session=X` without router state, the page falls back to `ch360_last_profile` and the save effect posts it | **Confirmed** (static) | `ResultsRiskMap.tsx:288-293`, `:392-401` | Inside the wizard / results boundary |
| **F5** | **Statutes are mis-attributed across mixed markets.** One row per template, enrichment from the first market with an override, labelled for all markets | **Confirmed** (ENGINE-RUN): DE+US → `tax-vat-registration` cites UStG §18 for both; US+DE cites the US nexus source for both; US+TR shows `log-intrastat` (EU-only) as "EU-wide" | `ENG/obligation-enrichment.ts:473-483`; `ENG/generator.ts:158` | Outside (engine). False precision |
| **F6** | **Only one country is matched.** Additional and planned markets never affect Provider eligibility | Confirmed | `API:3424`, `:3441-3445` | Outside (D3) |
| **F7** | **Dashboard price entry is likely rejected.** The UI cannot set `currency`/`pricing_basis`, but the CHECK requires them whenever a price exists | Predicted, not tested | `ApplicationPage.tsx`; `MIG/20260920…:298-331` | Outside (Provider dashboard) |
| **F8** | **`existingProvider:false` invents a "No".** It is the default for an unasked question, against the request's rule that unanswered ≠ negative | Confirmed | `WizardContext.tsx:47`; `AnimatedWizard.tsx:165` | Inside |
| **F9** | **No Provider-side assessment summary exists.** The request treats it as an existing display; in code there is none | Confirmed (grep) | — | Outside (D13) |

---

## 6 Scope decisions for Demet

### Decisions taken (founder, 23 October 2026)

The founder adopted the audit's recommendations on four points:

| Point | Decision |
|---|---|
| F1 | "Confirmed" only when a user fact supports the obligation. Category interest alone is shown as a lower state. Three states instead of two: *confirmed by your answers*, *likely*, *worth checking*. To be implemented before any new category entry points. Canvas choice (same day): 1C plain-language state · 2B "Why is this here?" disclosure · 3C headline follows the evidence · 4A list grouped by state · 5B one hint plus a drawer for the open answers. |
| F2 | Without category overlap, no match percentage. Such Providers appear only when no one else fits, in a separate, honestly labelled block. The coverage gap is shown, not filled. |
| Plan effects | The plan cap on category breadth stays (product feature, not rank). Quality for Providers who cannot yet be booked counts as neutral in ranking. **Clarified the same day:** "neutral" means "without data", not "not bookable". A Provider who was never bookable has no bookings and therefore stands at neutral quality with no deduction. A Provider who was bookable before keeps the real record, good or bad, during a billing pause. Billing status never enters the score (Spec A §14). This is today's behaviour; it is now pinned by tests (`api.test.ts`, "Plan-Effekt"). |
| Q1 | No personal-matter route at launch. S01 offers existing business / self-employed, starting a business, and not sure. Private requests get a friendly, honest way out, not a dead end. |
| Q3 | No free text in wizard v1. S15 is replaced by a selectable "My case isn't listed", which flags the request for a Provider assessment (S16). Free text only after redaction, privacy policy and retention are settled. |

Already implemented from this audit: F3 (sertdemir/complihub360-alpha#372) and the in-wizard fixes B1, B5–B8, B12–B15, F4, F8 (sertdemir/complihub360-alpha#373).

### Escalated DNA conflicts

Per `CLAUDE.md`, an agent does not resolve these itself. They are named here for a human decision.

1. **F1 — category interest shown as "Confirmed".**
   - **Filter point:** "We do not create needs. We identify them." (`KN-BRAND-001`), and "Uncertainty is never hidden behind confident language."
   - **Where:** `API:3674`, `ENG/generator.ts:159`, Risk Map label "Confirmed / Bestätigt".
   - This contradicts the request's rule that category interest is not proof of a requirement.
2. **F2 — non-matching Providers listed at 60 %.**
   - **Filter points:** "Helps the user understand" and fairness between Providers.
   - **Where:** `API:3467-3468`, `:3505-3516`.
   - A "moderate" match for a Provider who covers none of the requested areas overstates fit.
3. **Plan-capped category breadth and the quality ceiling for unbookable Providers (§4).**
   - **Filter point:** fairness between Providers.
   - The plan does not touch the ranking formula, but it does shape who is eligible and who can rise.

### Product and scope questions

| # | Question | Why it blocks |
|---|---|---|
| Q1 | **Personal matter (S01).** The Fact Sheet includes individuals; Terms Draft 3 excludes personal, family and household purposes. Nothing in code supports a personal route (wizard, routes, Register, Provider schema). Founders without a company are representable by not asking company details, but there is no stage field. | S01 option set; D11 |
| Q2 | **Authoritative category list.** 9 in code, 8 in older specs, plus labelling and translation in the Fact Sheet. Labels drift (§2.1). Legal Support has no service codes. SEO/GEO, notary, IP and assessment-only services have none either. | Every category branch; D2 |
| Q3 | **S15 free text.** The 15 October request forbids free text in the wizard; the 20 October bank approves an optional explanation, capped near 500 characters. If kept, it needs D10 (deterministic redaction, no raw text to AI, privacy policy basis, retention), and the "suggest structured choices" step must not let an AI infer obligations. | S15, C03 "isn't listed" |
| Q4 | **EPR vs Product Compliance.** Keep both areas, but split the engine domain (D12)? Matching already keeps them apart at area level. | E- and R-branches; F1 severity |
| Q5 | **What may a Provider see?** Today: email, company name, message, area, countries. More context means a booking-contract change (D5) and new acknowledgement text. "Context only" answers currently have no reader on the Provider side. | Every "context" card |
| Q6 | **Multi-country matching (D3) and fee coupling.** Matching more than one country changes eligibility. Session markets already feed future fee bands. | S07, all country cards |
| Q7 | **Country catalogue standard.** ISO 3166 vs the internal `UK`; regions and territories; state level via `jurisdiction_code`. | All country cards, C02/C07 |

---

## 7 Verification scenarios

Static unless marked. Nothing was executed end-to-end.

| Scenario | Current outcome | Basis | Passes? |
|---|---|---|---|
| Founder before incorporation, no invented company details | The wizard asks no company details, but `country = markets[0]` treats the target market as the establishment; there is no stage option; Register company fields are optional (`RegisterPage.tsx:212`) | static | Partly |
| Contract-only user avoids irrelevant sales, product and shipping questions | The Operations step (D2C / B2B / Marketplace …) is always shown, but skippable because there is no validation | static | No |
| Amazon seller vs marketplace operator keep distinct meanings | A single "Marketplace" card; engine has only `MARKETPLACE_SELLER`; `businessType` is ignored | static | No — not representable |
| Own-brand seller requests packaging registration and product testing without substitution | Both areas selectable and distinct in matching. Subcategories are not matched (D2), and the Risk Map merges both into PRODUCT, all "Confirmed" (F1) | static + ENGINE-RUN | Partly |
| Multiple activities + current and planned markets survive edit, duplicate, reopen | Activities collapse to one (B1); no current/planned split; markets including name strings survive duplicate and PATCH; reopen drops everything but country/markets/categories | static | No |
| Unknown category | 200; slug dropped from engine focus without signal; lowers `catOverlap`; coverage cell false | static | No — silent |
| Unsupported market | `laws: []` but `laws_status:'ok'` and "Obligations identified…"; UI shows market unavailable. With empty `country` and only `markets:["BR"]`, **DE is assessed** | static | Partly |
| Mixed coverage (DE+BR; DE+US; US+TR) | BR dropped silently by the API and named by the UI; statutes mis-attributed (F5) | ENGINE-RUN | No |
| Empty input | German assessment, 15 "Likely" obligations, DE matching | ENGINE-RUN | No (B12) |
| Changing a detailed saved answer re-runs on the revised profile | The owner's PATCH updates `answers` and columns; reopen sends only country/markets/categories; `businessType` is ignored anyway; guest and signed-in-created sessions → 404 (F3) | static | Partly |
| Failed sign-in email shows truthful status, keeps the draft | Shows success regardless (B7a); the mid-wizard draft is not stored (B7b) | static | No |
| Personal requests stay a scope decision | No personal route exists; the audit introduced none | static | Yes |

---

## 8 DNA check of the question design

Relevant, because the change touches the wizard's questions, sequence and gating (`.agents/rules/dna-decision-filter.md`).

- **Puts real needs first.**
  - Yes. Shared facts are asked once, branches depend on the selected work, and there is no generic budget, size or motivation question (bank notes on `shared`).
  - S13 asks for a real date only where one exists, instead of urgency. That removes a lever for pressure.
- **Helps the user understand.**
  - Yes, if every "Not sure" and "guide me" option leads to real guidance. Today none does (D14), and B9 routes an open question into account creation.
  - Shipping the new cards without D14 would turn "Not sure — guide me" into a dead end.
- **Risk shown honestly, without fear.**
  - The cards avoid legal labels (controller / processor, legal battery classes, insolvency).
  - The **output side contradicts this**: F1 shows every selection as "Confirmed". Fix F1 before adding more category entry points; otherwise more cards create more false confirmations.
- **Fair between Providers.**
  - Language and channel are soft preferences (S10/S11), which is right because Provider data is free text.
  - F2 and the plan effects (§4) need a decision before more answers feed matching.
- **Information release.**
  - The bank collects no records, notices or identities.
  - More answers would not enlarge release today (D5). The dormant legacy path (`API:427-434`) is the one place where that could change by accident.

---

## Appendix A — anonymised JSON examples

Search request as sent by `runSearch` (`UI/api/search.ts:148-158`):
```json
{"country":"DE","domains":["tax-vat","product-packaging"],
 "structured_answers":{"country":"DE","markets":["DE","NL"],"categories":["tax-vat","product-packaging"],
  "businessType":"ecommerce","businessTypeNote":"D2C e-commerce","marketScope":"eu","riskSignals":[],
  "revenueBand":"","intent":"","urgency":"","note":"","existingProvider":false}}
```

Search response, abridged (`API:3612-3678`; `api.test.ts:451-546`):
```json
{"overview_summary":"Obligations identified by the compliance engine for the requested markets and domains.",
 "laws_status":"ok",
 "providers":[{"public_ref":"a1b2c3d4e5f6","title":"Verified Provider A","letter":"A",
   "descriptor":"Tax and VAT · Norddeutschland","match":100,"match_tier":"high",
   "match_basis":{"country":"DE","country_covered":true,"domains_requested":["tax-vat"],"domains_matched":["tax-vat"]},
   "is_verified":true,"markets_covered":["DE"]}],
 "coverage":{"markets":["DE","NL"],"areas":["tax-vat","product-packaging"],"covered":{"DE":["tax-vat"],"NL":[]}},
 "laws":[{"id":"tax-vat-registration","title":"VAT Registration & Filing","domain":"TAX","severity":"high",
   "markets":["DE","NL"],"source":"UStG §18 / §18i (OSS)","celex":"32006L0112","state":"confirmed"}]}
```

Session create:
```json
{"guest_key":"<uuid>","country":"DE","markets":["DE"],"categories":["tax-vat"],"answers":{"…":"SearchProfile"}}
```
→ `201 {"ok":true,"id":"<uuid>"}`

Session edit (`api.test.ts:573-584`):
```json
PATCH /api/v1/session/<id>
{"answers":{"country":"IT","markets":["IT","ES"],"categories":["tax-vat","data-privacy"],"note":"…"}}
```
→ row `country=IT`, `markets=[IT,ES]`, `categories=[tax-vat,data-privacy]`, `answers` stored verbatim.

Provider release after booking (`shared_snapshot`, allowed keys only):
```json
{"email":"<released>","company_name":"<released>","message":"<released>",
 "topic":{"area_code":"product-packaging","countries":["DE"]}}
```

## Appendix B — method

The audit was split into three read-only passes, then consolidated and spot-checked by hand:
1. frontend journeys and persistence;
2. contracts and engine;
3. Provider matching and release.

Hand spot-checks covered `ResultsRiskMap.tsx:286-401`, `API:2874-2928`, `:3462-3518`, `:3670-3676`, `UI/api/sessions.ts:74-86`, `UI/api/adoption.ts` and `ENG/generator.ts:155-160`. The engine runs used a scratch copy outside the repository.
