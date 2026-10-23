From Demet Kale \| 15 October 2026 \| Version 1.0

# 1 Task and boundaries

Please inspect the current implementation and return the information
needed to continue designing the CompliHub360 wizard. We want a fast,
selection-only assessment that identifies relevant needs and improves
Provider fit while working within the existing website, user workspace
and Provider dashboard.

**This request authorizes a read-only audit and a written report.** It
does not authorize code changes, migrations, deployments, new dashboard
fields, changes to the Provider catalogue or amendments to legal
documents.

## What we need back

Return one Wizard Compatibility Inventory based on the actual current
code and data structure. Separate implemented behavior, incomplete
implementation and planned capabilities. Show which proposed wizard
changes can work within the existing system and identify every
dependency that would require a change elsewhere.

## Requirements that guide the design

-   All wizard answers must be selectable. Use cards, buttons,
    checkboxes, lists, ranges or date pickers. Do not introduce free
    text, numeric typing, written explanations or an Other option that
    asks the user to describe something. Country selection must work
    without typing.

-   Ask a question only when its answer identifies a need, determines a
    relevant follow-up, improves Provider fit or supplies necessary
    consultation context. Reuse answers and show only relevant
    questions.

-   Keep answer labels short and familiar. Preserve the distinction
    between Not sure, Not yet, Not applicable and No where relevant.
    Unanswered and unknown answers must not become negative answers.

-   Treat the existing website and dashboards as fixed interfaces. Reuse
    current components, identifiers, supported fields, displays and
    handover locations. Report incompatible proposals rather than
    expanding the implementation scope.

-   Preserve current commercial rules, fair matching, anonymous Provider
    comparison, booking and information-release controls. Use Provider
    in product wording.

-   Selection-only applies to the wizard. This work does not remove or
    redesign the separate question or search entry elsewhere on the
    website.

Do not promise a completion time or a perfect match. Measure common
journeys before confirming a time claim. This request is preparation for
the final wizard specification; the complete category questions and
flashcard preview will be created later.

# 2 Agreed direction and question wording

The following decision record preserves our design discussion. Approval
of wording does not establish technical compatibility or authorize
implementation. The personal route has a specific scope hold described
in Section 4.

## Opening context question

**What best describes your situation?**

-   Existing business or self-employed

-   Starting a business

-   Personal matter

-   Not sure---guide me

Status: Routing concept and these options approved in discussion.
Personal matter is on hold pending scope reconciliation. Single
selection is the proposed implementation rule and must be confirmed in
the final specification.

Why: We need to distinguish business context before asking
business-specific questions. A founder or self-employed person can have
a business need without a formed company. Not sure must lead to guided
choices, not an incomplete search with invented defaults.

## Reason for seeking help

**What brings you here today?**

Choose all that apply.

-   Business, product, or service launch

-   Expansion into new markets

-   Compliance check

-   Ongoing compliance support

-   Changing or adding a Provider

-   Problem, notice, or deadline

-   Not sure---guide me

Status: Approved wording for the relevant business paths. Not
sure---guide me is exclusive. Position this question where it helps the
chosen path; the revised sequence identifies the support area before
detailed business questions.

Why: Launch preparation, ongoing work, a Provider change and an existing
problem can require different services even when the countries and
products are the same. The reason is not evidence that any legal
obligation applies.

## Relevant shared answers

Shared means asked once and reused wherever relevant. It does not mean
every user answers every question. The intended flow is context,
category choice or guided discovery, relevant shared facts, specific
follow-ups, needs summary and Provider matching. Existing entry links
may preselect context or category without bypassing missing essential
facts.

Existing arrangements are checked within each relevant category. A user
may already have a tax Provider and need new product-compliance support.
Do not replace this with one global yes or no question.

# 3 Shared facts and conditional geography

## Business establishment

**Where is your business established?**

Select the country or countries where your business is legally
established.

