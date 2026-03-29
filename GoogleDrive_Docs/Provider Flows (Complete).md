# **CompliHub360 — Provider Flows (Complete)**

Version: 1.0

Status: Marketplace \+ Orchestrator Alignment Draft

Audience: Marketplace Ops, Engineering, QA, Compliance

---

# **0\. Provider Role Model**

CompliHub360 distinguishes providers by commercial and capability state.

## **0.1 Provider Types**

1. Partner Provider  
* appears in results  
* has Primary CTA enabled (engagement request)  
* pays lead/engagement fees  
2. Non-Partner Provider  
* appears in results  
* has Secondary CTA only (affiliate website visit)  
* no Primary CTA (to protect revenue model)  
3. Suspended / Downgraded Provider  
* previously partner but downgraded due to inactivity, SLA breaches, policy issues  
* treated as non-partner or removed depending on severity

---

# **1\. Provider Data Lifecycle (Index → Platform)**

## **1.1 Source of Truth**

Initial provider index is sourced from:

* country-specific Sheets (one per country)

Fields (minimum v1):

* provider\_key (global unique)  
* name  
* website\_url  
* countries\_supported  
* languages  
* categories  
* provider\_type  
* partner\_status  
* fee\_model

## **1.2 Import Pipeline**

Steps:

1. sheet\_ingested  
2. normalized  
3. deduplicated by provider\_key  
4. written to provider database

Events:

* provider\_index\_import\_started  
* provider\_index\_import\_completed  
* provider\_index\_import\_failed

---

# **2\. Provider Onboarding (Partner)**

Goal:

Enable a provider to accept engagement requests without maintaining a calendar.

## **2.1 Onboarding Entry**

Trigger:

* internal admin invites provider  
* provider applies

Artifacts:

* provider profile  
* partner contract metadata  
* billing setup placeholder

Events:

* provider\_invited  
* provider\_application\_received

## **2.2 Onboarding Steps**

### **Step 1 — Verify Identity & Contact**

* verify business email  
* designate response inbox

### **Step 2 — Define Service Coverage**

* countries  
* languages  
* categories  
* response SLA target

### **Step 3 — Partner Status Activation**

* partner\_status \= active  
* Primary CTA enabled

Events:

* provider\_onboarding\_completed

---

# **3\. Engagement Request Handling (Primary CTA)**

## **3.1 Trigger**

User clicks Primary CTA.

System creates:

* EngagementRequest record

System sends:

* email to provider inbox  
* provider magic link

Events:

* engagement\_created  
* engagement\_delivered\_to\_provider

---

# **4\. Magic Link Provider Flow (No Calendar Required)**

Goal:

Provider can confirm and respond in 1–2 clicks.

## **4.1 Magic Link Email**

Contains:

* request summary  
* secure magic link  
* SLA expectation

## **4.2 Magic Link Landing (Provider)**

Provider sees:

* requester message  
* country \+ category context  
* structured answers (if wizard used)

Actions:

A) Confirm receipt

B) Reply to user

C) Decline request

Events:

* provider\_magiclink\_opened

### **Action A — Confirm Receipt**

* sets status \= provider\_confirmed  
* logs timestamp

Events:

* provider\_confirmed

### **Action B — Reply**

Provider writes:

* response message  
  Optional:  
* attach proposal (pdf)  
* ask for missing info

System sends reply to user.

Events:

* provider\_replied

### **Action C — Decline**

Provider selects reason:

* out of scope  
* capacity  
* incorrect country

System:

* marks request declined  
* suggests alternative providers to user

Events:

* provider\_declined

---

# **5\. Provider Proposal Flow (Optional)**

Goal:

Enable structured comparison later.

Provider can submit:

* price range  
* timeline  
* deliverables  
* engagement model  
* attachment

System stores:

* proposal metadata

Events:

* proposal\_submitted

---

# **6\. SLA & Monitoring (Watchdog)**

CompliHub360 monitors provider behavior.

## **6.1 SLA Timers**

Default v1:

* confirm within 24h  
* reply within 48h

States:

* awaiting\_confirmation  
* awaiting\_reply

Events:

* sla\_timer\_started

## **6.2 Reminder Policy**

If not confirmed in 24h:

* reminder email 1

If still not confirmed in 36h:

* reminder email 2

If no action after 48h:

* mark SLA breach

Events:

* provider\_reminded  
* sla\_breached

---

# **7\. Partner Governance & Downgrade Flow**

Goal:

Protect user experience and revenue reliability.

## **7.1 Downgrade Triggers**

A provider is flagged if:

* repeated SLA breaches  
* low response rate  
* policy violations  
* stale contact (bounces)

Events:

* provider\_flagged

## **7.2 Pre-Downgrade Notification**

Requirement (user decision):

* partner must be informed before downgrade

Flow:

1. notify provider (warning)  
2. grace period window  
3. if no reaction → downgrade  
4. notify provider about downgrade

Events:

* provider\_downgrade\_warning\_sent  
* provider\_downgraded

## **7.3 Downgrade Result**

* partner\_status becomes inactive  
* Primary CTA disabled  
* provider treated as non-partner (secondary only)

---

# **8\. Provider Visibility & Ranking Rules**

Ranking strategy must balance:

* monetization (partners)  
* user satisfaction (relevance)

Recommended v1 logic:

1. Eligibility filter  
* match country \+ category  
2. Partner boost  
* partner providers appear first within relevant set  
3. Quality adjustment (future)  
* response rate  
* SLA performance

Events:

* provider\_ranked

---

# **9\. Provider Portal / Dashboard (Future)**

In v1, providers do not need full portal.

Future portal features:

* engagement inbox  
* analytics  
* billing  
* profile editing

---

# **10\. Provider Privacy & Compliance**

Provider interactions are limited to:

* request message  
* sanitized context

No PII beyond what user explicitly shares.

Attachments require redaction pipeline before AI use.

Events:

* provider\_attachment\_uploaded  
* attachment\_redaction\_completed

---

# **11\. Error & Edge Cases**

## **11.1 Magic Link Expired**

* provider requests new link  
* system reissues

Events:

* provider\_magiclink\_expired

## **11.2 Provider Email Bounce**

* mark provider contact invalid  
* pause provider visibility

Events:

* provider\_email\_bounced

## **11.3 Provider Replies Outside Platform**

Risk:

* leakage

Mitigation:

* do not expose direct contact details  
* provide only controlled reply channel

---

# **12\. KPI Mapping (Provider)**

Core provider KPIs:

* confirm\_rate  
* reply\_rate  
* avg\_confirm\_time  
* avg\_reply\_time  
* sla\_breach\_rate

Marketplace KPIs:

* partner\_conversion\_rate  
* revenue\_per\_engagement

---

# **13\. Summary**

This document defines provider-side flows required for CompliHub360 v1:

* onboarding (partner activation)  
* engagement handling via magic link  
* response and proposal handling  
* deterministic SLA monitoring  
* partner governance and downgrade automation

It supports the orchestrator revenue model by:

* restricting contact leakage  
* gating primary CTA to partners  
* monitoring provider performance for reliability.