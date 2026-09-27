# **CompliHub360 — Provider Verification and Dashboard Implementation Specification**

Build requirements for provider onboarding, verification, capability data, matching, performance, privacy and billing

| **Document control** | **Value** |
|---|---|
| Recipient | CompliHub360 development team |
| Owner | CompliHub360 |
| Version | 1.0 |
| Date | 20 September 2026 |
| Status | Approved operational specification for implementation |
| Related next deliverable | Provider Onboarding Dossier |

**Purpose.** This document defines what the platform must collect from service providers, how CompliHub360 verifies and protects that information, which fields power matching, what users see before and after booking, and how provider performance, changes and billing readiness are managed.

**Implementation outcome.** A provider must not become active or appear in matches until the required verification, capability profile, legal acceptance and billing-readiness steps are complete. Every displayed or matching-relevant claim must remain traceable to provider-supplied and, where appropriate, independently verified evidence.

**Core trust principle.** Users first place their trust in CompliHub360 and choose providers with the help of the platform. Verification and matching therefore require documented evidence, accurate capability data, controlled visibility, continuing updates and enforceable consequences.

## 1 Implementation principles

Use the approved term Verified Provider. Do not use Verified Partner in public-facing product copy.

CompliHub360 is an information and provider-matching platform. Providers remain independent and responsible for their professional services.

Verification is category-specific, jurisdiction-specific, time-limited and renewable. It is not a guarantee of future conduct or results.

Provider commercial arrangements must never improve organic matching or ranking.

Provider identity remains hidden during initial comparison. Identity and direct contact information are revealed after the user chooses and books.

Only information needed to process a user request is shared, according to the user’s choice and the applicable privacy notice.

Company size must not improve rank. A solo provider can outrank an enterprise when the solo provider is the better match.

Every important provider claim must be associated with its evidence, verification status, reviewer, verification date and renewal date.

Confidential verification, personal identification and payment data must be separated from public and matching data.

## 2 Product roles and access

| **Role** | **Permitted access** |
|---|---|
| Applicant | Creates application, supplies information and documents, accepts required notices and agreements. |
| Verified Provider administrator | Maintains company, services, availability, support, billing and authorized users. |
| Provider team member | Access limited by assigned role; no automatic access to confidential verification or billing records. |
| CompliHub360 reviewer | Reviews applications, evidence, services and change requests; records decisions and limitations. |
| CompliHub360 administrator | Manages taxonomies, verification rules, suspensions, billing eligibility and audit records. |
| User before booking | Sees anonymous capability, fit, support, price-range and performance information. |
| User after booking | Sees the selected provider’s approved full profile and necessary contact information. |

## 3 Provider lifecycle and status model

| **Status** | **Meaning** | **Matchable** |
|---|---|---|
| Draft | Application started but not submitted. | No |
| Submitted | Application complete and awaiting initial review. | No |
| More information required | Evidence or clarification requested. | No |
| Under verification | Business, professional and capability checks in progress. | No |
| Approved pending activation | Verification approved; legal or billing activation remains. | No |
| Active Verified Provider | All activation conditions met. | Yes |
| Limited | Only approved services or jurisdictions remain active. | Partially |
| Reverification due | Renewal required; grace period controlled by risk level. | Configurable |
| Paused | Temporarily unavailable, overdue or under review. | No |
| Suspended | Material issue, investigation or failed obligation. | No |
| Terminated | Provider relationship ended. | No |

## 4 Provider application workflow

Invitation or approved application entry

Provider account and authorized representative verification

Legal entity and business identity submission

Professional licence and category-specific evidence

Capability Profile completion for every requested service

Markets, support, capacity, offices, online presence and reviews

Privacy and security disclosures

Billing profile and secure payment-method setup

Acceptance of the Provider Agreement, Provider Privacy Notice and billing authorization

CompliHub360 review, independent checks and resolution of discrepancies

Approval by service and jurisdiction

Activation and scheduled reverification

**Activation gate.** The system must block activation until all mandatory requirements applicable to that provider type, service category and jurisdiction are satisfied. Approval must be granular: a provider may be approved for one service and country but not another.

## 5 Verification framework

