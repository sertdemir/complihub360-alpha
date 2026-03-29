# **CompliHub360 — User Flows (Complete)**

Version: 1.0

Status: UX \+ Orchestrator Alignment Draft

Audience: Product, UX, Engineering, QA

---

# **0\. Flow Map (Navigation Overview)**

Primary entry: Landing → Country → Search (optional Wizard) → Results → Provider Engagement → Confirmation → (Optional Dashboard)

Key principle:

* Wizard is optional.  
* Provider grid is always visible (fast path).  
* Edit/intelligent features are gated behind Dashboard/Registration.

---

# **1\. User Personas (Functional)**

## **1.1 Fast Path User**

Wants:

* quick provider access  
* minimal steps

## **1.2 Guided User**

Wants:

* wizard-driven clarity  
* risk-based recommendations

## **1.3 Research User**

Wants:

* laws \+ tutorials \+ articles  
* exportable report

## **1.4 Returning User (Registered)**

Wants:

* history  
* monitoring  
* editable dossiers

---

# **2\. Flow 1 — First Entry / Landing Flow**

## **2.1 Goal**

Capture country context and user intent with minimal friction.

## **2.2 Steps**

### **Step 1 — Landing Load**

UI:

* Country selector (required)  
* Search bar (above the fold)  
* Category tonic cards (optional quick start)  
* Trending searches / templates (optional)

Events:

* page\_viewed  
* country\_selector\_viewed

### **Step 2 — Country Selected**

UI:

* Search becomes “country-contextualized”  
* Wizard adapts to selected country

Events:

* country\_selected

### **Step 3 — User Chooses Path**

A) Search directly

B) Wizard (optional)

Events:

* search\_focus  
* wizard\_entry\_clicked

Decision rules:

* Default stays on landing context  
* No forced registration

---

# **3\. Flow 2 — Search (Direct) → Results**

## **3.1 Goal**

Return useful results without wizard usage.

## **3.2 Steps**

### **Step 1 — Search Submit**

User enters free text.

Events:

* search\_submitted

Payload:

* query  
* country  
* timestamp

### **Step 2 — Results Render (Tabbed)**

Results page (dedicated page) loads.

UI Layout:

* Left sidebar: filters \+ query summary  
* Main: tabbed results (Providers / Laws / Tutorials / Articles / Tips)  
* Right sidebar: Providers (prominent)

Events:

* results\_rendered

---

# **4\. Flow 3 — Wizard (Guided Search) → Results**

## **4.1 Goal**

Increase precision via 4–5 user answers (Booking/Skyscanner pattern).

## **4.2 Wizard Model**

Wizard is country-adaptive.

Wizard outputs:

* structured query  
* category selection  
* constraints (marketplace, product type, risk factors)

## **4.3 Wizard Screens**

### **Screen 0 — Country Selection**

Required.

### **Screen 1 — Category Selection**

User chooses 1+ categories via cards.

Examples:

* Tax & VAT  
* Product & Packaging  
* Data & Privacy  
* Marketing & SEO  
* Corporate & Structure  
* Full Support

Events:

* wizard\_category\_selected

### **Screen 2 — Step 1 (Intent Clarifier)**

Ask first high-signal question.

Example pattern:

* “What are you trying to achieve?” (register, expand, fix issue)

Events:

* wizard\_step\_completed

### **Screen 3 — Step 2 (Business Context)**

Ask:

* business type  
* marketplace use  
* industry

### **Screen 4 — Step 3 (Risk/Complexity)**

Ask:

* markets involved  
* claims/tracking  
* packaging type

### **Screen 5 — Step 4 (Review & Run)**

Dedicated review page.

UI:

* summary of answers  
* “Run Search” CTA  
* link: “Edit answers”

Events:

* wizard\_review\_viewed  
* wizard\_run\_clicked

NOTE (Monetization / Registration strategy):

* “Edit answers” does NOT unlock contact details.  
* “Edit answers” can be used as a registration driver:  
  * Guest can export PDF  
  * Registered can edit & save

---

# **5\. Results Page — Unified Model (All Use Cases)**

## **5.1 Dedicated Page Requirement**

Results are shown on a dedicated results page to support:

* sharable URLs  
* SEO indexing for long-tail  
* stable components  
* future dashboard linking

## **5.2 Layout Structure**

### **Left Sidebar (Context \+ Filters)**

Purpose: refine results without re-running wizard.

Contains:

* Query summary (country, category, key answers)  
* Filters (see section 5.4)  
* CTA: “Refine with Wizard” (returns into wizard context)

### **Main Content (Tabs)**

Tabs:

1. Overview (AI-grounded summary \+ recommended next steps)  
2. Providers  
3. Laws & Official Sources  
4. Tutorials (YouTube etc.)  
5. Articles & Guides  
6. Tips & Checklist

Rules:

* Every non-provider item must include a source link.  
* AI only summarizes/structures; no invented claims.