-   Choose country/countries

-   Not established yet

-   Not sure

Status: Approved wording for relevant business paths. Group countries by
region; retain exact country identifiers. Not established yet and Not
sure are exclusive.

Conditional follow-up: Where are you planning to establish it? Options:
Choose country/countries; Still deciding. This follow-up is approved for
Not established yet.

Why: Establishment and customer markets are separate facts. Confirm how
the existing data model represents one entity, several entities,
branches and service-country coverage. Do not collapse different
location relationships into the first selected market.

## Current and planned customer markets

Where do you sell today? Options: Choose country/countries; Not selling
yet; Not sure. Helper text: Select the countries where your customers
are located.

Any new markets planned? Options: Choose country/countries; No new
markets planned; Still deciding.

For Not selling yet, use Where do you plan to sell? Options: Choose
country/countries; Still deciding.

Status: Proposed wording for relevant business paths. This wording was
discussed but not separately approved. Do not ask sales questions when
they do not help the selected service, such as a narrowly scoped
contract review.

Why: Current activity and future expansion can affect service scope and
timing. Keep current, planned and unknown locations distinct; do not
assume that an establishment country is a customer market.

## Other shared subjects to develop later

  -----------------------------------------------------------------------
  **Subject**     **Design direction**
  --------------- -------------------------------------------------------
  Products or     Physical goods, digital products or software, services,
  services        and combinations; exact options remain to be developed.

  Customer types  Consumers, businesses, both, or an appropriate
                  uncertainty choice.

  Sales channels  Separate selling through a marketplace from operating a
                  marketplace. Preserve all relevant channels and
                  activities.

  Physical        Ask product type, manufacturing, storage and shipping
  operations      locations only when relevant; reuse across tax, EPR,
                  product and customs.

  Provider fit    Use existing supported fields for service, timing,
                  language and support-channel preferences. Budget and
                  further detail remain subject to design and
                  compatibility review.
  -----------------------------------------------------------------------

# 4 Category catalogue and scope decisions

The October 15 inventory reports these nine live wizard categories. Use
them as the audit baseline and confirm their mapping to the actual
current Provider catalogue. Do not create, merge or rename categories
during this audit. \[S1\]

  -----------------------------------------------------------------------
  **Current category**               **Wizard identifier**
  ---------------------------------- ------------------------------------
  Tax & VAT                          tax-vat

  EPR & Packaging                    product-packaging

  Data & Privacy                     data-privacy

  Marketing Compliance               marketing-seo

  Company Setup & Filings            corporate-structure

  Product Compliance                 product-compliance

  Logistics & Customs                logistics-customs

  Legal Support                      legal-advisory

  Environmental Compliance           environment
  -----------------------------------------------------------------------

Category screen proposal: What do you need help with? Users may choose
one or more categories, or the exclusive Help me identify what I need
option. Category-page entries can preselect the existing category. This
screen and its short card descriptions remain proposals awaiting final
approval.

Why: A user who knows the area should reach relevant questions quickly.
A user who needs guidance should receive factual choices that help
identify areas worth assessing. A suggested category is not a confirmed
obligation.

## Personal matters and users without companies

The September platform fact sheet includes businesses and individuals in
its intended audience. The later User Terms of Use Lawyer Review Draft 3
defines permitted use around an existing or planned business,
professional or commercial activity and excludes matters primarily for
personal, family or household purposes. \[S5, S6\]

The Personal matter route is therefore on hold. Report the implemented
behavior and the inconsistency; obtain a founder scope decision before
recommending that route. Do not amend the terms, promise private legal
services or expand the service catalogue. Users without a formed company
who have an existing or planned business purpose remain a separate,
supported-in-principle audience under that draft.

## Catalogue questions to resolve

-   Confirm the authoritative category and service list. Older website
    and Provider specifications list eight areas; the current wizard has
    nine. The fact sheet also mentions labeling and translation. Do not
    infer a new main category from older planning text.