| **Layer** | **Required purpose** | **Examples** |
|---|---|---|
| Universal verification | Establish identity, legal existence, ownership, authority and contactability. | Registration, address, representative, tax status, good standing. |
| Professional verification | Confirm authority and qualifications for regulated or specialist work. | Licence, professional body, jurisdiction, restrictions, insurance. |
| Capability verification | Confirm the provider can deliver each declared service. | Service evidence, experience, team, regions, timelines, references. |
| Ongoing verification | Maintain reliability after activation. | Renewals, changes, performance, complaints, completed work. |

## 6 Identity and legal existence data

| **Field** | **Evidence or validation** | **Visibility** |
|---|---|---|
| Legal business name | Certificate of incorporation, registration extract or official registry. | Revealed profile; internal record. |
| Trading names | DBA or assumed-name registration where applicable. | Approved public name. |
| Entity type and registration number | Formation record and registry check. | Internal; selected profile as appropriate. |
| Registered and operating addresses | Registry record and appropriate address proof. | Country/city public; full address controlled. |
| Active status | Good-standing certificate or current registry confirmation where available. | Verification summary only. |
| Tax or VAT number | Official registration or qualified validation where required. | Private. |
| Authorized representative | Corporate authorization, officer confirmation or power of attorney. | Private except approved name/title. |
| Representative identity | Secure government-ID verification. | Strictly private. |
| Ownership and control | Beneficial-owner declaration and risk-based evidence. | Private. |
| Insurance | Current certificate, insured party, coverage type and validity. | Status summary only. |

## 7 Evidence-record requirements

Evidence type, issuing authority, identifier and covered entity or person

Document or registry source and secure file reference

Date received, date reviewed and reviewer

Result: received, reviewed, independently verified, rejected or expired

Services and jurisdictions supported by the evidence

Issue date, expiration date and next review date

Limitations, restrictions and reviewer notes

Change history and audit event

**Data minimization.** Where an authoritative registry check is sufficient, record the verification result and reference rather than retaining a full identity document indefinitely. Retention must follow the final Provider Privacy Notice and retention schedule.

## 8 Provider organization and operating footprint

### 8.1 Team size

**Internal collection.** Collect the exact total workforce count, service-delivery count, licensed-professional count and regular contractor count when needed for capacity assessment. Do not show individual employee lists or exact internal counts to users.

| **Public team-size band** | **Stored value** |
|---|---|
| Solo professional | 1 |
| 2 to 5 | 2–5 |
| 6 to 10 | 6–10 |
| 11 to 25 | 11–25 |
| 26 to 50 | 26–50 |
| 51 to 100 | 51–100 |
| 101 to 250 | 101–250 |
| 251 to 500 | 251–500 |
| More than 500 | 501+ |

### 8.2 Office and delivery locations

Headquarters, branch, representative office, remote delivery team, warehouse or service center

Full legal address, country, jurisdiction and time zone

Services delivered from the location and approximate team band

Associated registration, licence or authorization

Whether clients may visit

Whether the location belongs to the provider, an affiliate or a subcontractor

Whether user information is accessed, stored or processed from the location

Supported languages and operating hours

## 9 Website, social media and online reputation

| **Data group** | **Required information** |
|---|---|
| Website | Primary website, service pages, privacy notice, terms, complaints contact, security/privacy contact and supported-domain email. |
| Social media | All official LinkedIn, Facebook, Instagram, YouTube, X, TikTok, Threads, WeChat, WhatsApp Business and other regional accounts. |
| Professional profiles | Professional associations, regulatory directories, public licence records and recognized industry directories. |
| Review platforms | Platform URL, rating, review count, last checked date and any material explanation. |
| Control confirmation | Provider confirms each listed account is genuine, controlled by it and consistent with submitted qualifications and services. |

**Review safeguards.** Do not automatically treat provider-supplied reviews as verified. Prohibit fabricated, self-authored, undisclosed incentivized or misleadingly selected reviews. CompliHub360 reviews tied to recorded engagements should be distinguishable from external reviews.

## 10 Service Capability Profile

**Rule.** A provider must create a separate service record for every service it wants CompliHub360 to match. Selecting only a broad category is insufficient.

