# **CompliHub360 — Agent Army Flows (Antigravity \+ n8n)**

Version: 1.0

Status: Orchestrator Architecture Definition

Audience: Engineering, Automation, AI Governance

---

# **0\. Philosophy**

CompliHub360 operates with a dual-layer automation strategy:

Layer A — Antigravity (Design-Time \+ Code Governance \+ Structural Orchestration)

Layer B — n8n (Runtime Deterministic Automation \+ Monitoring \+ SLA \+ Privacy Enforcement)

Principle:

* Creative / structural tasks → Antigravity Agents  
* Deterministic, time-based, compliance-critical tasks → n8n

No overlap in responsibility.

---

# **1\. Agent Architecture (Antigravity)**

Antigravity functions as the design-time orchestrator.

Primary Entry Point:

Task-Orchestrator

All prompts from product/strategy are routed here.

---

# **2\. Agent Roster & Responsibilities**

## **2.1 Task-Orchestrator**

Role:

* Entry point  
* Decomposes tasks  
* Assigns to agents  
* Ensures sequence integrity

Triggers:

* New feature request  
* Refactor request  
* Bug fix  
* Governance update

Output:

* Structured task breakdown  
* Agent dispatch plan

---

## **2.2 Repo-Engineer**

Role:

* Monorepo structure  
* Type safety  
* Dependency control  
* Service wiring

Guardrails:

* No uncontrolled dependencies  
* No architecture drift

---

## **2.3 UI-Builder**

Role:

* Stitch screen definitions  
* Component consistency  
* Design system adherence

---

## **2.4 Design-Architect**

Role:

* Layout system logic  
* Component reuse enforcement  
* Cross-screen coherence

---

## **2.5 Architecture Guardian**

Role:

* Prevent system drift  
* Validate contract integrity  
* Protect layered architecture

---

## **2.6 Policy Guard**

Role:

* Privacy constraints  
* AI gating enforcement  
* Dependency validation  
* Scope policing

---

## **2.7 QA Sentinel**

Role:

* Typecheck  
* Build verification  
* Gate enforcement  
* CI alignment

---

## **2.8 Design-Policy-Governor**

Role:

* CI consistency  
* Branding consistency  
* UX enforcement

---

# **3\. Antigravity Workflows**

## **3.1 /dispatch**

Purpose:

Route request through Task-Orchestrator.

Flow:

1. Interpret request  
2. Identify impacted layers  
3. Assign agents  
4. Define execution order

---

## **3.2 /fix-loop**

Purpose:

Resolve build/type failures.

Flow:

1. QA Sentinel detects failure  
2. Repo-Engineer patches  
3. Architecture Guardian verifies  
4. QA Sentinel re-runs gates

---

## **3.3 /verify-ci**

Purpose:

Ensure CI consistency.

Checks:

* Node version  
* Typecheck  
* Build  
* Test

---

## **3.4 /release**

Purpose:

Validate production readiness.

Steps:

* Run full gate  
* Validate rules active  
* Confirm no temporary flags

---

# **4\. Runtime Automation (n8n)**

n8n handles deterministic workflows.

---

# **5\. Engagement Lifecycle Automation (n8n)**

## **Workflow: Engagement Watchdog**

Trigger:

engagement\_created

Steps:

1. Start SLA timer  
2. Wait 24h → check confirmation  
3. Send reminder if needed  
4. Wait additional 12h  
5. Mark SLA breach if no action  
6. Notify user

---

# **6\. Document Privacy Automation**

## **Workflow: Upload Gate**

Trigger:

document\_uploaded

Steps:

1. Store in Raw Vault  
2. Classify document type  
3. Check country policy matrix  
4. Send to Redaction Service  
5. Store sanitized copy  
6. Mark sanitizedReady

---

## **Workflow: AI Gate**

Trigger:

ai\_processing\_requested

Checks:

* sanitizedReady \== true  
* consentFlags.allowAI \== true  
* classification \!= restricted

If fail:

* deny request  
* log reason

---

# **7\. Partner Governance Automation (n8n)**

## **Workflow: Provider SLA Monitor**

Trigger:

sla\_breached

Steps:

1. Increment breach counter  
2. If threshold exceeded:  
   * Send warning  
3. After grace period:  
   * Downgrade provider  
   * Disable primary CTA

---

# **8\. Analytics Automation**

## **Workflow: KPI Aggregation**

Trigger:

daily cron

Steps:

1. Aggregate primary\_clicked  
2. Aggregate provider\_confirmed  
3. Calculate conversion rate  
4. Store metrics snapshot

---

# **9\. Deterministic vs AI Decision Map**

AI allowed for:

* summarization  
* structuring  
* screen generation  
* non-binding risk guidance

AI NOT allowed for:

* SLA timers  
* ranking fee logic  
* downgrade decisions  
* privacy enforcement  
* legal source generation

---

# **10\. Failure Handling Model**

If Antigravity fails:

* Repo remains intact  
* n8n continues runtime

If n8n fails:

* SLA monitoring paused  
* alert admin

---

# **11\. Security Model**

* Magic links are time-bound  
* Tokens stored hashed  
* No provider direct email exposure  
* Audit log for all automation events

---

# **12\. Summary**

CompliHub360’s Agent Army is split across:

Antigravity → Design-time governance \+ code integrity

n8n → Runtime enforcement \+ deterministic automation

This separation ensures:

* scalability  
* compliance reliability  
* minimal hallucination risk  
* controlled revenue funnel protection

---

(End of Agent Army Flow Definition)