-   The inventory maps EPR and Product Compliance to the same PRODUCT
    engine domain. Confirm whether their specific services remain
    distinct in Provider matching.

-   Clarify the existing boundaries between EPR, Product Compliance and
    Environmental, and between Privacy and Marketing, so facts are
    reused without duplicating or substituting services.

# 5 Current implementation inventory required

Inspect the actual repository, contracts and data structure. For every
finding, include a file path and symbol, schema or configuration
reference. Give the repository, branch, commit and audit date; explain
relevant differences from inventory commit 6cb20049. Do not present the
supplied inventory as independently verified code evidence.

## Entry points and user journeys

-   Trace the full-page wizard, workspace drawer, category and market
    preselection, refine mode, saved-session reopening, duplication and
    answer editing. Include hero demonstrations and any shared component
    that would change with the wizard.

-   Record URL parameters, required navigation state, result
    destinations, authentication gates and existing draft restoration.
    Identify business assumptions in registration, saving and booking.

-   For each proposed branch, explain whether the existing journey can
    accept missing or irrelevant business fields without invented
    values.

## Actual answer and API contracts

-   Return the implemented SearchProfile fields, types, permitted
    values, required fields and defaults. Separate fields merely
    declared from fields actually populated, validated or consumed.

-   Return the accepted request and response structures for search and
    session creation, update, reopen and duplication. Include anonymized
    working examples, stable category and country identifiers, supported
    jurisdiction granularity and coverage indicators.

-   Confirm industry, businessModel, businessType and businessTypeNote
    mapping. Identify support for multiple activities, channels, current
    versus planned markets, establishment and stock locations, user
    stage, goals, urgency and category-specific details.

-   Specify existing treatment of unknown, not applicable, not yet,
    missing fields, an unknown category and unsupported markets.
    Identify whether a real guided-discovery mode exists.

## Answer processing and result meaning

Trace each input through validation, applicability rules, Risk Map
output, Provider eligibility, ranking and explanations. Identify
precisely where consumption stops. Saving a value as JSON does not prove
it changes an assessment or match.

Record the exact existing status and priority keys, their meanings and
the evidence supporting each status. Verify empty results, partial
coverage and open-question behavior. Category interest alone must not be
treated as proof of a requirement. Do not change shared constants during
this audit.

## Persistence and existing displays

Explain which fields are authoritative after refresh, sign-in,
reopening, editing or duplication. Trace complete answers into the
existing user workspace, anonymous results, Provider assessment summary
and booking handover. Identify which extra structured answers can
already be stored and displayed without changes elsewhere.

# 6 Provider matching and compatibility evidence

The Provider specifications describe detailed service records and
matching factors. Confirm which are implemented, populated, approved
where required and actually consumed. A documented intention or empty
database field is not an available matching capability. \[S3, S4\]

  -----------------------------------------------------------------------
  **Existing        **Evidence required**
  capability to     
  inspect**         
  ----------------- -----------------------------------------------------
  Service and       Main category, subcategory, stable service code,
  coverage          countries and jurisdictions, approval per
                    service-country combination, exclusions and
                    prerequisites.

  Customer and      Client types, founders or self-employed users,
  activity fit      industries, products, B2B or B2C, marketplaces and
                    channels. Confirm whether personal users or practices
                    are currently included.

  Delivery and      Response time, service completion, current capacity,
  availability      availability and deadline restrictions; distinguish
                    displayed text from structured filters.

  Language and      Supported language and channel, hours and time zone,
  support           availability before or after engagement and any
                    service-specific limits.

  Commercial        Existing price basis, currency, price range, minimum
  service fit       engagement, one-time or recurring service and
                    treatment of pass-through costs.

  Eligibility and   Hard exclusions, ranking factors, missing-data
  ranking           behavior, scoring or fit explanations and safeguards
                    against commercial influence.

  Data already      Anonymized example records plus a field-by-field
  available         indication of whether approved active Providers have
                    usable values. Avoid exporting personal or
                    confidential verification material.
  -----------------------------------------------------------------------