| **Field group** | **Required fields** |
|---|---|
| Classification | Main category, subcategory, service name, controlled service code, provider keywords, approved synonyms. |
| Scope | Detailed description, problems addressed, included deliverables, exclusions, prerequisites and required user documents. |
| Coverage | Countries, jurisdictions, customer locations, applicable schemes, laws or programs. |
| Customer fit | Business models, industries, product categories, marketplaces, channels, company sizes and ideal customer profile. |
| Commercial | Pricing model, price range, currency, minimum engagement, additional/pass-through costs, recurring or one-time basis. |
| Delivery | Response time, estimated completion, current availability, capacity, dependencies and deadline limitations. |
| Responsibility | Responsible role/team, required qualifications, supervising professional and use of subcontractors or affiliates. |
| Evidence | Relevant experience, case studies, references, licences, certifications and supporting documents. |

## 11 Service taxonomy and matching inputs

| **Approved area** | **Illustrative subcategory structure** |
|---|---|
| Tax and VAT | Registrations, returns, OSS/IOSS, fiscal representation, deregistration, transaction review, threshold monitoring. |
| EPR and Packaging | Packaging, WEEE, batteries, reporting, take-back, eco-fees, authorized representation. |
| Data and Privacy | Assessments, notices, RoPA, DPIA, DPAs, transfers, rights requests, breach support. |
| Marketing Compliance | Cookies, consent, email/SMS, advertising claims, influencer/affiliate disclosures, suppression processes. |
| Company Setup and Filings | Formation, qualification, annual filings, ownership filings, registered agent, restructuring, closure. |
| Product Compliance | GPSR, CE marking, testing, documentation, labeling, responsible person, recalls and product regimes. |
| Logistics and Customs | Customs registration, classification, declarations, broker services, import/export, 3PL, warehousing. |
| Legal Support | Jurisdiction- and practice-specific legal services delivered by appropriately authorized professionals. |

### 11.1 Keyword controls

Controlled taxonomy provides the primary matching structure.

Providers may propose keywords, abbreviations, local terms and common user phrases.

CompliHub360 reviews and maps provider terms to approved synonyms and service codes.

Unsupported keywords, keyword stuffing, competitor names and unverified jurisdiction claims are prohibited.

A keyword must not activate a service or jurisdiction that has not passed verification.

## 12 Client support and communication profile

| **Field** | **Implementation requirement** |
|---|---|
| Channels | Email, telephone, WhatsApp Business, WeChat, in-platform messaging, video, live chat, client portal, ticketing and other. |
| Channel availability | Before engagement, active-client only, included, paid add-on or urgent-only. |
| Hours | Available days, hours, time zone and holiday limitations. |
| Languages | Languages supported by channel and proficiency/availability. |
| Response commitment | Typical first response and, where offered, service-level commitment. |
| Escalation | Escalation method, dedicated account manager and urgent/deadline-sensitive support. |
| Document exchange | Portal, secure upload, email or other approved method. |

**Pre-booking display.** Show communication channel types, languages, support hours, typical response, account-management model, urgent-support availability and client-portal availability. Do not reveal phone numbers, email addresses, handles, external booking links or other identity-revealing details before booking.

## 13 Provider profile visibility model

| **Data class** | **Examples** | **Access** |
|---|---|---|
| Anonymous pre-booking | Specialty, markets, match percentage, priorities covered, support channels, response time, rating/review count, completed engagements, price range, timeline, team-size band and non-identifying credential summary. | Matched user before booking. |
| Revealed profile | Approved name, website, selected social links, full approved profile and necessary contact information. | User after selection and booking. |
| Internal matching | Service codes, keywords, exclusions, capacity, detailed coverage, performance measures and verification limitations. | Matching system and authorized staff. |
| Confidential verification | ID, ownership, tax evidence, full licences, insurance documents, reviewer notes and investigations. | Restricted authorized staff. |
| Billing | Payment-processor references, status, invoices, authorization and limited payment metadata. | Restricted billing/admin roles. |

## 14 Matching and ranking requirements

| **May influence matching** | **Must not improve organic ranking** |
|---|---|
| Verified expertise and service capability | Subscription tier |
| Country and jurisdiction coverage | Booking, lead or affiliate fees |
| Qualifications and licensing | Advertising spend |
| Availability and capacity | Company size or employee count |
| Response time and support preference | Brand recognition or awards |
| Price range and timeline fit | Payment method type |
| Business model, industry and product fit | Commercial relationship with CompliHub360 |
| Verified feedback and completed engagements | Purchase of separate promotional placements |
| Complaint, cancellation and no-show history | Unverified testimonials |

