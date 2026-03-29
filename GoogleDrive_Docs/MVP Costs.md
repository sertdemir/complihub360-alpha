### **1\. The Compliance Logic (Expert)**

From a regulatory and operational perspective, it is vital to enforce **Usage Quotas**. This not only protects our margins but also serves as a security layer against automated scrapers or "prompt injection" attacks that could inflate our token usage without generating engagements. In the EU-AI-Act context, maintaining a clear log of who triggered which AI process is a core part of our auditability guarantee.

### **2\. The MVP Requirement (Strategist)**

We will use **Supabase Edge Functions** as the primary gatekeeper for the Experience Layer and **n8n Error Handling**as the safety net for the Automation Layer.

* **Hard Gating:** Anonymous users (Guests) are capped at a low number of searches and document uploads.  
* **Revenue Protection:** AI processing for document summaries is only triggered *after* the user confirms their intent through the wizard, ensuring we only spend tokens on high-intent leads.

---

### **3\. Technical Implementation: API Limits & Policies**

#### **A. Supabase Edge Function: gatekeeper-policy**

This function sits in front of all AI-heavy requests. It checks the user's tier and current usage before forwarding the request to Gemini or Claude.

* **Guest Tier:** 3 searches/day, 0 document uploads.  
* **Registered Tier:** 10 searches/day, 5 document uploads.  
* **Partner Tier:** Unlimited (API access for engagement replies).

#### **B. n8n Error & Cost Handling Policy**

For the **Privacy Pipeline** and **SLA Watchdog**, we implement deterministic retry and timeout policies to prevent infinite loops in Railway.

* **Document Anonymization:** If PII detection fails or exceeds 30 seconds, the workflow self-terminates and alerts the user, rather than retrying indefinitely.  
* **SLA Watchdog:** Timeouts are set to trigger specific "Escalation" events rather than remaining active in memory for weeks.

---

### **4\. Builder Prompt (Developer)**

Use this prompt in your editor (or Bolt.new) to generate the governance logic for your backend:

Markdown

Build a Supabase Edge Function named 'governance-gate' and a corresponding n8n error-handler blueprint:

1\. The Edge Function must:

* Connect to the 'user\_usage' table to track 'ai\_tokens\_estimate' and 'request\_count'.  
* Implement a switch/case logic for 'GUEST' vs 'REGISTERED' roles.  
* Return a '429 Too Many Requests' if limits are reached, including a 'retry-after' header.  
* Log every denied request in a 'security\_audit' table for threat analysis.

2\. The n8n Blueprint must:

* Include an 'Error Trigger' node that catches failures in the Privacy Pipeline.  
* Automatically notify the 'Admin-Alert' webhook if a document redaction process fails 3 times.  
* Implement a 'Cost-Control' node that calculates the token length of a document and kills the process if it exceeds a 50,000 token limit (to avoid massive Gemini/Claude bills).

3\. Use TypeScript for the Edge Function and ensure all database calls utilize the Supabase Service Role Key for secure bypass of RLS where necessary.