### **Right Sidebar (Providers)**

Purpose:

* monetize  
* keep providers always visible

Contains:

* Top partner providers  
* Card with Primary/Secondary CTA

---

## **5.3 Provider Cards (Partner vs Non-Partner)**

### **Partner Provider Card**

* Primary CTA: “Request consultation” (modal)  
* Secondary CTA: “Visit website” (affiliate)  
* Badge: Partner

### **Non-Partner Provider Card**

* Secondary CTA only  
* No Primary CTA

Events:

* provider\_card\_viewed  
* secondary\_clicked  
* primary\_clicked (MAIN KPI)

---

## **5.4 Filter Model (Left Sidebar)**

Filters must be deterministic and map to provider index fields.

Recommended v1 filters:

1. Market coverage  
* Country  
* Multi-country support  
2. Service scope  
* Registration  
* Filing  
* Audit  
* Ongoing compliance  
3. Business type supported  
* E-commerce  
* SaaS  
* Agency  
* Manufacturer  
4. Pricing model (if available)  
* fixed  
* hourly  
* subscription  
5. Provider type  
* law firm  
* consultancy  
* software  
6. Language  
* EN / DE / ES / TR

Sort options:

* Partner first  
* Best match  
* Fast response (if monitored)  
* Rating (future)

---

# **6\. Primary CTA Flow (Engagement Request)**

## **6.1 Trigger**

User clicks Primary CTA on a Partner provider card.

Event:

* primary\_clicked

## **6.2 Modal Steps**

### **Modal Step 1 — Minimal Form**

Fields:

* Message (required)  
* Email (required only if not registered)  
* Consent checkbox (privacy)

CTA:

* “Send request”

### **Modal Step 2 — Optional Enrichment**

Fields (optional):

* budget range  
* timeline  
* company size

CTA:

* “Send request”

### **Modal Step 3 — Confirmation**

UI:

* success state  
* “Provider will respond within 24–48h”  
* “Track in dashboard” (registration CTA)

Events:

* primary\_request\_submitted

---

# **7\. Secondary CTA Flow (Affiliate)**

## **7.1 Trigger**

User clicks Secondary CTA.

Behavior:

* open in new tab  
* add affiliate tracking params

Events:

* secondary\_clicked

No gating.

---

# **8\. Registration & Dashboard Gating**

## **8.1 When Registration Is Proposed**

1. After request confirmation (Track in dashboard)  
2. When user wants to edit wizard answers (dashboard only)  
3. When user wants to save results

## **8.2 Guest Capabilities**

* run wizard / search  
* see results tabs  
* use secondary CTA  
* use primary CTA (limited or unlimited depending on monetization rules)  
* export PDF report

## **8.3 Registered Capabilities**

* save searches  
* edit wizard answers  
* view request history  
* status tracking  
* monitoring alerts (future)

---

# **9\. PDF Export Flow (Guest Allowed)**

Trigger:

* “Export PDF” button on results overview.

Behavior:

* generate PDF snapshot  
* remove PII  
* include sources list  
* include provider cards (no contact details)

Events:

* pdf\_export\_clicked  
* pdf\_exported

Upsell:

* “Save to dashboard” registration CTA

---

# **10\. Monitoring & Status Flow (User)**

## **10.1 After Primary Request**

User sees status:

* sent  
* viewed  
* confirmed  
* replied

If no action within SLA:

* system sends reminder to provider  
* user sees “awaiting provider response”

Events:

* provider\_confirmed  
* provider\_replied  
* sla\_breached

---

# **11\. Error & Edge Case Flows**

## **11.1 No Results**

UI:

* suggest broaden filters  
* show fallback providers  
* show educational resources  
* recommend Full Support category

Events:

* results\_empty

## **11.2 Provider Not Responding**

UI:

* show SLA notice  
* suggest alternative partner providers  
* allow resend / re-route

Events:

* provider\_no\_response

## **11.3 Country Change**

If user changes country after wizard:

* clear wizard answers  
* prompt confirmation

Events:

* country\_changed

---

# **12\. KPI Mapping (User)**

Primary KPI:

* primary\_clicked

Secondary KPIs:

* search\_submitted  
* wizard\_run\_clicked  
* results\_rendered  
* secondary\_clicked  
* primary\_request\_submitted  
* provider\_confirmed  
* pdf\_exported  
* registration\_completed

---

# **13\. Open Decisions (For Finalization)**

1. Limit primary CTA per guest?  
2. Provider ranking rules (partner-first vs best-match)  
3. Which tabs are default visible vs collapsed?  
4. Registration moment: strongest conversion trigger?

---

# **14\. Summary**

This document defines all user journeys required to implement CompliHub360 v1:

* direct search flow  
* wizard flow  
* unified results page  
* provider engagement funnel  
* registration gating  
* PDF export  
* monitoring status lifecycle

It is suitable as a build blueprint for Stitch screen generation and engineering implementation.