**Explainability.** For every match result, retain the provider fields and user inputs that supported the result. The interface should explain fit in plain language without revealing proprietary weights or enabling manipulation.

## 15 Anonymous match card

Specialty and technical expertise

Countries and markets covered

Match percentage and plain-language fit explanation

Relevant user priorities covered

Typical response time

Support channels and languages

Support hours/time-zone compatibility

Rating and review count with review-source distinction

Completed CompliHub360 engagements

Expected price range and currency

Estimated service timeline

Team-size band

Non-identifying verification and credential summary

Availability status

Add to Selection and Book a Consultation actions

**Identity protection.** Do not show names, logos, exact award names, certificate links, social handles, direct contact details, unique wording or other information that reasonably reveals identity before booking.

## 16 Provider dashboard modules

| **Module** | **Core functions** |
|---|---|
| Home | Verification status, tasks, profile completeness, change alerts, expiring evidence, availability and billing status. |
| Company Profile | Legal and public profile, team-size band, offices, online presence and authorized users. |
| Verification Center | Required evidence, status, requests, expiry dates, reverification and decision history. |
| Services | Create, edit, pause and retire service records; show verification and match eligibility by service/jurisdiction. |
| Coverage and Capacity | Markets, jurisdictions, availability, workload, delivery regions and processing locations. |
| Support Profile | Channels, languages, hours, response commitments, escalation and portal information. |
| Matches and Bookings | Consultation requests, confirmations, schedules, dossiers, status and outcomes. |
| Performance | Confirmation rate, reply rate, response time, no-shows, completion, match quality, reviews and complaints. |
| Reviews | Verified platform reviews, external sources, responses, disputes and moderation status. |
| Billing | Plan, payment-method status, invoices, charges, credits, tax details and billing authorizations. |
| Legal and Privacy | Accepted agreement versions, Provider Privacy Notice, consents, notices and downloadable records. |
| Changes | Submit material changes, view approval status, effective date and impact on active users. |

## 17 Performance dashboard and quality loop

Consultation confirmation rate

Reply rate and median first-response time

Response commitment breaches

Consultation attendance and no-show rate

Cancellation rate and reasons

Completed engagements recorded through CompliHub360

User assessment of whether help was received

Expertise match accuracy

Responsiveness and timeline performance

Would-use-again response

Complaint and dispute status

Reverification and profile-completeness status

**Naming.** Do not use Trust Score as the default label. Use a service- or quality-oriented label that reflects measurable performance. Trust must be demonstrated through experience, not presented as a self-declared score.

**Fairness.** Do not penalize providers for metrics until there is sufficient, reliable data. Preserve source, calculation period, sample size, exclusions, corrections and appeal history for material performance measures.

## 18 Change notification and approval

| **Deadline** | **Change examples** | **System action** |
|---|---|---|
| Immediate and no later than 24 hours | Licence suspension/restriction, loss of authority, material insurance loss, security incident affecting users, insolvency/closure, inability to honor a booking, serious integrity concern or account compromise. | Pause affected services or bookings and alert authorized reviewers. |
| Within 3 business days | Ownership/control, legal name, address, responsible professional, material capacity, jurisdictions, services, subcontractors, support, pricing, timelines, websites, official social accounts, privacy/security practices or billing details. | Create change record; assess whether approval or reverification is required. |
| Before effective date where planned | Pricing, scope, exclusions, delivery time, coverage, subcontracting and cancellation terms. | Do not publish or apply until submitted and, where required, approved. |

## 19 New and removed services

**New service.** Create it in Pending Verification status. Require capability, licence, jurisdiction, pricing, description, keyword and evidence review. It must not be matchable until approved.

**Removed service.** Stop new matches immediately when the provider can no longer deliver it. Preserve existing commitments, inform affected users, apply the continuity process and obtain fresh user approval before sharing information with an alternative provider.

## 20 Pricing accuracy and user protection

New pricing applies prospectively after submission and any required approval.

At booking, retain a snapshot of the displayed price/range, currency, pricing basis, included items and applicable terms.

If a displayed amount is an estimate, the provider may issue a final quote after review, but must explain material differences before the user agrees.

