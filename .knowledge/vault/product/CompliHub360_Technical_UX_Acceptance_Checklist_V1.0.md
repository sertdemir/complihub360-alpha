<!--
  VAULT ARTEFAKT — KANONISCHE FASSUNG. NICHT INHALTLICH BEARBEITEN.
  Dies ist die Textextraktion des Originals CompliHub360_Technical_UX_Acceptance_Checklist_V1.0.docx (gleicher Ordner).
  Änderungen am Inhalt gehören in eine neue Version (V1.1) — siehe .knowledge/vault/README.md.
-->

> **Vault-Artefakt** · Wissensknoten [`KN-PRODUCT-001`](../../memory/nodes/KN-PRODUCT-001-technical-ux-acceptance-checklist.md)
> Quelle: `CompliHub360_Technical_UX_Acceptance_Checklist_V1.0.docx` · Extraktion: 2026-10-23 (pandoc, gfm) · Status: kanonisch, unverändert

---

# CompliHub360 Technical and UX Acceptance Checklist

*Product states, privacy critical tests, launch ownership and sign off*

**Version 1.0 \| 19 September 2026**

This checklist supports the active Website Implementation Handover Version 1.1. It converts the approved user journey into testable product behavior and supplies the interface copy needed for incomplete, unavailable, loading, and failure states.

# Document Control

**Version 1.0 archive and product vision reference.** The original CompliHub360 Website Copy and Implementation Handover Version 1.0 records the complete approved website vision, including planned and future capabilities. It is retained as an archive and product vision reference only. It must not be used as the active implementation specification.

**Version 1.1 active implementation specification.** This document replaces Version 1.0 for current development and launch decisions. Where the two documents differ, Version 1.1 takes priority.

**Relationship to Version 1.1.** This checklist supports Version 1.1. It must not be used to implement unconfirmed features described only in archived Version 1.0.

# Release Decisions

| **Decision**              | **Rule**                                                                            | **Status** |
|---------------------------|-------------------------------------------------------------------------------------|------------|
| Risk Map                  | Keep as the product name. Introduce it beneath “Assess My Needs.”                   | Approved   |
| Availability              | Return from actual country, requirement, and provider-network data.                 | Required   |
| Launch language           | English first. German, Spanish, and Turkish follow through controlled localization. | Approved   |
| Visible status labels     | Translate for each interface language; keep internal keys stable in English.        | Approved   |
| Zero and one match states | Use the approved state copy in this document.                                       | Required   |
| Launch scope              | Publish only supported capabilities; label beta honestly; hide unsupported claims.  | Required   |
| Confirmation ownership    | Assign an owner and target date to every release gate.                              | Required   |

# Approved UX State Copy

| **State**                  | **Heading**                                            | **Message**                                                                                                                                                                                            | **Action**                                     |
|----------------------------|--------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|
| Risk Map loading           | Creating your Risk Map                                 | We’re reviewing your answers and organizing the requirements that may apply.                                                                                                                           | No action; show progress accessibly.           |
| Risk Map delayed           | This is taking a little longer than expected           | Your answers are saved. You can wait here or return and try again.                                                                                                                                     | Try Again · Return to Assessment               |
| Risk Map failed            | We couldn’t create your Risk Map                       | Please try again. If the problem continues, contact support.                                                                                                                                           | Try Again · Contact Support                    |
| No requirements identified | No immediate requirements identified                   | Based on the information provided, we did not identify an immediate requirement. This does not mean that no obligations apply. Review your answers or update your Risk Map when your business changes. | Review My Answers                              |
| More information needed    | We need a little more information                      | Answer the remaining questions so we can assess this area more accurately.                                                                                                                             | Answer Questions · Do This Later               |
| No provider match          | No verified provider is available for this request yet | We do not currently have a verified provider covering this combination of market and service. You can request this market and choose to be notified when coverage becomes available.                   | Request This Market · Return to My Risk Map    |
| One provider match         | We found one provider that matches your current needs  | Review the provider’s expertise, coverage, expected price range, and availability before deciding whether to book a consultation.                                                                      | Review Match · Return to My Risk Map           |
| Multiple provider matches  | Compare your best matches                              | Review anonymous provider matches based on relevant expertise, coverage, service quality, availability, and fit.                                                                                       | View My Matches                                |
| Limited coverage           | Provider coverage is currently limited                 | We found limited coverage for this market or service. You can review the available match or request additional coverage.                                                                               | Review Available Match · Request More Coverage |
| Provider response overdue  | The provider has not responded yet                     | The expected response time has passed. You can continue waiting or ask CompliHub360 to show you another match. Your information will not be shared with another provider unless you approve it.        | Keep Waiting · See Another Match               |
| Alternative available      | Another provider may be available                      | Review the alternative match before deciding. We will not share your information unless you choose and book the provider.                                                                              | Review Alternative · Keep Current Request      |
| Booking processing         | Booking your consultation                              | Please keep this page open while we confirm your request.                                                                                                                                              | No action; prevent duplicate submission.       |
| Booking confirmed          | Your consultation is booked                            | The provider’s identity and full profile are now available. We have shared only the information shown in your booking confirmation.                                                                    | View Provider Profile · View Booking           |
| Booking failed             | We couldn’t complete your booking                      | No booking was created and your information was not shared. Please try again or contact support.                                                                                                       | Try Again · Contact Support                    |
| Market unavailable         | Coverage is not available for this market yet          | Request this market and choose whether you would like to receive an availability update.                                                                                                               | Request This Market · Explore Other Markets    |
| Session expired            | Your session has expired                               | For your security, please sign in again to continue. Your saved information remains in your account.                                                                                                   | Sign In                                        |
| Form error summary         | Please review the highlighted information              | Some information is missing or needs to be corrected before you can continue.                                                                                                                          | Focus first invalid field.                     |

