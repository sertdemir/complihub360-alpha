# **CompliHub360 — Product Overview & System Architecture**

Version: 1.0

Status: Infrastructure Ready \+ Governance Implemented

Audience: Product Leadership, Engineering, Security/Compliance, Investors (technical appendix)

---

# **1\. System Overview**

CompliHub360 is an Orchestrator Platform that turns unstructured compliance needs into:

* structured problem definitions  
* grounded information bundles (laws, guidance, tutorials)  
* ranked provider options  
* controlled engagement workflows  
* monitoring and auditability

The platform is designed to minimize data leakage and maximize engagement conversion through a controlled workflow.

---

# **2\. Core User Concept**

## **2.1 Primary Use Case**

A user arrives, selects a country context, enters a compliance-related need (via search and/or wizard), receives results, and engages providers through the platform.

Results include:

* Providers (partners/non-partners)  
* Grounded information (legal texts, articles, tutorials)  
* Action recommendations

Monetization is driven primarily through the **Primary CTA** (lead/engagement request).

---

# **3\. High-Level Architecture**

CompliHub360 is composed of 5 layers:

1. Experience Layer (UI)  
2. Orchestration Layer (Request lifecycle)  
3. Intelligence Layer (Grounded retrieval \+ ranking)  
4. Governance Layer (Policy, safety, privacy)  
5. Automation Runtime (n8n \+ monitoring)

---

# **4\. Experience Layer (UI)**

## **4.1 Screens**

* Landing (Country selection \+ Search \+ Optional category selection)  
* Wizard (Context sharpening, 4–5 steps)  
* Results (Tabbed results view; providers prominent on right sidebar)  
* Primary CTA Modal (engagement request)  
* Confirmation / Status view  
* Dashboard (registered users only)

## **4.2 Interaction Model**

* Results are displayed tab-based.  
* The wizard is optional; the provider grid remains visible to support fast users.  
* Editing and advanced functions are available only in the dashboard.

---

# **5\. Orchestration Layer (Engagement Lifecycle)**

## **5.1 Entities**

* User  
* Provider  
* Engagement Request  
* Provider Response  
* Proposal (optional)  
* Status / SLA tracker

## **5.2 Key Statuses**

EngagementRequest:

* created  
* delivered\_to\_provider  
* viewed  
* provider\_confirmed  
* provider\_replied  
* expired

This status model enables:

* monitoring & reminders  
* audit trail  
* conversion measurement

---

# **6\. Intelligence Layer (Grounded Retrieval & Ranking)**

The system provides grounded results by combining:

* curated provider index (sheets → database)  
* retrieval of public sources (laws, articles, tutorials)  
* ranking based on country \+ category \+ user inputs

Principles:

* No hallucinated legal claims  
* Every information item must include a source link  
* AI output is summarization \+ structure, not invention

---

# **7\. Governance Layer**

Governance is enforced through:

* Always-on rules  
* Agent role separation  
* Policy Guard (dependency \+ safety \+ scope)  
* Architecture Guardian (consistency)  
* QA Sentinel (gates)

Key governance goals:

* avoid scope drift  
* prevent dependency bloat  
* enforce privacy policy and AI gating

---

# **8\. Privacy Architecture (Deterministic)**

## **8.1 Privacy Zones**

* Raw Vault (restricted)  
* Redaction Service (deterministic)  
* Sanitized Vault (AI eligible)  
* AI Gate (policy map)

## **8.2 Country Policy Matrix**

Supported v1:

* DE  
* EU  
* UK  
* US  
* CA  
* AU  
* ROW

Defaults are conservative.

AI processing is only allowed when:

* sanitizedReady \= true  
* consentFlags.allowAI \= true  
* classification \!= high  
* docType not restricted (health/employee/id)

---

# **9\. Automation Runtime (n8n)**

n8n executes deterministic workflows:

* upload gate  
* redaction pipeline  
* AI gate  
* SLA watchdog  
* reminders  
* retention enforcement

Antigravity manages repo \+ design-time governance and generates automation blueprints, but does not perform runtime scheduling.

---

# **10\. Monorepo Structure (Conceptual)**

The repository is structured to separate:

* UI packages  
* services (API \+ redaction)  
* governance policies  
* automation blueprints  
* documentation

This enables:

* scaling modules independently  
* enforcing constraints through CI  
* multi-app templating in future (optional)

---

# **11\. Observability & KPI Tracking**

Key KPI:

* primary\_clicked (main KPI)

Supporting KPIs:

* search\_submitted  
* results\_rendered  
* secondary\_clicked  
* primary\_request\_submitted  
* provider\_confirmed

Tracking is designed to be deterministic.

---

# **12\. Production Readiness Criteria**

The system is considered architecture-ready when:

* repo builds and runs locally  
* CI gates pass  
* governance rules are active  
* automation runtime is validated

Product readiness for feature development begins once:

* wizard \+ unified results page design are finalized  
* API contract for engagement lifecycle is locked

---

# **13\. Implementation Priorities**

1. Wizard implementation in Stitch  
2. Unified tab-based results page components  
3. Engagement request lifecycle  
4. Provider confirmation \+ SLA monitoring  
5. Dashboard (registered features)

---

# **14\. Summary**

CompliHub360 is architected as a policy-governed orchestration platform with deterministic privacy controls.

The system is optimized for:

* grounded information delivery  
* controlled provider engagement  
* monetization via primary CTA  
* scale via modular layers and automation runtime.