After the user accepts an engagement, changes require a user scope change, genuinely new facts or express agreement.

When a provider failed to report a pricing change, the workflow must support honoring the lower displayed/confirmed price where applicable, cancellation without penalty, refund/credit and allocation of resulting costs.

The final legal agreement must define enforceable remedies and jurisdiction/profession-specific limitations.

## 21 Payment and billing implementation

**Security rule.** Complete card or bank credentials must be entered and retained by the approved payment processor, not stored directly in the CompliHub360 application database.

| **Billing field or control** | **Requirement** |
|---|---|
| Billing identity | Legal billing name, address, contracting entity, tax/VAT number, business-status evidence and billing contact. |
| Plan | Subscription selection, monthly/annual term, currency and effective dates. |
| Processor record | Customer and payment-method reference, status, type, last four digits where returned, expiration and mandate status. |
| Authorization | Recorded authorization for recurring subscription and applicable booking/lead or affiliate charges. |
| Tax and invoicing | Tax treatment, invoice email, invoice history, credits, refunds and required evidence. |
| Legal record | Commercial-terms version, acceptance actor, timestamp and language. |
| Eligibility | Configurable by profession, country, provider category, plan and fee type. |

### 21.1 Billing readiness gate

Block chargeable booking eligibility when: No valid payment method or mandate

Block chargeable booking eligibility when: Incomplete billing or tax information

Block chargeable booking eligibility when: Inactive subscription where required

Block chargeable booking eligibility when: Withdrawn payment authorization

Block chargeable booking eligibility when: Overdue invoice beyond the configured cure period

Block chargeable booking eligibility when: Provider account pause or suspension

**Legal configuration.** Do not hard-code one fee model for every profession or country. Lead, booking, referral and affiliate charges must remain configurable and disabled where counsel has not approved them, particularly for regulated professions.

## 22 Provider privacy and information protection

| **Requirement** | **Implementation** |
|---|---|
| Separate Provider Privacy Notice | Present during onboarding and keep accessible in the provider dashboard. |
| Purpose limitation | Identify why each data category is collected and which functions use it. |
| Visibility control | Tag every field as public, anonymous, revealed, internal, confidential verification or billing. |
| Least-privilege access | Restrict IDs, ownership, tax, insurance, investigations and billing to authorized roles. |
| Retention | Apply category-specific periods, deletion/anonymization triggers and legal holds. |
| International access | Record countries/locations from which provider or subcontractor teams access user data. |
| Rights and correction | Provide a route for access, correction and other applicable privacy requests. |
| Security and incidents | Log access and changes; provide secure upload and incident escalation. |

## 23 Agreement acceptance and audit trail

Provider Agreement version, language and effective date

Provider Privacy Notice version and presentation date

Billing authorization and commercial terms version

Authorized representative identity and authority

Acceptance timestamp, account and technical audit reference

Accuracy and continuing-update declaration

Consent or authorization for registry and third-party verification

Reacceptance event when material terms change

## 24 Enforcement and appeal workflow

| **Action** | **Use** |
|---|---|
| Correction request | Minor or remediable inaccuracy with a stated deadline. |
| Profile limitation | Hide an affected field, service, country or claim. |
| Booking pause | Prevent new users from selecting the provider while an issue is resolved. |
| Reverification | Require new evidence or independent checking. |
| Verified status removal | Verification conditions no longer satisfied. |
| User remedy | Support cancellation, alternative match, refund, credit or price protection as applicable. |
| Suspension | Material non-compliance, investigation, repeated inaccuracies or overdue obligations. |
| Termination | Fraud, fabricated credentials, serious licensing breach, misuse of user data or persistent non-compliance. |

**Appeal.** Provide a documented correction and appeal route, except that urgent user-protection measures may take effect immediately. Record reasons, evidence, decision maker, dates, scope and outcome.

## 25 Administrative review workspace

Queue by application, service, jurisdiction, risk level, expiry and change type

Side-by-side declaration, evidence and authoritative registry result

Granular approve, reject, limit, request-information and pause actions

Four-eye review option for regulated or higher-risk categories

Conflict/discrepancy flags and internal notes

Document expiry and reverification calendar

Service/jurisdiction approval matrix

Provider communication log and standardized request templates