## Boundaries to preserve

-   Subscription and commercial arrangements must not improve organic
    ranking. Preserve current category eligibility, verification,
    billing and lead-fee rules. New complexity answers must not silently
    alter charges.

-   Preserve standardized anonymous comparison and existing
    identity-release conditions. Language or support preference does not
    authorize marketing or disclosure of direct contact details.

-   Keep all existing booking and user-information sharing controls.
    More wizard answers must not automatically enlarge the information
    released to Providers.

-   A question that only improves the existing consultation summary must
    be identified as context. Do not describe it as an automated ranking
    improvement.

-   If compatibility requires a new Provider field, migration, external
    display, engine feature or change to a booking contract, record the
    dependency and propose narrowing or deferring the question. Do not
    implement that dependency.

# 7 Reported issues to verify

These findings are reported in the supplied inventory, not newly
confirmed defects. Mark each as confirmed, resolved, not reproduced or
unverified. Cite current evidence and identify whether any repair can
remain within the wizard boundary. Report separately from proposed
question improvements. \[S1\]

  ---------------------------------------------------------------------------
  **ID**   **Inventory finding and audit question**
  -------- ------------------------------------------------------------------
  B1       Multiple activity choices are displayed but only the first is
           saved. Verify selection, serialization and editing rules.

  B2       Wizard businessType does not reach backend industry/businessModel
           processing. Confirm accepted fields and actual effects.

  B3       Hero visual shows outdated categories and Full Coverage. Identify
           shared-component effects without redesigning the homepage.

  B4       English and German give different market-coverage promises. Verify
           current wording and actual coverage behavior.

  B5       Additional markets use names instead of canonical codes and are
           discarded. Trace selection, storage, search and display.

  B6       Demo Skip & route differs from interactive Next. Identify current
           behavior and any dependency on new branching.

  B7       Sign-in email failures still show success; incomplete draft
           restoration is unreliable. Verify both claims separately.

  B8       Two markets automatically produce EU scope, including US plus
           Türkiye. Confirm whether any consumer uses this field.

  B9       Open-question control opens account creation instead of a
           follow-up. Confirm the actual supported clarification path.

  B10      Registration repeats inconsistent markets, activities and
           categories; goals and urgency do not reach SearchProfile.

  B11      Several declared profile fields are never filled. Identify fields
           that are stored, consumed, unused or obsolete.

  B12      Empty input can become a German assessment through defaults. Check
           empty, category-only and unsupported-market entries.

  B13      Domain-count comment differs from the actual nine-value category
           union. Locate the canonical catalogue.

  B14      Wizard completion and abandonment events are absent. Confirm
           current analytics without adding tracking in this audit.

  B15      Workspace wizard drawer lacks a progress indicator. Confirm
           current component options and conditional-path implications.
  ---------------------------------------------------------------------------

Additional checks from the data-flow review: saved-answer edits may be
overridden by stale top-level session fields; selected categories may
become confirmed requirements; EPR and product services may lose useful
distinctions through the shared PRODUCT domain. Verify each
independently.

# 8 Required report and verification scenarios

## Report structure

Return one report with: current implementation summary; canonical
catalogues and contracts; the question mapping below; confirmed and
unresolved findings; scope decisions for Demet; and verification
scenarios. Include small anonymized JSON examples and code references in
the report or a clearly labeled appendix.