# Information Sharing Confirmation

Before the booking is submitted, the user must see a clear summary of the information that will be shared with the selected provider.

**HEADING**

> Review what will be shared

**BODY**

> To process your consultation request, CompliHub360 will share the information listed below with the provider you selected. Your information will not be shared with other providers unless you make another selection and approve it.

**CONFIRMATION CONTROL**

> I understand and want to continue with this booking.

**BUTTONS**

> Confirm and Book · Go Back

# Privacy Critical Acceptance Tests

| **Test**                      | **Given**                                                  | **When**                                        | **Expected result**                                                                                                                     |
|-------------------------------|------------------------------------------------------------|-------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| Anonymous results             | A signed-in user has not booked a provider                 | The match endpoint and page are opened          | No provider name, logo, domain, direct contact detail, exact identifying award, or identifying credential link is returned or rendered. |
| Identity reveal               | The user selected a provider but has not completed booking | The profile is requested                        | The provider remains anonymous.                                                                                                         |
| Identity reveal after booking | The user completes the booking and sharing confirmation    | The confirmed provider profile is requested     | Only the selected provider’s identity and full approved profile become available.                                                       |
| Selected provider only        | Several matches are displayed                              | The user books one provider                     | Information is delivered only to the booked provider.                                                                                   |
| Alternative provider          | A provider misses the expected response time               | An alternative is suggested                     | No information is shared until the user reviews, chooses, and books the alternative.                                                    |
| Booking failure               | A booking request fails                                    | The transaction ends                            | No provider receives the user’s information and the UI states that nothing was shared.                                                  |
| Browser payload               | Anonymous matches are displayed                            | Network responses and page source are inspected | Identifying provider data is absent, not merely hidden with CSS.                                                                        |
| Authorization                 | A user requests another user’s booking or provider reveal  | The API request is made                         | Access is denied and the event is logged.                                                                                               |
| Data minimization             | A booking is confirmed                                     | The provider payload is generated               | Only fields disclosed in the confirmation screen and required for the request are shared.                                               |
| Audit record                  | A booking or sharing event occurs                          | The event completes                             | The system records user, provider, fields shared, consent/confirmation, and timestamp according to the retention policy.                |

# Matching and Ranking Tests

**☐** Commercial subscription tier, booking fee, affiliate arrangement, advertising spend, and company size do not improve match score or rank.

**☐** The factors used in a match are documented and can be traced to verified provider and user data.

**☐** Tied or insufficient matches use a defined rule that does not introduce pay-to-rank behavior.

**☐** A provider cannot edit verified fields without revalidation where revalidation is required.

**☐** Expired or revoked credentials are not presented as current.

**☐** A match explanation does not reveal provider identity before booking.

**☐** Zero, one, limited, and multiple match results use the correct singular or plural copy.

# Terminology and Design System Tests