Complaint, investigation and appeal record

Immutable audit log for material decisions and field changes

## 26 Notifications

| **Recipient** | **Required notifications** |
|---|---|
| Provider | Submission receipt, missing evidence, approval/limitation, expiring documents, change status, booking eligibility, billing failure, complaint action, suspension and appeal outcome. |
| CompliHub360 team | New submission, high-risk change, expiry, discrepancy, security/licensing event, overdue response, billing block and appeal. |
| Affected user | Material booking/service change, provider inability to perform, approved alternative process, cancellation/refund options and required consent. |

## 27 Minimum data-validation rules

Require business-domain email unless an approved exception applies.

Validate URL format and prevent duplicate official profiles.

Require country and jurisdiction for every regulated service.

Require currency and pricing basis whenever a price range is provided.

Prevent end dates earlier than start dates and alert before evidence expiration.

Require evidence for every displayed credential and licence claim.

Prevent unsupported service keywords from becoming matching inputs.

Prevent publication of identity-revealing fields in anonymous profiles.

Prevent activation when mandatory legal acceptance or billing readiness is missing.

Retain before-and-after values for material changes.

## 28 Acceptance criteria

| **Test area** | **Pass condition** |
|---|---|
| Granular approval | A reviewer can approve one service/jurisdiction and reject or hold another without activating the entire provider. |
| Evidence traceability | Every verified claim can be traced to evidence, reviewer, status, date and renewal requirement. |
| Anonymous view | No identifying link, handle, logo, contact detail or unique credential reference appears before booking. |
| Matching completeness | A provider cannot appear for a service, market or jurisdiction that is not approved and active. |
| Commercial neutrality | Changing subscription or payment status never directly increases organic match score or position. |
| Support matching | The system can match user preferences for language, channel, time zone, urgency and response expectation. |
| Change control | Material changes create an auditable request and trigger appropriate approval, pause or user-impact workflow. |
| Pricing snapshot | The system preserves the price/range and relevant terms shown when the user books. |
| Billing security | The application stores processor references and limited metadata, not full payment credentials. |
| Privacy separation | Access controls distinguish public, anonymous, internal, confidential verification and billing data. |
| Reverification | Expiring or changed evidence can automatically trigger reminders, review and configured limitations. |
| User consent | No alternative provider receives user information without a new user approval. |

## 29 Implementation priorities

| **Priority** | **Build scope** |
|---|---|
| P0 Foundation | Provider data model, roles, statuses, service taxonomy, visibility classes, verification evidence, secure uploads and audit log. |
| P0 Activation | Application flow, legal acceptance, granular review, billing readiness and activation gate. |
| P1 Matching | Capability Profile, controlled keywords, anonymous cards, support preferences and explainable match inputs. |
| P1 Operations | Provider dashboard, change requests, expiry reminders, availability, booking and performance data. |
| P1 Administration | Review queues, decisions, limitations, suspensions, complaints and appeals. |
| P2 Maturity | Advanced performance normalization, richer review verification, automated registry integrations and trend reporting. |

## 30 Legal and policy dependencies

**This is an implementation specification, not final contractual language.** The platform must support the following legal documents and controls so the final legal terms can be implemented accurately:

Provider Agreement covering eligibility, evidence, accuracy, update duties, performance, fees, data use, suspension and termination.

Provider Privacy Notice covering provider and representative information, verification, public display, matching, billing, monitoring, retention, sharing, transfers, security and rights.

Billing and automatic-payment authorization appropriate to the approved commercial model.

Category- and jurisdiction-specific professional-fee rules before enabling lead, booking, referral or affiliate charges.

Data-sharing and booking consent identifying what user information is shared and when.

Retention schedule, access-control policy, incident process and verification-review procedure.

## 31 Decisions reserved for the onboarding dossier

Final question wording and provider-facing instructions

Category-specific document checklists and questionnaires

Declarations, signatures and formal attestations

Final Provider Agreement and Privacy Notice text

Approved payment-authorization forms

Operational reviewer scripts and provider communications

**Next deliverable.** After this platform specification is implemented or technically mapped, create the full Provider Onboarding Dossier using the same fields, evidence rules, legal commitments and privacy classifications. The dossier must not introduce requirements the platform cannot securely collect, review, update and audit.