For every proposed question or change, provide these fields in a
comparison table or repeated records:

  -----------------------------------------------------------------------
  **Field**        **Required content**
  ---------------- ------------------------------------------------------
  Identity and     Question or change ID; exact wording; approved,
  decision status  proposed or on hold; applicable user path.

  Existing         Current field, type and permitted values; required or
  representation   optional; missing and unknown handling.

  Actual           Rules, Provider eligibility, ranking, consultation
  downstream use   context and existing displays; identify each
                   separately.

  Persistence      Create, save, refresh, edit, duplicate, reopen and
                   authentication return behavior.

  Compatibility    Wizard only supported; Requires a change elsewhere;
  verdict          Unsupported; or Unverified. Explain each dependency.

  Evidence and     Exact code or schema reference; static inspection,
  verification     test executed or not executed; observed or predicted
                   result.
  -----------------------------------------------------------------------

## Scenarios to assess

-   A founder before incorporation can use relevant business services
    without inventing company details.

-   A business seeking only contract advice avoids irrelevant sales,
    product and shipping questions.

-   An Amazon seller and a marketplace operator retain distinct meanings
    through saving and matching.

-   An own-brand goods seller can request packaging registration and
    product testing without service substitution.

-   Multiple activities, current markets and planned markets survive
    editing, duplication and reopening.

-   An unknown category, an unsupported market and a mixed-coverage case
    do not produce invented defaults or unjustified reassurance.

-   Changing a detailed saved answer leads to results based on the
    revised complete profile.

-   A failed sign-in email request shows truthful status and preserves
    the recoverable draft.

-   Personal requests remain a scope decision; inspection must not
    introduce or activate a personal-services route.

Use existing safe test facilities where available. Do not create live
bookings, send messages, change records or execute chargeable actions.
Static inspection does not establish that a scenario passed; state what
was actually verified.

# 9 Sources and continuation

## Source documents

Use current code as evidence of implementation. These documents supply
design context and decisions. Identify any source you cannot access
rather than reconstructing its contents.

**S1 wizard-inventar-2026-10-15.md**

Current supplied inventory; repository complihub360-alpha, main, commit
6cb20049. Sections 2 to 5 describe the question and data flow; Section 9
contains B1 to B15.

**S2 CompliHub360_Website_Implementation_Handover_v1.1.docx and
CompliHub360_Technical_UX_Acceptance_Checklist_v1.0.docx**

19 September 2026. Website v1.1 is the active reference. The original
website handover v1.0 is archive and product vision only.

**S3
CompliHub360_Provider_Verification_and_Dashboard_Implementation_Specification.docx**

Version 1.0, 20 September 2026. Sections 10 to 15 cover service records,
taxonomy, support, visibility, matching and anonymous cards.

**S4
CompliHub360_Provider_Dashboard_Pricing_and_Operations_Implementation_Specification.docx**

Version 1.0, September 2026. Relevant to service-country approval,
existing dashboard modules, assessment summary, booking and commercial
boundaries.

**S5 CompliHub360_Platform_and_Data_Processing_Fact_Sheet_Draft_1.docx**

Current retrieved file identifies its contents as Draft 3. Sections 4 to
6 include audience, category and journey assumptions requiring
reconciliation with later decisions.

**S6 CompliHub360_User_Terms_of_Use_Lawyer_Review_Draft_3.docx**

Current saved version dated 8 October 2026. Definitions and Section 3
distinguish business-purpose users without a company from primarily
personal, family and household requests. This remains a legal-review
draft.

**S7 CompliHub360_DNA_V1.docx and
CompliHub360_Developer_DNA_Website_Audit_Addendum_V2.docx**

August 2026. Ask only what matters, explain uncertainty and fit,
preserve existing product architecture and fair competition among
Providers.

## After the inventory is returned

We will review compatibility findings with Demet, resolve the audience
and catalogue questions, then continue refining each relevant shared
question and each category branch step by step. The final developer
document will explain why every section exists, its exact choices,
branching, stored fields, assessment effects, matching effects and
expected behavior.

Only after the question set and flows are finalized will we create the
complete implementation specification and the interactive
flashcard-style preview. This information request is not the final
wizard specification and does not activate proposed features.