| **Prohibited or old term** | **Required term**       |
|----------------------------|-------------------------|
| Corporate & Structure      | Company Setup & Filings |
| Legal Advisory             | Legal Support           |
| Domain                     | Area                    |
| Verified Partner           | Verified Provider       |
| Severity                   | Priority                |
| Immediate or Critical      | Urgent                  |
| Start the Risk Map         | Assess My Needs         |
| Generate My Risk Map       | Create My Risk Map      |
| Unlock Matches             | See My Best Matches     |
| Start New Search           | Start New Assessment    |
| Saved Sessions             | Saved Risk Maps         |

**☐** Create a language-file lint test that fails when prohibited terms appear in user-facing English strings, except approved historical or test fixtures.

**☐** Rename old internal keys where the concept changed; do not keep risk.severity.critical while displaying Urgent.

**☐** Define status and priority values as shared design-system constants rather than repeated free text.

**☐** Tooltips must work with keyboard, focus, Escape, touch, and assistive technology; they must not be hover-only.

**☐** Priority and status must never rely on color alone.

# Availability Tests

**☐** Coverage is calculated from active provider capability, country, service, and any required qualification data.

**☐** A page never shows “Available globally” solely because a service is intended to become global.

**☐** A country or service with no active coverage returns the approved unavailable state.

**☐** One active provider returns the singular one-match state, not “Compare your best matches.”

**☐** Limited coverage is distinguishable from broad coverage.

**☐** Coverage changes are reflected without editing static homepage copy.

**☐** Request-market and notification preferences are recorded only with the user’s choice.

# Accessibility and Localization Tests

**☐** All interactive elements are keyboard reachable and have visible focus.

**☐** Loading states are announced without repeatedly interrupting assistive technology.

**☐** Error summaries link or move focus to the first invalid field.

**☐** Tooltips and dialogs have accessible names, roles, focus management, and Escape behavior.

**☐** English pages contain no German, Spanish, or Turkish fallback text.

**☐** Localized pages contain no unintended English fallback text.

**☐** Visible status and priority labels are translated; internal keys remain stable.

**☐** English Title Case rules are not automatically imposed on other languages.

**☐** Layouts are tested with long German and Turkish strings and at mobile widths.

# Capability and Legal Release Gates

| **Gate**                                                | **Recommended owner**          | **Named owner** | **Target date** |
|---------------------------------------------------------|--------------------------------|-----------------|-----------------|
| Assessment timing                                       | Product/Engineering            |                 |                 |
| Official sources and review dates                       | Compliance Content             |                 |                 |
| Provider verification criteria                          | Provider Operations            |                 |                 |
| Match methodology and non-pay-to-rank control           | Product/Engineering            |                 |                 |
| Reviews and external-source permissions                 | Provider Operations/Legal      |                 |                 |
| Credentials, awards and business verification           | Provider Operations            |                 |                 |
| Expected response and service timelines                 | Provider Operations/Product    |                 |                 |
| Workspace and engagement history                        | Engineering                    |                 |                 |
| PDF, CSV and API exports                                | Engineering                    |                 |                 |
| Personalized and real-time alerts                       | Engineering/Compliance Content |                 |                 |
| Newsletter consent and unsubscribe                      | Marketing/Legal/Engineering    |                 |                 |
| Privacy notice and pre-share confirmation               | Legal/Product/Engineering      |                 |                 |
| Storage, safeguards and security claims                 | Security/Legal                 |                 |                 |
| Country and provider coverage                           | Provider Operations/Product    |                 |                 |
| Terms, Privacy, Cookies, Legal Notice and subprocessors | Legal                          |                 |                 |
| Beta and feature-availability labels                    | Product                        |                 |                 |

# Final Release Sign Off

**☐** Public copy matches actual production behavior.

**☐** All conditional claims are verified or hidden.

**☐** All privacy-critical tests pass in frontend and backend test suites.

**☐** Zero, one, limited, multiple, loading, error, and delayed-response states are implemented.

**☐** Provider identity is absent from pre-booking browser and API payloads.

**☐** Terminology linting and shared status/priority constants are active.

**☐** English localization contains no mixed-language strings.

**☐** Required legal pages and links are final and live.

**☐** Named owners have approved every applicable capability and legal gate.

**☐** Version 1.1, not archived Version 1.0, is the implementation reference.

| **Approval role**   | **Name** | **Date** | **Decision** |
|---------------------|----------|----------|--------------|
| Product             |          |          |              |
| Engineering         |          |          |              |
| Legal and Privacy   |          |          |              |
| Provider Operations |          |          |              |
| Content and Brand   |          |          |              |
